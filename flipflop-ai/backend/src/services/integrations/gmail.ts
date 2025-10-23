import { google } from 'googleapis';
import { supabaseAdmin } from '../supabase.js';
import { logger } from '../../index.js';
import memoryService from '../memory.js';

class GmailService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.API_URL}/api/integrations/gmail/callback`
    );
  }

  getAuthUrl(teamId: string, userId: string): string {
    const state = Buffer.from(JSON.stringify({ teamId, userId })).toString('base64');
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.labels',
      ],
      state,
    });
  }

  async handleCallback(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    };
  }

  async syncEmails(teamId: string): Promise<void> {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('team_id', teamId)
        .eq('type', 'gmail')
        .eq('status', 'active')
        .single();

      if (!integration) {
        throw new Error('No active Gmail integration found');
      }

      // Set credentials
      this.oauth2Client.setCredentials(integration.credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get emails from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const query = `after:${Math.floor(yesterday.getTime() / 1000)}`;

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50,
      });

      if (!response.data.messages) {
        logger.info('No new emails to sync');
        return;
      }

      for (const message of response.data.messages) {
        try {
          const email = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
          });

          if (!email.data) continue;

          const parsed = this.parseEmail(email.data);
          
          // Only save emails that might contain decisions or important info
          if (this.isImportantEmail(parsed)) {
            await memoryService.createMemory({
              teamId,
              content: `Subject: ${parsed.subject}\n\nFrom: ${parsed.from}\n\n${parsed.body}`,
              type: 'discussion',
              source: 'gmail',
              sourceId: message.id!,
              sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
              author: {
                email: parsed.from,
                name: parsed.fromName,
              },
              timestamp: new Date(parsed.date),
              metadata: {
                threadId: message.threadId,
                labels: parsed.labels,
                hasAttachments: parsed.hasAttachments,
              },
            });
          }
        } catch (error) {
          logger.error(`Failed to process email ${message.id}:`, error);
        }
      }

      logger.info(`Gmail sync completed for team ${teamId}`);
    } catch (error) {
      logger.error('Gmail sync error:', error);
      throw error;
    }
  }

  private parseEmail(email: any): any {
    const headers = email.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name === name)?.value || '';

    const result = {
      subject: getHeader('Subject'),
      from: getHeader('From'),
      fromName: '',
      to: getHeader('To'),
      date: getHeader('Date'),
      labels: email.labelIds || [],
      body: '',
      hasAttachments: false,
    };

    // Extract sender name
    const fromMatch = result.from.match(/^(.*?)\s*<(.+)>$/);
    if (fromMatch) {
      result.fromName = fromMatch[1].replace(/"/g, '');
      result.from = fromMatch[2];
    }

    // Extract body
    result.body = this.extractBody(email.payload);
    
    // Check for attachments
    result.hasAttachments = this.hasAttachments(email.payload);

    return result;
  }

  private extractBody(payload: any): string {
    if (!payload) return '';

    // For single part messages
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // For multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return '';
  }

  private hasAttachments(payload: any): boolean {
    if (!payload?.parts) return false;
    
    return payload.parts.some((part: any) => 
      part.filename && part.filename.length > 0
    );
  }

  private isImportantEmail(email: any): boolean {
    const importantKeywords = [
      'decision', 'decided', 'approved', 'confirmed',
      'action item', 'todo', 'deadline', 'milestone',
      'proposal', 'recommendation', 'update', 'summary',
    ];

    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    return importantKeywords.some(keyword => content.includes(keyword));
  }
}

export default new GmailService();