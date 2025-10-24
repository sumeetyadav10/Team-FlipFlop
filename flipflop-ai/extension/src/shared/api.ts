import { StorageData, TranscriptChunk, CaptureData } from './types';

class API {
  private apiUrl: string = 'https://flipflop.scanlyf.com/api';
  private extensionKey: string = 'ext_secret_key_123'; // Should match backend

  async getStorageData(): Promise<StorageData> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['sessionToken', 'user', 'teams', 'selectedTeamId', 'apiUrl'], (data) => {
        if (data.apiUrl) {
          this.apiUrl = data.apiUrl;
        }
        resolve(data as StorageData);
      });
    });
  }

  async authenticate(email: string, password: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/extension/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': this.extensionKey,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();

    // Save to storage
    await chrome.storage.sync.set({
      sessionToken: data.sessionToken,
      user: data.user,
      teams: data.teams,
      selectedTeamId: data.teams[0]?.id,
    });

    return data;
  }

  async authenticateWithGoogle(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use Chrome Extension Identity API - no redirect URL needed!
      chrome.identity.getAuthToken(
        {
          interactive: true,
          scopes: ['openid', 'email', 'profile']
        },
        (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!token) {
            reject(new Error('No token received from Google'));
            return;
          }

          // Get user info using the token
          fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          .then(response => response.json())
          .then(googleUser => {
            // Exchange Google user info for our session
            this.exchangeGoogleUser(googleUser, token)
              .then(resolve)
              .catch(reject);
          })
          .catch(reject);
        }
      );
    });
  }

  private async exchangeGoogleUser(googleUser: any, googleToken: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/extension/google-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': this.extensionKey,
      },
      body: JSON.stringify({ 
        googleUser,
        googleToken 
      }),
    });

    if (!response.ok) {
      throw new Error('Google authentication failed');
    }

    const data = await response.json();

    // Save to storage
    await chrome.storage.sync.set({
      sessionToken: data.sessionToken,
      user: data.user,
      teams: data.teams,
      selectedTeamId: data.teams[0]?.id,
    });

    return data;
  }

  async verifySession(): Promise<boolean> {
    const { sessionToken } = await this.getStorageData();
    if (!sessionToken) return false;

    try {
      const response = await fetch(`${this.apiUrl}/extension/session/verify`, {
        headers: {
          'X-Extension-Key': this.extensionKey,
          'X-Session-Token': sessionToken,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async sendTranscript(chunk: TranscriptChunk, meetingId: string): Promise<void> {
    // Direct Supabase save for development - bypassing backend
    try {
      const { selectedTeamId, user } = await this.getStorageData();
      
      if (!selectedTeamId || !user) {
        console.log('[API] Using hardcoded team/user for development');
      }

      const supabaseUrl = 'https://yyirmzmkwfobtczvuwxc.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aXJtem1rd2ZvYnRjenZ1d3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExOTYyNDMsImV4cCI6MjA3Njc3MjI0M30.40MvWUdOMHwBKHbOtbINdhgpKE1_44iC5gvX7dOB22o';
      
      const memoryData = {
        team_id: selectedTeamId || 'c1864b73-1eb5-49c1-bb2a-13ea1066a94b', // fallback team
        user_id: user?.id || 'c1864b73-1eb5-49c1-bb2a-13ea1066a94b', // fallback user
        content: chunk.text,
        type: 'meeting',
        source: 'google_meet',
        metadata: {
          meetingId,
          timestamp: chunk.timestamp,
          speaker: chunk.speaker || 'Speaker'
        },
        created_at: new Date().toISOString()
      };

      console.log('[API] Saving directly to Supabase:', memoryData);

      const response = await fetch(`${supabaseUrl}/rest/v1/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(memoryData)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[API] Supabase error:', error);
        throw new Error(`Supabase Error: ${response.status} - ${error}`);
      }

      console.log('[API] ✅ Saved directly to Supabase!');
    } catch (error) {
      console.error('[API] Direct Supabase save failed:', error);
      throw error;
    }
  }

  async endMeeting(meetingId: string, summary?: string, decisions?: string[], actionItems?: string[]): Promise<void> {
    const { sessionToken, selectedTeamId } = await this.getStorageData();
    console.log('[API] End meeting - storage data:', { sessionToken: !!sessionToken, selectedTeamId });
    
    if (!sessionToken || !selectedTeamId) {
      throw new Error('Not authenticated');
    }

    const url = `${this.apiUrl}/extension/meet/end`;
    console.log('[API] Ending meeting at:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': this.extensionKey,
        'X-Session-Token': sessionToken,
        'X-Team-ID': selectedTeamId,
      },
      body: JSON.stringify({
        meetingId,
        summary,
        decisions,
        actionItems,
      }),
    });

    console.log('[API] End meeting response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
  }

  async captureContent(data: CaptureData): Promise<void> {
    const { sessionToken, selectedTeamId } = await this.getStorageData();
    if (!sessionToken || !selectedTeamId) {
      throw new Error('Not authenticated');
    }

    await fetch(`${this.apiUrl}/extension/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': this.extensionKey,
        'X-Session-Token': sessionToken,
        'X-Team-ID': selectedTeamId,
      },
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    await chrome.storage.sync.clear();
  }
}

export default new API();