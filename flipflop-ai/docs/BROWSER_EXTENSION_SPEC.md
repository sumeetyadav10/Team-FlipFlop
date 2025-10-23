# Browser Extension Specification

## Overview
A minimal Chrome/Edge extension focused primarily on Google Meet transcription with additional quick capture capabilities for any webpage.

## Tech Stack
- **Language**: TypeScript
- **Build Tool**: Webpack 5
- **Framework**: Vanilla JS (lightweight)
- **UI Library**: Preact (for popup only)
- **Styling**: Tailwind CSS
- **API**: Chrome Extension Manifest V3
- **Speech Recognition**: Web Speech API
- **State Management**: Chrome Storage API

## Core Features

### 1. Google Meet Transcription (Primary)
- Real-time speech-to-text during meetings
- Speaker identification and labeling
- Decision and action item detection
- Automatic meeting summary
- One-click save to team memory

### 2. Universal Quick Capture
- Floating action button on all pages
- Screenshot with annotation
- Text selection capture
- Page metadata extraction
- Quick notes with context

### 3. Extension Popup
- Connection status
- Recent captures
- Quick settings
- Team switcher

## User Experience Flow

### First Time Setup
1. User installs extension from Chrome Web Store
2. Clicks extension icon → Opens onboarding
3. Enters API key or logs in via OAuth
4. Selects team to connect to
5. Grants necessary permissions
6. Ready to use!

### Google Meet Flow
1. User joins Google Meet
2. Extension detects Meet URL
3. Shows unobtrusive "Start Recording" button
4. User clicks to begin transcription
5. Real-time transcript appears in sidebar
6. Highlights decisions and action items
7. End of meeting → Shows summary
8. One-click to save to team memory

### Quick Capture Flow
1. User browses any webpage
2. Sees floating capture button (bottom-right)
3. Clicks button → Opens capture menu
4. Options: Screenshot, Selection, Full Page
5. Add quick note (optional)
6. Saves to team memory with context

## Technical Architecture

### File Structure
```
/extension
  /src
    /background
      service-worker.ts      # Main background script
      api-client.ts         # Backend communication
      auth-manager.ts       # Authentication handling
    /content-scripts
      /google-meet
        injector.ts         # Injects UI into Meet
        transcriber.ts      # Speech recognition
        ui-components.ts    # Meet overlay UI
        decision-detector.ts # NLP for decisions
      /universal
        capture-button.ts   # Floating button
        screenshot.ts       # Screenshot logic
    /popup
      App.tsx              # Popup main component
      components/          # UI components
    /options
      options.html         # Settings page
      options.ts          
    /shared
      types.ts            # TypeScript definitions
      utils.ts            # Shared utilities
      constants.ts        # Config constants
    /styles
      tailwind.css        # Tailwind styles
      meet-overlay.css    # Meet-specific styles
  /public
    manifest.json         # Extension manifest
    icons/               # Extension icons
  webpack.config.js      # Build configuration
```

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "name": "FlipFlop Memory",
  "version": "1.0.0",
  "description": "Your team's AI memory layer",
  
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://meet.google.com/*"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://meet.google.com/*"],
      "js": ["content-meet.js"],
      "css": ["meet-overlay.css"]
    },
    {
      "matches": ["<all_urls>"],
      "js": ["content-universal.js"],
      "css": ["capture-button.css"]
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  
  "options_page": "options.html",
  
  "web_accessible_resources": [
    {
      "resources": ["inject-meet.js"],
      "matches": ["https://meet.google.com/*"]
    }
  ]
}
```

## Google Meet Integration Details

### UI Overlay
```
┌─────────────────────────────────────────┐
│  Google Meet Window                     │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │    Video Conference Area          │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ FlipFlop    │  │ Live Transcript │  │
│  │ [Recording] │  │                 │  │
│  └─────────────┘  │ John: Let's use │  │
│                   │ Stripe for...   │  │
│                   │                 │  │
│                   │ ⚡ Decision     │  │
│                   │ detected       │  │
│                   └─────────────────┘  │
└─────────────────────────────────────────┘
```

### Transcription Features
- Real-time speech-to-text
- Speaker diarization (who said what)
- Punctuation and formatting
- Language detection
- Noise cancellation

### Decision Detection
Keywords and patterns:
- "We decided to..."
- "Let's go with..."
- "The conclusion is..."
- "Action item:"
- "TODO:"
- "@person will..."

## Extension Popup Design

### Main View
```
┌─────────────────────────┐
│  FlipFlop Memory        │
├─────────────────────────┤
│  ✅ Connected           │
│  Team: Engineering      │
├─────────────────────────┤
│  Recent Captures:       │
│                         │
│  📝 Meeting Notes       │
│  🚀 Stripe Decision     │
│  📧 Email Summary       │
├─────────────────────────┤
│  [Settings] [Sign Out]  │
└─────────────────────────┘
```

## API Communication

### Authentication
```typescript
// Initial setup
const auth = await chrome.storage.sync.get(['apiKey', 'teamId']);
if (!auth.apiKey) {
  // Redirect to login
}

// API calls
const headers = {
  'Authorization': `Bearer ${auth.apiKey}`,
  'X-Team-ID': auth.teamId
};
```

### Data Sync
```typescript
// Send transcription chunk
async function sendTranscript(chunk: TranscriptChunk) {
  await fetch(`${API_URL}/extension/meet/transcription`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      meetingId: getCurrentMeetingId(),
      chunk: {
        text: chunk.text,
        speaker: chunk.speaker,
        timestamp: chunk.timestamp,
        confidence: chunk.confidence
      }
    })
  });
}
```

## Security & Privacy

### Permissions
- Minimal permissions requested
- Host permissions only for Google Meet
- No broad access to user data

### Data Handling
- Transcripts encrypted before sending
- No local storage of sensitive data
- Clear data on logout
- Respect Do Not Track

### Security Measures
- Content Security Policy
- Input sanitization
- API key rotation support
- Secure communication only

## Performance

### Optimization
- Lazy load features
- Debounce API calls
- Efficient DOM manipulation
- Small bundle size (<500KB)

### Resource Management
- Cleanup on tab close
- Memory leak prevention
- Throttled transcription
- Background script hibernation

## Settings Page

### User Preferences
- Enable/disable features
- Transcription language
- Capture shortcut keys
- Notification preferences
- Data retention settings

### Team Settings
- Switch teams
- View team members
- Integration status
- Usage statistics

## Installation & Distribution

### Chrome Web Store
- Public listing
- Regular updates
- User reviews
- 5-step easy setup

### Enterprise Deployment
- Unlisted extension option
- Group policy support
- Custom branding
- Bulk deployment

## Testing Strategy

### Unit Tests
- Transcription accuracy
- Decision detection logic
- API communication
- State management

### Integration Tests
- Google Meet detection
- Full capture flow
- Backend sync
- Error scenarios

### Manual Testing
- Different Meet layouts
- Various browsers
- Performance testing
- User acceptance

## Future Enhancements

### Phase 2 Features
- Zoom integration
- Microsoft Teams support
- Calendar integration
- Smart notifications

### Advanced Features
- AI-powered highlights
- Custom capture templates
- Collaborative annotations
- Voice commands

## Error Handling

### Common Scenarios
- Network offline
- API errors
- Permission denied
- Meet layout changes

### User Feedback
- Clear error messages
- Retry mechanisms
- Fallback options
- Support contact

## Analytics

### Usage Metrics
- Daily active users
- Transcription minutes
- Capture frequency
- Feature adoption

### Performance Metrics
- Load time
- API response time
- Transcription accuracy
- Error rates