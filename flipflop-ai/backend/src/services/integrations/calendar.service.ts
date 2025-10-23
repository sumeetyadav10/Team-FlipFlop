import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export class CalendarService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Google Calendar OAuth flow
   */
  async getAuthUrl(teamId: string, userId: string): Promise<string> {
    const state = Buffer.from(JSON.stringify({ teamId, userId })).toString('base64');
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.API_URL}/api/integrations/calendar/callback`,
      response_type: 'code',
      scope: scopes,
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string): Promise<any> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.API_URL}/api/integrations/calendar/callback`,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new AppError('Calendar OAuth failed', 400, data);
      }

      return {
        access_token: (data as any).access_token,
        refresh_token: (data as any).refresh_token,
        expires_in: (data as any).expires_in,
        scope: (data as any).scope,
      };
    } catch (error) {
      logger.error('Calendar OAuth error:', error);
      throw error;
    }
  }

  /**
   * Store calendar integration
   */
  async storeIntegration(teamId: string, credentials: any): Promise<any> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('integrations')
        .insert({
          team_id: teamId,
          type: 'calendar',
          credentials,
          status: 'active',
          settings: {
            syncMeetings: true,
            syncEvents: true,
            lookAheadDays: 7,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Calendar integration storage error:', error);
      throw error;
    }
  }

  /**
   * Sync calendar events
   */
  async syncCalendarEvents(teamId: string, integrationId: string): Promise<void> {
    try {
      // Get integration credentials
      const { data: integration } = await (this.supabase as any)
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('team_id', teamId)
        .single();

      if (!integration) {
        throw new AppError('Calendar integration not found', 404);
      }

      const credentials = (integration as any).credentials;
      
      // Get calendar events from Google Calendar API
      const events = await this.fetchCalendarEvents(credentials.access_token);
      
      // Process and store events as memories
      for (const event of events) {
        await this.processCalendarEvent(teamId, event);
      }

      // Update last sync timestamp
      await (this.supabase as any)
        .from('integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', integrationId);

      logger.info(`Calendar sync completed for team ${teamId}`);
    } catch (error) {
      logger.error('Calendar sync error:', error);
      throw error;
    }
  }

  /**
   * Fetch events from Google Calendar
   */
  private async fetchCalendarEvents(accessToken: string): Promise<any[]> {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const params = new URLSearchParams({
        timeMin: weekAgo.toISOString(),
        timeMax: now.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new AppError('Failed to fetch calendar events', response.status, data);
      }

      return (data as any).items || [];
    } catch (error) {
      logger.error('Calendar API error:', error);
      throw error;
    }
  }

  /**
   * Process calendar event into memory
   */
  private async processCalendarEvent(teamId: string, event: any): Promise<void> {
    try {
      // Skip events without meaningful content
      if (!event.summary || event.status === 'cancelled') {
        return;
      }

      const content = this.extractEventContent(event);
      if (!content) return;

      // Import memory service
      const { MemoryService } = await import('../memory.js');
      const memoryService = new MemoryService();

      await memoryService.createMemory({
        teamId,
        content,
        type: 'meeting',
        source: 'calendar',
        sourceId: event.id,
        sourceUrl: event.htmlLink,
        timestamp: new Date(event.start?.dateTime || event.start?.date),
        metadata: {
          eventId: event.id,
          summary: event.summary,
          location: event.location,
          attendees: event.attendees?.map((a: any) => a.email) || [],
          duration: this.calculateDuration(event.start, event.end),
        },
      });
    } catch (error) {
      logger.error(`Failed to process calendar event ${event.id}:`, error);
    }
  }

  /**
   * Extract meaningful content from calendar event
   */
  private extractEventContent(event: any): string | null {
    let content = event.summary || '';
    
    if (event.description) {
      content += `\n\n${event.description}`;
    }

    if (event.location) {
      content += `\n\nLocation: ${event.location}`;
    }

    if (event.attendees && event.attendees.length > 0) {
      const attendeeList = event.attendees
        .map((a: any) => a.email)
        .join(', ');
      content += `\n\nAttendees: ${attendeeList}`;
    }

    return content.trim().length > 10 ? content.trim() : null;
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<any> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('memories')
        .select('id, type, created_at')
        .eq('team_id', teamId)
        .eq('source', 'calendar');

      if (error) throw error;

      const stats = {
        totalMemories: data?.length || 0,
        meetings: 0,
        events: 0,
        lastSync: null,
      };

      data?.forEach((memory: any) => {
        if (memory.type === 'meeting') {
          stats.meetings++;
        } else {
          stats.events++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Calendar stats error:', error);
      return { totalMemories: 0, meetings: 0, events: 0 };
    }
  }

  /**
   * Search calendar memories
   */
  async searchMemories(teamId: string, query: string, filters: any = {}): Promise<any[]> {
    try {
      let supabaseQuery = (this.supabase as any)
        .from('memories')
        .select('*')
        .eq('team_id', teamId)
        .eq('source', 'calendar')
        .ilike('content', `%${query}%`);

      if (filters.dateFrom) {
        supabaseQuery = supabaseQuery.gte('timestamp', filters.dateFrom);
      }

      if (filters.dateTo) {
        supabaseQuery = supabaseQuery.lte('timestamp', filters.dateTo);
      }

      if (filters.attendee) {
        supabaseQuery = supabaseQuery.contains('metadata', { attendees: [filters.attendee] });
      }

      const { data, error } = await supabaseQuery.order('timestamp', { ascending: false }).limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Calendar search error:', error);
      return [];
    }
  }

  /**
   * Calculate event duration in minutes
   */
  private calculateDuration(start: any, end: any): number {
    try {
      const startTime = new Date(start?.dateTime || start?.date);
      const endTime = new Date(end?.dateTime || end?.date);
      return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    } catch {
      return 0;
    }
  }
}