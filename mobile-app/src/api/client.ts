import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryContext, Message, Source, User, Team, AuthCredentials, LoginResponse } from '../types';

export interface QueryRequest {
  question: string;
  context?: QueryContext;
  teamId: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  suggestions: string[];
  messageId: string;
}

export interface FeedbackRequest {
  type: 'thumbs_up' | 'thumbs_down';
  comment?: string;
}

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private loggedMockRecentQueries: boolean = false;

  constructor() {
    // In a real app, this would be your backend URL
    this.baseURL = 'https://api.flipflop.example.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('@flipflop_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear auth data
          await AsyncStorage.multiRemove([
            '@flipflop_token',
            '@flipflop_user',
            '@flipflop_team',
          ]);
          // You might want to redirect to login here
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication APIs
  async login(credentials: AuthCredentials): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.client.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      // For demo purposes, return mock data
      console.log('Using mock login data');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      
      return {
        user: {
          id: '1',
          email: credentials.email,
          name: 'John Doe',
          avatar: undefined,
          teams: [
            {
              id: 'team1',
              name: 'Engineering Team',
              description: 'Main development team',
              members: [
                { id: '1', name: 'John Doe', email: credentials.email, role: 'admin' },
                { id: '2', name: 'Jane Smith', email: 'jane@company.com', role: 'member' },
              ],
              settings: {
                notifications: true,
                shareMode: 'team',
              },
            },
          ],
        },
        token: 'mock_jwt_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
      };
    }
  }

  async signup(userData: { name: string; email: string; password: string; teamCode?: string }): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.client.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      // For demo purposes, return mock data
      console.log('Using mock signup data');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        user: {
          id: '1',
          email: userData.email,
          name: userData.name,
          teams: [],
        },
        token: 'mock_jwt_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
      };
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await this.client.post('/auth/forgot-password', { email });
    } catch (error) {
      // For demo purposes, just simulate delay
      console.log('Using mock forgot password');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Chat APIs
  async query(request: QueryRequest): Promise<QueryResponse> {
    try {
      const response: AxiosResponse<QueryResponse> = await this.client.post('/chat/query', request);
      return response.data;
    } catch (error) {
      // For demo purposes, return mock responses
      console.log('Using mock query response');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI processing time
      
      return this.getMockResponse(request.question);
    }
  }

  async getRecentQueries(teamId: string, limit: number = 20): Promise<Message[]> {
    try {
      const response: AxiosResponse<Message[]> = await this.client.get(`/chat/recent?teamId=${teamId}&limit=${limit}`);
      return response.data;
    } catch (error) {
      // For demo purposes, return mock data
      if (!this.loggedMockRecentQueries) {
        console.log('Using mock recent queries');
        this.loggedMockRecentQueries = true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return [
        {
          id: 'old1',
          type: 'user',
          content: 'What tools did the team reject?',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          id: 'old2',
          type: 'assistant',
          content: 'The team rejected several tools during the evaluation process including Jenkins (in favor of GitHub Actions), MongoDB (chose PostgreSQL instead), and Vue.js (decided on React).',
          timestamp: new Date(Date.now() - 86400000 + 30000),
          sources: [this.getMockSources()[1]],
        },
      ];
    }
  }

  async provideFeedback(messageId: string, feedback: FeedbackRequest): Promise<void> {
    try {
      await this.client.post(`/chat/feedback/${messageId}`, feedback);
    } catch (error) {
      // For demo purposes, just log
      console.log('Feedback recorded (mock):', feedback);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // User APIs
  async getUserProfile(): Promise<User> {
    try {
      const response: AxiosResponse<User> = await this.client.get('/user/profile');
      return response.data;
    } catch (error) {
      throw new Error('Failed to load user profile');
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    try {
      const response: AxiosResponse<User> = await this.client.patch('/user/profile', updates);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update user profile');
    }
  }

  // Team APIs
  async getTeams(): Promise<Team[]> {
    try {
      const response: AxiosResponse<Team[]> = await this.client.get('/teams');
      return response.data;
    } catch (error) {
      throw new Error('Failed to load teams');
    }
  }

  async switchTeam(teamId: string): Promise<Team> {
    try {
      const response: AxiosResponse<Team> = await this.client.post(`/teams/${teamId}/switch`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to switch team');
    }
  }

  // Mock helper methods
  private getMockResponse(question: string): QueryResponse {
    const sources = this.getMockSources();
    const suggestions = [
      "Show me the full conversation",
      "Who else was involved in this decision?",
      "What were the alternatives considered?",
      "When was this decided?",
      "Find related decisions",
    ];

    if (question.toLowerCase().includes('payment') || question.toLowerCase().includes('gateway')) {
      return {
        answer: "Based on Monday's meeting, the team decided to use Stripe for payment processing because of its developer-friendly API and robust documentation. The decision was made after comparing several alternatives including PayPal and Square.",
        sources: sources,
        suggestions: suggestions,
        messageId: 'msg_' + Date.now(),
      };
    } else if (question.toLowerCase().includes('database') || question.toLowerCase().includes('db')) {
      return {
        answer: "The team is currently evaluating PostgreSQL and MongoDB for the new project. Sarah recommended PostgreSQL for its ACID compliance and mature ecosystem.",
        sources: [sources[0]], // Just one source for demo
        suggestions: suggestions,
        messageId: 'msg_' + Date.now(),
      };
    } else if (question.toLowerCase().includes('tools') && question.toLowerCase().includes('reject')) {
      return {
        answer: "The team rejected several tools during the evaluation process including Jenkins (in favor of GitHub Actions), MongoDB (chose PostgreSQL instead), and Vue.js (decided on React).",
        sources: [sources[1]],
        suggestions: suggestions,
        messageId: 'msg_' + Date.now(),
      };
    } else {
      return {
        answer: `I found some information related to "${question}". Based on recent team discussions and documentation, here's what I can tell you about this topic.`,
        sources: sources.slice(0, 2),
        suggestions: suggestions,
        messageId: 'msg_' + Date.now(),
      };
    }
  }

  private getMockSources(): Source[] {
    return [
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
  }
}

// Export singleton instance
export const apiClient = new APIClient();