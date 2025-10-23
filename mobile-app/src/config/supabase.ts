// Supabase client configuration
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_CONFIG } from './env';

// Create Supabase client
export const supabase = createClient(ENV_CONFIG.SUPABASE.URL, ENV_CONFIG.SUPABASE.ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for Supabase operations
export const supabaseHelpers = {
  // Get current user session
  getCurrentSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign up with email and password
  signUp: async (email: string, password: string, metadata?: object) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Get user profile
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  // Create user profile
  createUserProfile: async (profile: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  }) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    return { data, error };
  },

  // Get user teams
  getUserTeams: async (userId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        joined_at,
        teams (
          id,
          name,
          slug,
          settings,
          created_at
        )
      `)
      .eq('user_id', userId);
    
    return { data, error };
  },

  // Query team queries (your existing queries table)
  getTeamQueries: async (teamId: string, limit: number = 50) => {
    const { data, error } = await supabase
      .from('queries')
      .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  },

  // Insert new query
  insertQuery: async (query: {
    question: string;
    answer: string;
    sources?: any[];
    context?: any;
    team_id: string;
    user_id: string;
  }) => {
    const { data, error } = await supabase
      .from('queries')
      .insert(query)
      .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
      .single();
    
    return { data, error };
  },

  // Get team memories (your existing memories table)
  getTeamMemories: async (teamId: string, limit: number = 50) => {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('team_id', teamId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    return { data, error };
  },

  // Get team information
  getTeamInfo: async (teamId: string) => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          id,
          role,
          joined_at,
          profiles (
            id,
            name,
            email,
            avatar_url
          )
        )
      `)
      .eq('id', teamId)
      .single();
    
    return { data, error };
  },

  // Subscribe to real-time changes for queries
  subscribeToQueries: (teamId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`team-${teamId}-queries`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'queries',
          filter: `team_id=eq.${teamId}`,
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to team memories
  subscribeToMemories: (teamId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`team-${teamId}-memories`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'memories',
          filter: `team_id=eq.${teamId}`,
        },
        callback
      )
      .subscribe();
  },
};