export interface User {
  id: string;
  email: string;
}

export interface Team {
  id: string;
  name: string;
  role: string;
}

export interface StorageData {
  sessionToken?: string;
  user?: User;
  teams?: Team[];
  selectedTeamId?: string;
  apiUrl?: string;
}

export interface TranscriptChunk {
  text: string;
  speaker?: string;
  timestamp: number;
  confidence?: number;
}

export interface MeetingData {
  meetingId: string;
  startTime: number;
  participants: string[];
  transcripts: TranscriptChunk[];
}

export interface CaptureData {
  content: string;
  url: string;
  title?: string;
  selection?: string;
  screenshot?: string;
}

export type MessageType = 
  | 'START_TRANSCRIPTION'
  | 'STOP_TRANSCRIPTION'
  | 'TRANSCRIPT_CHUNK'
  | 'CAPTURE_PAGE'
  | 'AUTH_SUCCESS'
  | 'AUTH_ERROR'
  | 'GET_STATUS';

export interface Message {
  type: MessageType;
  payload?: any;
}