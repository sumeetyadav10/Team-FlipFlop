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
    const { sessionToken, selectedTeamId } = await this.getStorageData();
    if (!sessionToken || !selectedTeamId) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.apiUrl}/extension/meet/transcription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': this.extensionKey,
        'X-Session-Token': sessionToken,
        'X-Team-ID': selectedTeamId,
      },
      body: JSON.stringify({ meetingId, chunk }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
  }

  async endMeeting(meetingId: string, summary?: string, decisions?: string[], actionItems?: string[]): Promise<void> {
    const { sessionToken, selectedTeamId } = await this.getStorageData();
    if (!sessionToken || !selectedTeamId) {
      throw new Error('Not authenticated');
    }

    await fetch(`${this.apiUrl}/extension/meet/end`, {
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