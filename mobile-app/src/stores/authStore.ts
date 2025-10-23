import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Team, AuthCredentials, LoginResponse } from '../types';
import { apiClient } from '../api/client';

interface AuthState {
  user: User | null;
  team: Team | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: AuthCredentials) => Promise<void>;
  signup: (userData: { name: string; email: string; password: string; teamCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const STORAGE_KEYS = {
  TOKEN: '@flipflop_token',
  USER: '@flipflop_user',
  TEAM: '@flipflop_team',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  team: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (credentials: AuthCredentials) => {
    set({ isLoading: true });
    
    try {
      const response = await apiClient.login(credentials);

      // Store auth data
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      if (response.user.teams.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(response.user.teams[0]));
      }

      set({
        user: response.user,
        team: response.user.teams[0] || null,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw new Error('Invalid credentials. Please try again.');
    }
  },

  signup: async (userData) => {
    set({ isLoading: true });
    
    try {
      const response = await apiClient.signup(userData);
      
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

      set({
        user: response.user,
        team: null,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw new Error('Signup failed. Please try again.');
    }
  },

  logout: async () => {
    set({ isLoading: true });
    
    try {
      // Clear stored auth data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.TEAM,
      ]);

      set({
        user: null,
        team: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw new Error('Logout failed. Please try again.');
    }
  },

  switchTeam: async (teamId: string) => {
    const { user } = get();
    if (!user) return;

    const team = user.teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
      set({ team });
    } catch (error) {
      throw new Error('Failed to switch team.');
    }
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    
    try {
      const [token, userStr, teamStr] = await AsyncStorage.multiGet([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.TEAM,
      ]);

      const tokenValue = token[1];
      const user = userStr[1] ? JSON.parse(userStr[1]) : null;
      const team = teamStr[1] ? JSON.parse(teamStr[1]) : null;

      if (tokenValue && user) {
        set({
          user,
          team,
          token: tokenValue,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true });
    
    try {
      await apiClient.forgotPassword(email);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw new Error('Failed to send reset email.');
    }
  },
}));