import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Text, Button, ButtonText, Input, Column } from '../../components/common/Styled';
import { theme } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../types';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      await login({ email, password });
      // Navigation will happen automatically due to auth state change
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <Container style={{ padding: theme.spacing.lg, justifyContent: 'center' }}>
      <Column gap={theme.spacing.lg}>
        <Text size="xxxl" weight="bold" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
          FlipFlop
        </Text>
        
        <Text size="lg" weight="medium" style={{ textAlign: 'center' }}>
          Welcome Back
        </Text>
        
        <Text style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
          Sign in to access your team's collective memory
        </Text>
        
        <Column gap={theme.spacing.md} style={{ marginTop: theme.spacing.xl }}>
          <Input 
            placeholder="Email" 
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input 
            placeholder="Password" 
            secureTextEntry 
            value={password}
            onChangeText={setPassword}
          />
          
          <Button 
            style={{ marginTop: theme.spacing.md, opacity: isLoading ? 0.7 : 1 }}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <ButtonText>{isLoading ? 'Signing In...' : 'Sign In'}</ButtonText>
          </Button>
          
          <Button variant="outline" onPress={handleSignup} disabled={isLoading}>
            <ButtonText variant="outline">Create Account</ButtonText>
          </Button>
          
          <Text 
            style={{ 
              textAlign: 'center', 
              color: theme.colors.primary, 
              marginTop: theme.spacing.md 
            }}
            onPress={handleForgotPassword}
          >
            Forgot Password?
          </Text>
        </Column>
        
        <Text 
          style={{ 
            textAlign: 'center', 
            color: theme.colors.text.secondary, 
            fontSize: theme.fonts.sizes.sm,
            marginTop: theme.spacing.xl 
          }}
        >
          Demo: Use any email/password to login
        </Text>
      </Column>
    </Container>
  );
};