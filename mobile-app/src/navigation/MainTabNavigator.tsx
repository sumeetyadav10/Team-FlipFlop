import React from 'react';
import { Text as RNText } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MainTabParamList, ChatStackParamList } from '../types';
import { ChatScreen } from '../screens/main/ChatScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { SourceDetailScreen } from '../screens/main/SourceDetailScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ChatStack = createStackNavigator<ChatStackParamList>();

function ChatNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen 
        name="ChatScreen" 
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <ChatStack.Screen 
        name="SourceDetail" 
        component={SourceDetailScreen}
        options={{ 
          title: 'Source Details',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#E5E5EA',
            borderBottomWidth: 1,
          },
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </ChatStack.Navigator>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5EA',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#6D6D80',
      }}
    >
      <Tab.Screen 
        name="Chat" 
        component={ChatNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => (
            <RNText style={{ color, fontSize: 20 }}>💬</RNText>
          ),
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => (
            <RNText style={{ color, fontSize: 20 }}>🔍</RNText>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <RNText style={{ color, fontSize: 20 }}>👤</RNText>
          ),
        }}
      />
    </Tab.Navigator>
  );
}