// Real-time hooks for Supabase integration
import { useEffect, useState } from 'react';
import { supabase, supabaseHelpers } from '../config/supabase';
import { Message } from '../types';

// Hook for real-time message updates
export const useRealtimeMessages = (teamId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any = null;

    const fetchInitialMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseHelpers.getTeamQueries(teamId);
        
        if (error) {
          throw error;
        }
        
        const formattedMessages: Message[] = [];
        
        (data || []).forEach((query: any) => {
          // Add user question as a message
          formattedMessages.push({
            id: `${query.id}-question`,
            type: 'user',
            content: query.question,
            timestamp: new Date(query.created_at),
          });
          
          // Add assistant answer as a message
          formattedMessages.push({
            id: `${query.id}-answer`,
            type: 'assistant',
            content: query.answer,
            timestamp: new Date(query.created_at),
            sources: query.sources || [],
            suggestions: [], // Extract from context if needed
          });
        });
        
        setMessages(formattedMessages.reverse()); // Show oldest first
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch initial queries:', err);
        setError(err.message);
        setMessages([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = () => {
      subscription = supabaseHelpers.subscribeToQueries(teamId, (payload: any) => {
        console.log('Real-time query received:', payload);
        
        if (payload.new) {
          const query = payload.new;
          const newMessages: Message[] = [
            {
              id: `${query.id}-question`,
              type: 'user',
              content: query.question,
              timestamp: new Date(query.created_at),
            },
            {
              id: `${query.id}-answer`,
              type: 'assistant',
              content: query.answer,
              timestamp: new Date(query.created_at),
              sources: query.sources || [],
              suggestions: [],
            }
          ];
          
          setMessages(prev => [...prev, ...newMessages]);
        }
      });
    };

    // Only setup real-time if we have a valid teamId
    if (teamId) {
      fetchInitialMessages();
      setupRealtimeSubscription();
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [teamId]);

  return { messages, loading, error, setMessages };
};

// Hook for authentication state
export const useSupabaseAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const currentSession = await supabaseHelpers.getCurrentSession();
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseHelpers.onAuthStateChange((event: any, session: any) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    loading,
    signIn: supabaseHelpers.signIn,
    signUp: supabaseHelpers.signUp,
    signOut: supabaseHelpers.signOut,
    resetPassword: supabaseHelpers.resetPassword,
  };
};

// Hook for team presence (who's online)
export const useTeamPresence = (teamId: string) => {
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase.channel(`team-${teamId}-presence`);
    
    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const members = Object.keys(state);
        setOnlineMembers(members);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: any, newPresences: any }) => {
        console.log('Member joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: any, leftPresences: any }) => {
        console.log('Member left:', key, leftPresences);
      })
      .subscribe(async (status: any) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await channel.track({
            user_id: 'current_user', // Replace with actual user ID
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [teamId]);

  return { onlineMembers };
};