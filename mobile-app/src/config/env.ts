// Environment Configuration for FlipFlop Mobile App
// This file contains the configuration to connect to your backend services
// In Expo/React Native, only EXPO_PUBLIC_ prefixed variables are available at runtime

import Constants from 'expo-constants';

// Get environment variables from Expo Constants
const getEnvVar = (key: string, fallback: string = '') => {
  return Constants.expoConfig?.extra?.[key] || fallback;
};

export const ENV_CONFIG = {
  // Backend API Configuration
  API_BASE_URL: __DEV__ 
    ? getEnvVar('API_BASE_URL', 'http://localhost:3000') // Development - local backend
    : getEnvVar('API_BASE_URL', 'https://your-production-backend.com'), // Production
  
  // Supabase Configuration (for real-time features and auth)
  SUPABASE: {
    URL: getEnvVar('SUPABASE_URL', 'https://yyirmzmkwfobtczvuwxc.supabase.co'),
    ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aXJtem1rd2ZvYnRjenZ1d3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExOTYyNDMsImV4cCI6MjA3Njc3MjI0M30.40MvWUdOMHwBKHbOtbINdhgpKE1_44iC5gvX7dOB22o'),
  },

  // Note: These API keys should be handled by your backend for security
  // They are temporarily hardcoded here for development
  // In production, these should be server-side only
  INTEGRATIONS: {
    // These should be moved to backend environment variables
    OPENAI_API_KEY: '', // Should be backend-only
    PINECONE_API_KEY: '', // Should be backend-only
    PINECONE_HOST: '', // Should be backend-only
    SLACK_BOT_TOKEN: '', // Should be backend-only
    NOTION_TOKEN: '', // Should be backend-only
    GITHUB_TOKEN: '', // Should be backend-only
    GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID', ''), // Can be public
  },

  // Feature Flags
  FEATURES: {
    ENABLE_REAL_API: false, // Set to false to use mock data (temporarily disabled until backend is deployed)
    ENABLE_SUPABASE_AUTH: true, // Use Supabase for authentication
    ENABLE_REAL_TIME: true, // Real-time updates via Supabase
    ENABLE_VECTOR_SEARCH: true, // Pinecone-powered semantic search
  },

  // Timeouts and Limits
  API_TIMEOUT: 30000, // 30 seconds
  MAX_MESSAGE_LENGTH: 4000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Security
  EXTENSION_API_KEY: getEnvVar('EXTENSION_API_KEY', 'ext_secret_key_123'),
};

// Export individual configs for easier imports
export const { API_BASE_URL, SUPABASE, INTEGRATIONS, FEATURES } = ENV_CONFIG;

// Helper function to check if we're using real APIs
export const isUsingRealAPI = () => ENV_CONFIG.FEATURES.ENABLE_REAL_API;

// Helper to get API headers
export const getAPIHeaders = (includeAuth: boolean = true) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client': 'flipflop-mobile',
    'X-Version': '1.0.0',
  };

  if (includeAuth) {
    // Auth token will be added by the API client interceptor
    headers['X-Extension-Key'] = ENV_CONFIG.EXTENSION_API_KEY;
  }

  return headers;
};