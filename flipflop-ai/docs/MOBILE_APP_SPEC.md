# Mobile App Specification

## Overview
A conversational AI mobile app that serves as the primary interface for teams to query their collective memory. Think of it as "ChatGPT for your team's knowledge."

## Tech Stack
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation v6
- **UI Components**: Custom design system
- **Styling**: Styled Components
- **API Client**: Axios with interceptors
- **Local Storage**: AsyncStorage + MMKV
- **Push Notifications**: Expo Notifications
- **Speech**: Expo Speech (TTS) & expo-av (STT)

## Core Features

### 1. Conversational Interface
- Natural language chat interface
- Context-aware conversations
- Voice input/output
- Quick action suggestions
- Message reactions and sharing

### 2. Smart Queries
- Temporal queries ("last week", "yesterday")
- Person-based queries ("what did John say about...")
- Topic clustering
- Source filtering
- Related suggestions

### 3. Team Collaboration
- Team switching
- Shared conversations
- @mentions in queries
- Collaborative bookmarks

### 4. Offline Support
- Recent conversations cached
- Offline queue for queries
- Smart sync on reconnection
- Local search in cached data

## User Interface Design

### App Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Splash    │ --> │    Login    │ --> │    Chat     │
│   Screen    │     │   Screen    │     │   Screen    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           v                    v
                    ┌─────────────┐     ┌─────────────┐
                    │    Team     │     │  Settings   │
                    │  Selector   │     │   Screen    │
                    └─────────────┘     └─────────────┘
```

### Main Chat Screen
```
┌─────────────────────────────────────┐
│  FlipFlop          Engineering  ≡   │
├─────────────────────────────────────┤
│                                     │
│  💭 What can I help you find?      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ What did we decide about    │   │
│  │ the payment gateway?        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Based on Monday's meeting,  │   │
│  │ the team decided to use     │   │
│  │ Stripe for payment          │   │
│  │ processing because...       │   │
│  │                             │   │
│  │ 📎 3 sources               │   │
│  └─────────────────────────────┘   │
│                                     │
│  Suggested: "Show me the email"    │
│                                     │
├─────────────────────────────────────┤
│  [🎤]  Type a question...      [➤] │
└─────────────────────────────────────┘
```

### Source Expansion View
```
┌─────────────────────────────────────┐
│  < Sources                          │
├─────────────────────────────────────┤
│                                     │
│  💬 Slack - Engineering Channel     │
│  Mon, Jan 15 at 2:30 PM            │
│  ┌─────────────────────────────┐   │
│  │ @sarah: After comparing all │   │
│  │ options, I think Stripe is  │   │
│  │ our best bet...            │   │
│  └─────────────────────────────┘   │
│  [View in Slack]                   │
│                                     │
│  📝 Notion - Decision Log          │
│  Mon, Jan 15 at 3:45 PM            │
│  ┌─────────────────────────────┐   │
│  │ Payment Gateway Decision:   │   │
│  │ • Selected: Stripe          │   │
│  │ • Reasons: Developer-friendly│  │
│  └─────────────────────────────┘   │
│  [View in Notion]                  │
│                                     │
└─────────────────────────────────────┘
```

### Voice Input Mode
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         🎤 Listening...             │
│                                     │
│    "What was decided about..."     │
│                                     │
│      ━━━━━━━━━━━━━━━━━━━           │
│                                     │
│         [Cancel]                    │
│                                     │
└─────────────────────────────────────┘
```

## Features Deep Dive

### Natural Language Processing
```typescript
// Example queries and their interpretations
"What did we decide yesterday?"
→ Filter: decisions, timeframe: yesterday

"Show me Sarah's recommendations for databases"
→ Filter: author=Sarah, topic=databases, type=recommendation

"Action items from the sprint planning"
→ Filter: type=action_item, context=sprint planning

"What tools did the team reject?"
→ Filter: sentiment=negative, topic=tools, type=decision
```

### Smart Suggestions
After each response, suggest follow-ups:
- "Show me the full conversation"
- "Who else was involved?"
- "What were the alternatives?"
- "When was this decided?"
- "Find related decisions"

### Notification System
- **Decision Alerts**: New important decisions
- **Mention Alerts**: When queried about
- **Daily Summary**: Key decisions/actions
- **Weekly Digest**: Team activity summary

## App Architecture

### Navigation Structure
```
- AuthNavigator
  - LoginScreen
  - SignupScreen
  - ForgotPasswordScreen

- MainNavigator
  - TabNavigator
    - ChatTab
      - ChatScreen
      - SourceDetailScreen
    - SearchTab
      - SearchScreen
      - FilterScreen
    - ProfileTab
      - ProfileScreen
      - SettingsScreen
      - TeamManagementScreen
```

### State Management
```typescript
// stores/chatStore.ts
interface ChatStore {
  messages: Message[]
  isLoading: boolean
  currentQuery: string
  suggestions: string[]
  
  sendMessage: (text: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  clearChat: () => void
}

// stores/authStore.ts
interface AuthStore {
  user: User | null
  team: Team | null
  token: string | null
  
  login: (credentials) => Promise<void>
  logout: () => void
  switchTeam: (teamId: string) => void
}
```

### API Integration
```typescript
// api/client.ts
class APIClient {
  async query(question: string, context?: QueryContext) {
    return this.post('/mobile/query', {
      question,
      context: {
        teamId: this.teamId,
        ...context
      }
    });
  }
  
  async getRecentQueries() {
    return this.get('/mobile/recent-queries');
  }
  
  async provideFeedback(messageId: string, feedback: Feedback) {
    return this.post(`/mobile/feedback/${messageId}`, feedback);
  }
}
```

## Key Screens

### 1. Login/Onboarding
- Email/password login
- Google OAuth
- Team code entry
- Welcome tutorial

### 2. Chat Screen (Main)
- Message list
- Input bar with voice
- Quick actions
- Pull to refresh

### 3. Search Screen
- Advanced filters
- Date range picker
- Source selection
- Save searches

### 4. Settings
- Account info
- Team management
- Notification preferences
- Data & privacy
- Help & support

### 5. Team Switcher
- List of teams
- Create/join team
- Team settings
- Member list

## Offline Functionality

### Cached Data
```typescript
// Cache recent queries and responses
interface CachedQuery {
  id: string
  question: string
  answer: string
  sources: Source[]
  timestamp: Date
  teamId: string
}

// Offline queue for new queries
interface OfflineQueue {
  queries: PendingQuery[]
  syncOnReconnect: () => Promise<void>
}
```

### Sync Strategy
1. Cache last 50 queries
2. Store team metadata
3. Queue new queries when offline
4. Sync on app foreground
5. Conflict resolution

## Performance Optimization

### App Performance
- Lazy load screens
- Image optimization
- List virtualization
- Debounced search
- Cached responses

### Battery Optimization
- Batch API calls
- Reduce background activity
- Efficient animations
- Smart prefetching

## Security

### Authentication
- Biometric login
- Secure token storage
- Auto-logout on inactivity
- Certificate pinning

### Data Protection
- Encrypted storage
- No sensitive data in logs
- Secure API communication
- Privacy-first design

## Platform Specific

### iOS Features
- 3D Touch shortcuts
- Siri shortcuts
- Widgets
- iCloud backup

### Android Features
- App shortcuts
- Google Assistant
- Widgets
- Auto-backup

## Analytics & Monitoring

### User Analytics
- Query patterns
- Feature usage
- Session duration
- Error tracking

### Performance Monitoring
- App launch time
- Screen load time
- API response time
- Crash reporting

## Release Strategy

### Beta Testing
- TestFlight (iOS)
- Google Play Beta
- Feedback collection
- A/B testing

### App Store Optimization
- Keywords research
- Screenshot design
- Description optimization
- Regular updates

## Future Enhancements

### v2.0 Features
- Multi-language support
- Dark mode
- iPad/tablet optimization
- Watch app
- Desktop sync

### Advanced Features
- AR document viewer
- Live collaboration
- Video summaries
- Custom AI models

## Development Guidelines

### Code Structure
```
/src
  /components
    /common
    /chat
    /search
  /screens
  /navigation
  /stores
  /api
  /utils
  /hooks
  /types
  /assets
```

### Testing Strategy
- Unit tests for logic
- Integration tests for API
- E2E tests with Detox
- Manual testing checklist

### CI/CD Pipeline
- GitHub Actions
- Automated builds
- Beta distribution
- Production release