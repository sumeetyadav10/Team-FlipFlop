export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  teams: Team[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  settings: TeamSettings;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  avatar?: string;
}

export interface TeamSettings {
  notifications: boolean;
  shareMode: 'private' | 'team' | 'public';
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  suggestions?: string[];
  isLoading?: boolean;
}

export interface Source {
  id: string;
  type: 'slack' | 'notion' | 'email' | 'document';
  title: string;
  content: string;
  url?: string;
  timestamp: Date;
  author: string;
  channel?: string;
}

export interface QueryContext {
  teamId: string;
  conversationId?: string;
  timeframe?: {
    start: Date;
    end: Date;
  };
  sources?: string[];
  authors?: string[];
}

export interface Feedback {
  type: 'thumbs_up' | 'thumbs_down';
  comment?: string;
}

export interface CachedQuery {
  id: string;
  question: string;
  answer: string;
  sources: Source[];
  timestamp: Date;
  teamId: string;
}

export interface PendingQuery {
  id: string;
  question: string;
  context?: QueryContext;
  timestamp: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Chat: undefined;
  Search: undefined;
  Profile: undefined;
};

export type ChatStackParamList = {
  ChatScreen: undefined;
  SourceDetail: { sourceId: string };
};