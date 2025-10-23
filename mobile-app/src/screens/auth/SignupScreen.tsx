import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Text, Button, ButtonText, Input, Column } from '../../components/common/Styled';
import { theme } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../types';

type SignupScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Signup'>;

export const SignupScreen = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const { signup, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamCode, setTeamCode] = useState('');

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await signup({ name, email, password, teamCode });
      // Navigation will happen automatically due to auth state change
    } catch (error) {
      Alert.alert('Signup Failed', error instanceof Error ? error.message : 'An error occurred');
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
          Create Account
        </Text>
        
        <Text style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
          Join your team's knowledge network
        </Text>
        
        <Column gap={theme.spacing.md} style={{ marginTop: theme.spacing.xl }}>
          <Input 
            placeholder="Full Name" 
            value={name}
            onChangeText={setName}
          />
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
          <Input 
            placeholder="Team Code (Optional)" 
            value={teamCode}
            onChangeText={setTeamCode}
            autoCapitalize="characters"
          />
          
          <Button 
            style={{ marginTop: theme.spacing.md, opacity: isLoading ? 0.7 : 1 }}
            onPress={handleSignup}
            disabled={isLoading}
          >
            <ButtonText>{isLoading ? 'Creating Account...' : 'Create Account'}</ButtonText>
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
          Demo: Use any details to create account
        </Text>
      </Column>
    </Container>
  );
};