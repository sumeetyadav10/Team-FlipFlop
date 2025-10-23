import { create } from 'zustand';
import { Message, Source, QueryContext } from '../types';
import { apiClient } from '../api/client';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  currentQuery: string;
  suggestions: string[];
  currentTeamId: string | null;
  conversationId: string | null;
  
  // Actions
  sendMessage: (text: string, teamId: string) => Promise<void>;
  setCurrentQuery: (query: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  loadMoreMessages: (teamId: string) => Promise<void>;
  setCurrentTeam: (teamId: string) => void;
  provideFeedback: (messageId: string, feedback: { type: 'thumbs_up' | 'thumbs_down'; comment?: string }) => Promise<void>;
}

// Mock data for demonstration
const mockSources: Source[] = [
  {
    id: 'src1',
    type: 'slack',
    title: 'Engineering Channel Discussion',
    content: '@sarah: After comparing all options, I think Stripe is our best bet for payment processing. The API is well-documented and developer-friendly.',
    url: 'https://slack.com/channels/engineering',
    timestamp: new Date('2024-01-15T14:30:00'),
    author: 'Sarah Johnson',
    channel: '#engineering',
  },
  {
    id: 'src2',
    type: 'notion',
    title: 'Payment Gateway Decision Log',
    content: 'Payment Gateway Decision:\n• Selected: Stripe\n• Reasons: Developer-friendly API, excellent documentation, robust security\n• Alternatives considered: PayPal, Square',
    url: 'https://notion.so/payment-gateway-decision',
    timestamp: new Date('2024-01-15T15:45:00'),
    author: 'Sarah Johnson',
  },
  {
    id: 'src3',
    type: 'email',
    title: 'Re: Payment Integration Timeline',
    content: 'Hi team, following up on our discussion about payment integration. Stripe integration should take approximately 2-3 weeks including testing.',
    timestamp: new Date('2024-01-15T16:20:00'),
    author: 'Mike Chen',
  },
];

const mockSuggestions = [
  "Show me the full conversation",
  "Who else was involved in this decision?",
  "What were the alternatives considered?",
  "When was this decided?",
  "Find related decisions",
];

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: '1',
      type: 'assistant',
      content: '💭 What can I help you find?',
      timestamp: new Date(),
    },
  ],
  isLoading: false,
  isTyping: false,
  currentQuery: '',
  suggestions: mockSuggestions,
  currentTeamId: null,
  conversationId: null,

  sendMessage: async (text: string, teamId: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };

    // Add user message
    set(state => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      currentQuery: '',
    }));

    // Ensure a conversation ID exists
    let { conversationId } = get();
    if (!conversationId) {
      conversationId = `conv_${Date.now()}`;
      set({ conversationId });
    }

    try {
      const response = await apiClient.query({
        question: text,
        teamId,
        context: {
          teamId,
          conversationId,
        },
      });

      const assistantMessage: Message = {
        id: response.messageId,
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        suggestions: response.suggestions,
      };

      set(state => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };

      set(state => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
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
      timestamp: new Date(),
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
          type: 'assistant',
          content: '💭 What can I help you find?',
          timestamp: new Date(),
        },
      ],
      currentQuery: '',
      conversationId: null,
    });
  },

  loadMoreMessages: async (teamId: string) => {
    set({ isLoading: true });
    
    try {
      const olderMessages = await apiClient.getRecentQueries(teamId, 10);
      
      set(state => {
        // Merge and de-duplicate by message id while preserving order
        const merged = [...olderMessages, ...state.messages];
        const seen = new Set<string>();
        const deduped = merged.filter(m => {
          const key = m.id ?? `${m.type}-${m.timestamp?.toString()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return {
          messages: deduped,
          isLoading: false,
        };
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  setCurrentTeam: (teamId: string) => {
    set({ currentTeamId: teamId });
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