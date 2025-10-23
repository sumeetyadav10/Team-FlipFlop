import { createClient } from '@supabase/supabase-js';
// Note: Cannot import logger here due to circular dependency

// Simple, working types that bypass the complex Database interface
export interface SupabaseRecord {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

export interface SupabaseInsert {
  [key: string]: any;
}

export interface SupabaseUpdate {
  [key: string]: any;
}

// Real Supabase client
let supabaseAdmin: any;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  console.log('🔗 Connecting to real Supabase database');
  
  supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
} else {
  console.warn('🚧 Running in DEVELOPMENT MODE without real Supabase connection');
  
  // Mock Supabase client for development
  supabaseAdmin = {
    from: (_table: string) => ({
      select: (_columns?: string) => ({
        eq: (_column: string, _value: any) => ({
          single: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }),
          limit: (_count: number) => Promise.resolve({ data: [], error: null })
        }),
        order: (_column: string, _options?: any) => Promise.resolve({ data: [], error: null }),
        limit: (_count: number) => Promise.resolve({ data: [], error: null })
      }),
      insert: (_values: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-id', ..._values }, error: null })
        })
      }),
      update: (_values: any) => ({
        eq: (_column: string, _value: any) => Promise.resolve({ data: [{ id: 'mock-id', ..._values }], error: null })
      }),
      delete: () => ({
        eq: (_column: string, _value: any) => Promise.resolve({ data: [], error: null })
      })
    }),
    auth: {
      admin: {
        getUserByEmail: (_email: string) => Promise.resolve({ data: { user: null }, error: null }),
        listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
        createUser: (_userData: any) => Promise.resolve({ 
          data: { user: { id: 'mock-user-id', ..._userData } }, 
          error: null 
        }),
        deleteUser: (_userId: string) => Promise.resolve({ data: {}, error: null }),
        signOut: (_token: string) => Promise.resolve({ error: null })
      },
      signInWithPassword: (_credentials: any) => Promise.resolve({ 
        data: { session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }, user: { id: 'mock-user', email: _credentials.email } }, 
        error: null 
      }),
      refreshSession: (_refresh: any) => Promise.resolve({
        data: { session: { access_token: 'mock-token', refresh_token: 'mock-refresh' } },
        error: null
      }),
      getUser: (_token: string) => Promise.resolve({
        data: { user: { id: 'mock-user', email: 'test@example.com' } },
        error: null
      })
    },
    storage: {
      from: (_bucket: string) => ({
        upload: (_path: string, _file: any, _options?: any) => Promise.resolve({ data: { path: _path }, error: null }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: `mock://storage/${_path}` } }),
        remove: (_paths: string[]) => Promise.resolve({ data: [], error: null })
      })
    }
  };
}

// Create a Supabase client for a specific user session
export const createUserClient = (accessToken: string) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return supabaseAdmin; // Return mock client in dev mode
  }
  
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
};

export { supabaseAdmin };

// Type exports for convenience (simplified)
export type Profiles = SupabaseRecord & {
  email: string;
  name?: string;
  avatar_url?: string;
};

export type Teams = SupabaseRecord & {
  name: string;
  slug: string;
  settings: any;
};

export type TeamMembers = SupabaseRecord & {
  user_id: string;
  team_id: string;
  role: string;
  joined_at: string;
};

export type Integrations = SupabaseRecord & {
  team_id: string;
  type: string;
  credentials: any;
  settings: any;
  last_sync?: string;
  status: string;
};

export type Memories = SupabaseRecord & {
  team_id: string;
  content: string;
  type: string;
  source: string;
  source_id?: string;
  source_url?: string;
  author?: any;
  participants?: any;
  timestamp: string;
  metadata?: any;
  images?: any;
  attachments?: any;
};

export type Queries = SupabaseRecord & {
  user_id: string;
  team_id: string;
  question: string;
  answer: string;
  sources?: any;
  context?: any;
  feedback?: string;
};

export type ExtensionSessions = SupabaseRecord & {
  user_id: string;
  token: string;
  expires_at: string;
};

export type Screenshots = SupabaseRecord & {
  team_id: string;
  memory_id?: string;
  user_id: string;
  filename: string;
  size_bytes?: number;
  mime_type: string;
  width?: number;
  height?: number;
  storage_path?: string;
  base64_data?: string;
  metadata: any;
};