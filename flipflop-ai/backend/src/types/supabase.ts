export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          user_id: string
          team_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          team_id: string
          type: 'slack' | 'notion' | 'gmail' | 'github' | 'teams' | 'calendar'
          credentials: Json
          settings: Json
          last_sync: string | null
          status: 'active' | 'paused' | 'error' | 'disconnected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          type: 'slack' | 'notion' | 'gmail' | 'github' | 'teams' | 'calendar'
          credentials?: Json
          settings?: Json
          last_sync?: string | null
          status?: 'active' | 'paused' | 'error' | 'disconnected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          type?: 'slack' | 'notion' | 'gmail' | 'github' | 'teams' | 'calendar'
          credentials?: Json
          settings?: Json
          last_sync?: string | null
          status?: 'active' | 'paused' | 'error' | 'disconnected'
          created_at?: string
          updated_at?: string
        }
      }
      memories: {
        Row: {
          id: string
          team_id: string
          content: string
          content_vector: string | null
          type: 'decision' | 'action_item' | 'discussion' | 'document' | 'meeting' | 'other'
          source: string
          source_id: string | null
          source_url: string | null
          author: Json | null
          participants: Json | null
          timestamp: string
          metadata: Json | null
          images: Json
          attachments: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          content: string
          content_vector?: string | null
          type: 'decision' | 'action_item' | 'discussion' | 'document' | 'meeting' | 'other'
          source: string
          source_id?: string | null
          source_url?: string | null
          author?: Json | null
          participants?: Json | null
          timestamp: string
          metadata?: Json | null
          images?: Json
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          content?: string
          content_vector?: string | null
          type?: 'decision' | 'action_item' | 'discussion' | 'document' | 'meeting' | 'other'
          source?: string
          source_id?: string | null
          source_url?: string | null
          author?: Json | null
          participants?: Json | null
          timestamp?: string
          metadata?: Json | null
          images?: Json
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
      }
      queries: {
        Row: {
          id: string
          user_id: string
          team_id: string
          question: string
          answer: string
          sources: Json
          context: Json | null
          feedback: 'helpful' | 'not_helpful' | 'incorrect' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id: string
          question: string
          answer: string
          sources?: Json
          context?: Json | null
          feedback?: 'helpful' | 'not_helpful' | 'incorrect' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string
          question?: string
          answer?: string
          sources?: Json
          context?: Json | null
          feedback?: 'helpful' | 'not_helpful' | 'incorrect' | null
          created_at?: string
        }
      }
      extension_sessions: {
        Row: {
          id: string
          user_id: string
          token: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          created_at?: string
          expires_at?: string
        }
      }
      screenshots: {
        Row: {
          id: string
          team_id: string
          memory_id: string | null
          user_id: string
          filename: string
          size_bytes: number | null
          mime_type: string
          width: number | null
          height: number | null
          storage_path: string | null
          base64_data: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          memory_id?: string | null
          user_id: string
          filename: string
          size_bytes?: number | null
          mime_type?: string
          width?: number | null
          height?: number | null
          storage_path?: string | null
          base64_data?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          memory_id?: string | null
          user_id?: string
          filename?: string
          size_bytes?: number | null
          mime_type?: string
          width?: number | null
          height?: number | null
          storage_path?: string | null
          base64_data?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      team_role: 'owner' | 'admin' | 'member' | 'viewer'
      integration_type: 'slack' | 'notion' | 'gmail' | 'github' | 'teams' | 'calendar'
      integration_status: 'active' | 'paused' | 'error' | 'disconnected'
      memory_type: 'decision' | 'action_item' | 'discussion' | 'document' | 'meeting' | 'other'
      query_feedback: 'helpful' | 'not_helpful' | 'incorrect'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}