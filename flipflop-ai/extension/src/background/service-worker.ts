import api from '../shared/api';
import { Message, StorageData } from '../shared/types';

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('FlipFlop Extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender) {
  switch (message.type) {
    case 'GET_STATUS':
      const isAuthenticated = await api.verifySession();
      const storage = await api.getStorageData();
      return {
        isAuthenticated,
        user: storage.user,
        selectedTeamId: storage.selectedTeamId,
      };

    case 'AUTH_SUCCESS':
      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'AUTH_UPDATED' });
        }
      });
      break;

    case 'CAPTURE_PAGE':
      // Handle page capture
      if (sender.tab?.id) {
        const screenshot = await captureScreenshot(sender.tab.id);
        await api.captureContent({
          ...message.payload,
          screenshot,
        });
      }
      break;

    case 'VERIFY_SESSION':
      // Verify session for content scripts
      try {
        const authenticated = await api.verifySession();
        return { authenticated };
      } catch (error) {
        console.error('Session verification failed:', error);
        return { authenticated: false };
      }

    case 'SEND_TRANSCRIPT':
      // Send transcript to backend
      try {
        if (!message.chunk || !message.meetingId) {
          throw new Error('Missing chunk or meetingId');
        }
        await api.sendTranscript(message.chunk, message.meetingId);
        return { success: true };
      } catch (error) {
        console.error('Failed to send transcript:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }

    case 'END_MEETING':
      // End meeting and save summary
      try {
        const { meetingId, summary, transcripts } = message;
        if (!meetingId) {
          throw new Error('Missing meetingId');
        }
        
        console.log(`[Background] Ending meeting ${meetingId} with ${transcripts?.length || 0} transcripts`);
        
        // Call the endMeeting API
        await api.endMeeting(
          meetingId,
          summary || 'Meeting ended',
          [], // decisions (empty for now)
          []  // action items (empty for now)
        );
        
        return { success: true };
      } catch (error) {
        console.error('Failed to end meeting:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
  }
}

async function captureScreenshot(tabId: number): Promise<string | undefined> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab();
    return dataUrl;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    return undefined;
  }
}

// Set up alarm for periodic session check
chrome.alarms.create('sessionCheck', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sessionCheck') {
    const isValid = await api.verifySession();
    if (!isValid) {
      // Session expired, update badge
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    }
  }
});

// Update badge based on connection status
async function updateBadge() {
  const isAuthenticated = await api.verifySession();
  if (isAuthenticated) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
}

// Check badge on startup
updateBadge();