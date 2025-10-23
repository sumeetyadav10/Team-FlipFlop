import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Text, Button, ButtonText, Input, Column } from '../../components/common/Styled';
import { theme } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../types';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { forgotPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await forgotPassword(email);
      Alert.alert(
        'Reset Link Sent', 
        'If an account with this email exists, you will receive a password reset link.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <Container style={{ padding: theme.spacing.lg, justifyContent: 'center' }}>
      <Column gap={theme.spacing.lg}>
        <Text size="xxxl" weight="bold" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
          FlipFlop
        </Text>
        
        <Text size="lg" weight="medium" style={{ textAlign: 'center' }}>
          Reset Password
        </Text>
        
        <Text style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
          Enter your email to receive a password reset link
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
          
          <Button 
            style={{ marginTop: theme.spacing.md, opacity: isLoading ? 0.7 : 1 }}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <ButtonText>{isLoading ? 'Sending...' : 'Send Reset Link'}</ButtonText>
          </Button>
          
          <Button variant="outline" onPress={handleBackToLogin} disabled={isLoading}>
            <ButtonText variant="outline">Back to Sign In</ButtonText>
          </Button>
        </Column>
        
        <Text 
          style={{ 
            textAlign: 'center', 
            color: theme.colors.text.secondary, 
            fontSize: theme.fonts.sizes.sm,
            marginTop: theme.spacing.xl 
          }}
        >
          Demo: Enter any email to simulate reset
        </Text>
      </Column>
    </Container>
  );
};