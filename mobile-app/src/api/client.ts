import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryContext, Message, Source, User, Team, TeamMember, AuthCredentials, LoginResponse, MessageAction } from '../types';
import { ENV_CONFIG, API_BASE_URL, getAPIHeaders, isUsingRealAPI } from '../config/env';
import { supabase, supabaseHelpers } from '../config/supabase';

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
  actionButtons?: MessageAction[];
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
    // Use your real backend URL
    this.baseURL = API_BASE_URL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: ENV_CONFIG.API_TIMEOUT,
      headers: getAPIHeaders(false), // Auth will be added by interceptor
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
    console.log('🔐 Attempting login with Supabase');
    
    try {
      // Try Supabase authentication
      const { data, error } = await supabaseHelpers.signIn(credentials.email, credentials.password);
      
      if (error) {
        console.error('❌ Supabase login failed:', error.message);
        // Throw specific error messages based on error type
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account before signing in.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        } else {
          throw new Error(error.message || 'Login failed. Please try again.');
        }
      }
      
      if (!data?.user || !data?.session) {
        throw new Error('Login failed. No user session created.');
      }

      console.log('✅ Supabase login successful');
      
      const userId = data.user.id;
      const userEmail = data.user.email || credentials.email;
      const sessionToken = data.session.access_token;
      const refreshToken = data.session.refresh_token || '';
      
      // Store the session token
      await AsyncStorage.setItem('@flipflop_token', sessionToken);
      
      console.log('📋 Fetching user profile and teams for userId:', userId);
      
      // Get user profile and teams
      const [profileResult, teamsResult] = await Promise.all([
        supabaseHelpers.getUserProfile(userId),
        supabaseHelpers.getUserTeams(userId)
      ]);
      
      console.log('👤 Profile result:', profileResult);
      console.log('🏢 Teams result:', teamsResult);
      
      const profile = profileResult.data;
      const userTeams = teamsResult.data;
      
      let teams = userTeams?.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        description: `Team ${tm.teams.name}`,
        members: [], // Will be populated separately if needed
        settings: tm.teams.settings || {
          notifications: true,
          shareMode: 'team' as const,
        },
      })) || [];
      
      console.log('🏢 User teams from database:', teams);
      
      // If user has no teams, create a default personal team
      if (teams.length === 0) {
        console.log('🏢 Creating default team for user');
        const defaultTeam: any = {
          id: `personal_${userId}`,
          name: 'My Team',
          description: 'Personal workspace',
          members: [{
            id: userId,
            name: profile?.name || data.user.user_metadata?.name || userEmail.split('@')[0],
            email: userEmail,
            role: 'admin' as const,
          }],
          settings: {
            notifications: true,
            shareMode: 'team' as const,
          },
        };
        teams = [defaultTeam];
        console.log('✅ Created default team:', defaultTeam);
      }
      
      console.log('🎯 Final teams array:', teams);
      
      const loginResponse = {
        user: {
          id: userId,
          email: userEmail,
          name: profile?.name || data.user.user_metadata?.name || userEmail.split('@')[0],
          avatar: profile?.avatar_url || data.user.user_metadata?.avatar_url,
          teams,
        },
        token: sessionToken,
        refreshToken: refreshToken,
      };
      
      console.log('🚀 Returning login response:', JSON.stringify(loginResponse, null, 2));
      return loginResponse;
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      throw error; // Re-throw the error to be handled by the auth store
    }
  }

  async signup(userData: { name: string; email: string; password: string; teamCode?: string }): Promise<LoginResponse> {
    console.log('🔐 Attempting signup with Supabase');
    
    try {
      // Try Supabase signup
      const { data, error } = await supabaseHelpers.signUp(
        userData.email, 
        userData.password,
        { name: userData.name }
      );
      
      if (error) {
        console.error('❌ Supabase signup failed:', error.message);
        // Throw specific error messages based on error type
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please try signing in instead.');
        } else if (error.message.includes('Password should be')) {
          throw new Error('Password must be at least 6 characters long.');
        } else if (error.message.includes('Invalid email')) {
          throw new Error('Please enter a valid email address.');
        } else {
          throw new Error(error.message || 'Signup failed. Please try again.');
        }
      }
      
      if (!data?.user) {
        throw new Error('Signup failed. No user created.');
      }

      console.log('✅ Supabase signup successful');
      
      const userId = data.user.id;
      const userEmail = userData.email;
      const userName = userData.name;
      
      // Create user profile
      try {
        await supabaseHelpers.createUserProfile({
          id: userId,
          email: userEmail,
          name: userName,
        });
      } catch (profileError) {
        console.warn('⚠️ Failed to create profile:', profileError);
      }
      
      // Get user teams (might be empty for new users)
      const teamsResult = await supabaseHelpers.getUserTeams(userId);
      const userTeams = teamsResult.data || [];
      
      let teams = userTeams.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        description: `Team ${tm.teams.name}`,
        members: [{
          id: userId,
          name: userName,
          email: userEmail,
          role: 'admin' as const,
        }],
        settings: {
          notifications: true,
          shareMode: 'team' as const,
        },
      }));
      
      // If new user has no teams, create a default personal team
      if (teams.length === 0) {
        console.log('🏢 Creating default team for new user');
        const defaultTeam: any = {
          id: `personal_${userId}`,
          name: 'My Team',
          description: 'Personal workspace',
          members: [{
            id: userId,
            name: userName,
            email: userEmail,
            role: 'admin' as const,
          }],
          settings: {
            notifications: true,
            shareMode: 'team' as const,
          },
        };
        teams = [defaultTeam];
      }
      
      return {
        user: {
          id: userId,
          email: userEmail,
          name: userName,
          teams,
        },
        token: data.session?.access_token || 'pending_verification',
        refreshToken: data.session?.refresh_token || '',
      };
    } catch (error: any) {
      console.error('❌ Signup error:', error.message);
      throw error; // Re-throw the error to be handled by the auth store
    }
  }

  async forgotPassword(email: string): Promise<void> {
    if (isUsingRealAPI()) {
      try {
        console.log('🔐 Using Supabase for password reset');
        
        const { data, error } = await supabaseHelpers.resetPassword(email);
        
        if (error) {
          console.error('❌ Supabase password reset failed:', error.message);
          throw new Error(error.message);
        }
        
        console.log('✅ Password reset email sent via Supabase');
        return;
      } catch (error) {
        console.error('❌ Real password reset failed:', error);
        // Fall back to mock for demo
      }
    }
    
    // Mock forgot password for demo
    console.log('🎭 Using mock forgot password');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Chat APIs
  async query(request: QueryRequest): Promise<QueryResponse> {
    if (isUsingRealAPI()) {
      try {
        console.log('🚀 Using real API for query:', request.question);
        
        // First, try to get response from your main API
        const response: AxiosResponse<QueryResponse> = await this.client.post('/api/chat/query', request);
        
        // If successful, store the query in Supabase
        if (response.data) {
          try {
            // Store the query and answer in your queries table
            await supabaseHelpers.insertQuery({
              question: request.question,
              answer: response.data.answer,
              team_id: request.teamId,
              user_id: 'current_user', // You'd get this from auth context
              sources: response.data.sources,
              context: request.context,
            });
          } catch (dbError) {
            console.warn('⚠️ Failed to store query in Supabase:', dbError);
          }
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Real API failed, falling back to mock:', error);
        // Fall back to mock if real API fails
        return this.getMockResponse(request.question, request.context);
      }
    } else {
      console.log('🎭 Using mock API for query:', request.question);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI processing time
      return this.getMockResponse(request.question, request.context);
    }
  }

  async getRecentQueries(teamId: string, limit: number = 20): Promise<Message[]> {
    if (isUsingRealAPI()) {
      try {
        console.log('📋 Getting recent queries from Supabase');
        
        const { data, error } = await supabaseHelpers.getTeamQueries(teamId, limit);
        
        if (error) {
          console.error('❌ Failed to get queries from Supabase:', error.message);
          throw error;
        }
        
        if (data) {
          // Convert Supabase queries to Message format
          const messages: Message[] = [];
          
          data.forEach((query: any) => {
            // Add user question as a message
            messages.push({
              id: `${query.id}-question`,
              type: 'user',
              content: query.question,
              timestamp: new Date(query.created_at),
            });
            
            // Add assistant answer as a message
            messages.push({
              id: `${query.id}-answer`,
              type: 'assistant',
              content: query.answer,
              timestamp: new Date(query.created_at),
              sources: query.sources || [],
              suggestions: [], // You can extract suggestions from context if needed
            });
          });
          
          console.log(`✅ Retrieved ${messages.length} messages from Supabase`);
          return messages.reverse(); // Reverse to show oldest first
        }
      } catch (error) {
        console.error('❌ Supabase query failed, falling back to mock:', error);
        // Fall back to REST API or mock
      }
    }
    
    // Try REST API fallback or mock
    try {
      const response: AxiosResponse<Message[]> = await this.client.get(`/chat/recent?teamId=${teamId}&limit=${limit}`);
      return response.data;
    } catch (error) {
      // For demo purposes, return mock data
      if (!this.loggedMockRecentQueries) {
        console.log('🎭 Using mock recent queries');
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
    if (isUsingRealAPI()) {
      try {
        console.log('🔍 Fetching user profile from API');
        const response: AxiosResponse<User> = await this.client.get('/user/profile');
        return response.data;
      } catch (error) {
        console.error('❌ API profile fetch failed, falling back to Supabase:', error);
        // Fall through to Supabase fallback
      }
    }

    // Try to get current user from Supabase
    try {
      console.log('🔍 Fetching user profile from Supabase');
      const session = await supabaseHelpers.getCurrentSession();
      
      if (!session?.user) {
        throw new Error('No active session');
      }

      const userId = session.user.id;
      const userEmail = session.user.email || '';
      
      // Get profile and teams in parallel
      const [profileResult, teamsResult] = await Promise.all([
        supabaseHelpers.getUserProfile(userId),
        supabaseHelpers.getUserTeams(userId)
      ]);

      const profile = profileResult.data;
      const userTeams = teamsResult.data;

      let teams: Team[] = userTeams?.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        description: `Team ${tm.teams.name}`,
        members: [] as TeamMember[], // Will be populated separately if needed
        settings: tm.teams.settings || {
          notifications: true,
          shareMode: 'team' as const,
        },
      })) || [];

      // If user has no teams, create a default personal team
      if (teams.length === 0) {
        const defaultTeam = {
          id: `personal_${userId}`,
          name: 'My Team',
          description: 'Personal workspace',
          members: [{
            id: userId,
            name: profile?.name || session.user.user_metadata?.name || userEmail.split('@')[0],
            email: userEmail,
            role: 'admin' as const,
          }],
          settings: {
            notifications: true,
            shareMode: 'team' as const,
          },
        };
        teams = [defaultTeam];
      }

      const user: User = {
        id: userId,
        email: userEmail,
        name: profile?.name || session.user.user_metadata?.name || userEmail.split('@')[0],
        avatar: profile?.avatar_url || session.user.user_metadata?.avatar_url,
        teams,
      };

      console.log('✅ Retrieved user profile from Supabase');
      return user;
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      throw new Error('Failed to load user profile');
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    if (isUsingRealAPI()) {
      try {
        console.log('📝 Updating user profile via API');
        const response: AxiosResponse<User> = await this.client.patch('/user/profile', updates);
        return response.data;
      } catch (error) {
        console.error('❌ API profile update failed, falling back to Supabase:', error);
        // Fall through to Supabase fallback
      }
    }

    // Update profile in Supabase
    try {
      console.log('📝 Updating user profile in Supabase');
      const session = await supabaseHelpers.getCurrentSession();
      
      if (!session?.user) {
        throw new Error('No active session');
      }

      const userId = session.user.id;

      // Update profile data
      const profileUpdates: any = {};
      if (updates.name) profileUpdates.name = updates.name;
      if (updates.avatar) profileUpdates.avatar_url = updates.avatar;

      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Profile updated in Supabase');
      
      // Return the updated user profile
      return await this.getUserProfile();
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  async refreshUserProfile(): Promise<User> {
    console.log('🔄 Refreshing user profile');
    return await this.getUserProfile();
  }

  // Team APIs
  async getTeams(): Promise<Team[]> {
    if (isUsingRealAPI()) {
      try {
        console.log('🏢 Fetching teams from API');
        const response: AxiosResponse<Team[]> = await this.client.get('/teams');
        return response.data;
      } catch (error) {
        console.error('❌ API teams fetch failed, falling back to Supabase:', error);
        // Fall through to Supabase fallback
      }
    }

    // Get teams from Supabase
    try {
      console.log('🏢 Fetching teams from Supabase');
      const session = await supabaseHelpers.getCurrentSession();
      
      if (!session?.user) {
        throw new Error('No active session');
      }

      const userId = session.user.id;
      const { data, error } = await supabaseHelpers.getUserTeams(userId);

      if (error) {
        throw error;
      }

      const teams = data?.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        description: `Team ${tm.teams.name}`,
        members: [], // Populate if needed
        settings: tm.teams.settings || {
          notifications: true,
          shareMode: 'team' as const,
        },
      })) || [];

      console.log('✅ Retrieved teams from Supabase');
      return teams;
    } catch (error) {
      console.error('❌ Failed to get teams:', error);
      throw new Error('Failed to load teams');
    }
  }

  async switchTeam(teamId: string): Promise<Team> {
    if (isUsingRealAPI()) {
      try {
        console.log('🔄 Switching team via API');
        const response: AxiosResponse<Team> = await this.client.post(`/teams/${teamId}/switch`);
        return response.data;
      } catch (error) {
        console.error('❌ API team switch failed, falling back to Supabase:', error);
        // Fall through to Supabase fallback
      }
    }

    // Switch team using Supabase data
    try {
      console.log('🔄 Switching team in local storage');
      const teams = await this.getTeams();
      const team = teams.find(t => t.id === teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }

      // Store the selected team in AsyncStorage
      await AsyncStorage.setItem('@flipflop_team', JSON.stringify(team));
      
      console.log('✅ Team switched successfully');
      return team;
    } catch (error) {
      console.error('❌ Failed to switch team:', error);
      throw new Error('Failed to switch team');
    }
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    if (isUsingRealAPI()) {
      try {
        console.log('👥 Fetching team members from API');
        const response: AxiosResponse<TeamMember[]> = await this.client.get(`/teams/${teamId}/members`);
        return response.data;
      } catch (error) {
        console.error('❌ API team members fetch failed, falling back to Supabase:', error);
        // Fall through to Supabase fallback
      }
    }

    // Check if this is a personal team (starts with 'personal_')
    if (teamId.startsWith('personal_')) {
      try {
        console.log('👤 Handling personal team - creating member from current user');
        const session = await supabaseHelpers.getCurrentSession();
        
        if (!session?.user) {
          throw new Error('No active session');
        }

        const userId = session.user.id;
        const userEmail = session.user.email || '';
        
        // Get user profile
        const { data: profile } = await supabaseHelpers.getUserProfile(userId);
        
        const personalMember: TeamMember = {
          id: userId,
          name: profile?.name || session.user.user_metadata?.name || userEmail.split('@')[0] || 'You',
          email: userEmail,
          role: 'admin',
          avatar: profile?.avatar_url,
          lastActive: new Date(),
        };

        console.log('✅ Created personal team member');
        return [personalMember];
      } catch (error) {
        console.error('❌ Failed to create personal team member:', error);
        // Return a basic fallback member
        return [{
          id: teamId.replace('personal_', ''),
          name: 'You',
          email: 'user@example.com',
          role: 'admin',
          lastActive: new Date(),
        }];
      }
    }

    // Get team members from Supabase for regular teams
    try {
      console.log('👥 Fetching team members from Supabase');
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          role,
          joined_at,
          profiles (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('team_id', teamId);

      if (error) {
        throw error;
      }

      const members: TeamMember[] = data?.map((member: any) => ({
        id: member.profiles.id,
        name: member.profiles.name || member.profiles.email?.split('@')[0] || 'Unknown',
        email: member.profiles.email || '',
        role: member.role,
        avatar: member.profiles.avatar_url,
        lastActive: new Date(member.joined_at),
      })) || [];

      console.log('✅ Retrieved team members from Supabase');
      return members;
    } catch (error) {
      console.error('❌ Failed to get team members:', error);
      throw new Error('Failed to load team members');
    }
  }

  // Mock helper methods
  private getMockResponse(question: string, context?: QueryContext): QueryResponse {
    const sources = this.getMockSources();
    const suggestions = [
      "Show me the full conversation",
      "Who else was involved in this decision?",
      "What were the alternatives considered?",
      "When was this decided?",
      "Find related decisions",
    ];

    // Generate smart action buttons based on question content
    const generateActionButtons = (query: string, sources: Source[]): MessageAction[] => {
      const actions: MessageAction[] = [];
      const lowerQuery = query.toLowerCase();

      // Meeting/Schedule related
      if (lowerQuery.includes('meeting') || lowerQuery.includes('schedule') || lowerQuery.includes('discuss')) {
        actions.push({
          id: 'schedule',
          type: 'calendar',
          label: 'Schedule',
          icon: '📅'
        });
        actions.push({
          id: 'meet',
          type: 'meet',
          label: 'Start Call',
          icon: '🎥'
        });
      }

      // Documentation related
      if (lowerQuery.includes('document') || lowerQuery.includes('decision') || lowerQuery.includes('log')) {
        actions.push({
          id: 'notion',
          type: 'notion',
          label: 'View in Notion',
          icon: '📝'
        });
      }

      // Team/Communication related
      if (lowerQuery.includes('team') || lowerQuery.includes('channel') || lowerQuery.includes('slack')) {
        actions.push({
          id: 'slack',
          type: 'slack',
          label: 'Open in Slack',
          icon: '💬'
        });
      }

      // Based on sources, add relevant buttons
      sources.forEach(source => {
        switch (source.type) {
          case 'slack':
            if (!actions.find(a => a.type === 'slack')) {
              actions.push({
                id: 'slack-source',
                type: 'slack',
                label: 'Join Channel',
                icon: '💬'
              });
            }
            break;
          case 'notion':
            if (!actions.find(a => a.type === 'notion')) {
              actions.push({
                id: 'notion-source',
                type: 'notion',
                label: 'Open Doc',
                icon: '📝'
              });
            }
            break;
          case 'email':
            actions.push({
              id: 'email-source',
              type: 'email',
              label: 'Reply',
              icon: '📧'
            });
            break;
        }
      });

      // Always add search for more and share
      actions.push({
        id: 'search',
        type: 'search',
        label: 'Search More',
        icon: '🔍'
      });

      return actions.slice(0, 4); // Limit to 4 buttons
    };

    // Check for follow-up questions
    if (context?.conversationId && question.toLowerCase().includes("full conversation")) {
      const actionButtons = generateActionButtons(question, sources);
      return {
        answer: "Here is the full conversation log from the #engineering channel regarding the payment gateway decision. It includes messages from Sarah, Mike, and Alex.",
        sources: this.getMockSources(),
        suggestions: ["Summarize the key points", "What was Alex's main concern?", "Who has expertise in payments?"],
        messageId: 'msg_' + Date.now(),
        actionButtons,
      };
    }

    // Enhanced expertise-based responses
    if (question.toLowerCase().includes('who') && (question.toLowerCase().includes('expert') || question.toLowerCase().includes('knows'))) {
      const actionButtons: MessageAction[] = [
        { id: 'slack-contact', type: 'slack', label: 'Message Team', icon: '💬' },
        { id: 'calendar', type: 'calendar', label: 'Book Meeting', icon: '📅' },
        { id: 'search', type: 'search', label: 'Find More', icon: '🔍' }
      ];
      
      return {
        answer: "Based on team activity and contributions, here are the subject matter experts: **Sarah Johnson** - Payment systems, API integrations, security. **Mike Chen** - Database architecture, performance optimization. **Alex Rivera** - Frontend development, React, UI/UX.",
        sources: [sources[0]], 
        suggestions: ["Contact Sarah about payments", "Ask Mike about database design", "Get Alex's input on UI"],
        messageId: 'msg_' + Date.now(),
        actionButtons,
      };
    }

    if (question.toLowerCase().includes('payment') || question.toLowerCase().includes('gateway')) {
      const actionButtons: MessageAction[] = [
        { id: 'notion-doc', type: 'notion', label: 'Decision Log', icon: '📝' },
        { id: 'slack-channel', type: 'slack', label: 'Engineering', icon: '💬' },
        { id: 'meet-sarah', type: 'meet', label: 'Call Sarah', icon: '🎥' },
        { id: 'search', type: 'search', label: 'More Info', icon: '🔍' }
      ];
      
      return {
        answer: "Based on Monday's meeting, the team decided to use Stripe for payment processing because of its developer-friendly API and robust documentation. The decision was made after comparing several alternatives including PayPal and Square. **Sarah Johnson** led this evaluation and has become our payment systems expert.",
        sources: sources,
        suggestions: [...suggestions, "Who has expertise in payments?"],
        messageId: 'msg_' + Date.now(),
        actionButtons,
      };
    } else if (question.toLowerCase().includes('database') || question.toLowerCase().includes('db')) {
      const actionButtons: MessageAction[] = [
        { id: 'slack-mike', type: 'slack', label: 'Ask Mike', icon: '💬' },
        { id: 'calendar-db', type: 'calendar', label: 'DB Review', icon: '📅' },
        { id: 'notion-arch', type: 'notion', label: 'Architecture', icon: '📝' }
      ];
      
      return {
        answer: "The team is currently evaluating PostgreSQL and MongoDB for the new project. **Mike Chen** recommended PostgreSQL for its ACID compliance and mature ecosystem. He has extensive experience with database architecture.",
        sources: [sources[0]],
        suggestions: [...suggestions, "Ask Mike about database performance"],
        messageId: 'msg_' + Date.now(),
        actionButtons,
      };
    } else if (question.toLowerCase().includes('tools') && question.toLowerCase().includes('reject')) {
      const actionButtons = generateActionButtons(question, [sources[1]]);
      return {
        answer: "The team rejected several tools during the evaluation process including Jenkins (in favor of GitHub Actions), MongoDB (chose PostgreSQL instead), and Vue.js (decided on React). These decisions were made collaboratively with input from **Sarah** (DevOps), **Mike** (Backend), and **Alex** (Frontend).",
        sources: [sources[1]],
        suggestions: [...suggestions, "Who decided on the frontend framework?"],
        messageId: 'msg_' + Date.now(),
        actionButtons,
      };
    } else {
      const actionButtons = generateActionButtons(question, sources.slice(0, 2));
      return {
        answer: `I found some information related to "${question}". Based on recent team discussions and documentation, here's what I can tell you about this topic.`,
        sources: sources.slice(0, 2),
        suggestions: suggestions,
        messageId: 'msg_' + Date.now(),
        actionButtons,
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