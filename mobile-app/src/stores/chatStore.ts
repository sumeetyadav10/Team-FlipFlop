import { create } from 'zustand';
import { Message, Source } from '../types';
import { apiClient } from '../api/client';

interface ChatState {
  messages: Message[];
  loading: boolean;
  isTyping: boolean;
  currentQuery: string;
  suggestions: string[];
  currentTeamId: string | null;
  conversationId: string | null;
  
  // Actions
  sendMessage: (text: string, teamId: string, userId: string) => Promise<void>;
  fetchMessages: (teamId: string) => Promise<void>;
  setCurrentQuery: (query: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => void;
  clearChat: () => void;
  loadMoreMessages: (teamId: string) => Promise<void>;
  setCurrentTeam: (teamId: string) => void;
  provideFeedback: (messageId: string, feedback: { type: 'thumbs_up' | 'thumbs_down'; comment?: string }) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  isTyping: false,
  currentQuery: '',
  suggestions: [],
  currentTeamId: null,
  conversationId: null,

  fetchMessages: async (teamId) => {
    set({ loading: true });
    try {
      // This is a placeholder. In a real app, you'd fetch messages from your backend.
      // For now, we'll just clear messages and add a welcome message.
      set({
        messages: [
          {
            id: '1',
            user_id: 'system',
            content: 'Welcome to the chat! Ask me anything.',
            created_at: new Date().toISOString(),
            sender_name: 'FlipFlop',
          },
        ],
        loading: false,
        currentTeamId: teamId,
        conversationId: `conv_${teamId}_${Date.now()}` // Start a new conversation context
      });
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      set({ loading: false });
    }
  },

  sendMessage: async (text: string, teamId: string, userId: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      user_id: userId,
      content: text,
      created_at: new Date().toISOString(),
    };

    // Add user message
    set(state => ({
      messages: [...state.messages, userMessage],
      loading: true,
    }));

    // Ensure a conversation ID exists
    let { conversationId } = get();
    if (!conversationId) {
      conversationId = `conv_${teamId}_${Date.now()}`;
      set({ conversationId });
    }

    try {
      const response = await apiClient.query({
        question: text,
        teamId,
        context: {
          teamId,
          conversationId,
          userId,
        },
      });

      const assistantMessage: Message = {
        id: response.messageId,
        user_id: 'assistant',
        content: response.answer,
        created_at: new Date().toISOString(),
        sources: response.sources,
        suggestions: response.suggestions,
        sender_name: 'FlipFlop',
      };

      set(state => ({
        messages: [...state.messages, assistantMessage],
        loading: false,
      }));

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        user_id: 'system',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        created_at: new Date().toISOString(),
        sender_name: 'FlipFlop',
      };

      set(state => ({
        messages: [...state.messages, errorMessage],
        loading: false,
      }));
    }
  },

  setCurrentQuery: (query: string) => {
    set({ currentQuery: query });
  },

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };

    set(state => ({
      messages: [...state.messages, newMessage],
    }));
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: '1',
          user_id: 'system',
          content: 'Welcome back! How can I assist you?',
          created_at: new Date().toISOString(),
          sender_name: 'FlipFlop',
        },
      ],
      currentQuery: '',
      conversationId: null,
    });
  },

  loadMoreMessages: async (teamId: string) => {
    set({ loading: true });
    
    try {
      // In a real app, you would fetch older messages from your backend
      // For now, this is a placeholder.
      console.log(`Loading more messages for team ${teamId}`);
      
      set({ loading: false });

    } catch (error) {
      set({ loading: false });
    }
  },

  setCurrentTeam: (teamId: string) => {
    if (get().currentTeamId !== teamId) {
      get().fetchMessages(teamId);
    }
  },

  provideFeedback: async (messageId: string, feedback: { type: 'thumbs_up' | 'thumbs_down'; comment?: string }) => {
    try {
      await apiClient.provideFeedback(messageId, feedback);
    } catch (error) {
      // Silently handle feedback errors
      console.log('Feedback error:', error);
    }
  },
}));
