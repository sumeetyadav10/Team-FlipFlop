import React from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Container, Text, Button, ButtonText, Card, Column, Row } from '../../components/common/Styled';
import { theme } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';

export const ProfileScreen = () => {
  const { user, team, logout, isLoading } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Container style={{ padding: theme.spacing.md }}>
        <Column gap={theme.spacing.lg}>
          {/* Profile Header */}
          <Card style={{ alignItems: 'center', padding: theme.spacing.lg }}>
            <Text size="xxxl">👤</Text>
            <Text size="lg" weight="bold" style={{ marginTop: theme.spacing.sm }}>
              {user?.name || 'John Doe'}
            </Text>
            <Text color={theme.colors.text.secondary}>{user?.email || 'john.doe@company.com'}</Text>
            <Text color={theme.colors.text.secondary} style={{ marginTop: theme.spacing.xs }}>
              {team?.name || 'Engineering Team'}
            </Text>
          </Card>

          {/* Team Management */}
          <Column gap={theme.spacing.sm}>
            <Text weight="medium">Team Management</Text>
            <Card>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Column>
                  <Text weight="medium">{team?.name || 'Engineering Team'}</Text>
                  <Text color={theme.colors.text.secondary} size="sm">
                    {team?.members.length || 15} members
                  </Text>
                </Column>
                <Text>{'>'}</Text>
              </Row>
            </Card>
            <Button variant="outline">
              <ButtonText variant="outline">Switch Team</ButtonText>
            </Button>
          </Column>

          {/* Settings */}
          <Column gap={theme.spacing.sm}>
            <Text weight="medium">Settings</Text>
            <Card>
              <Text>🔔 Notifications</Text>
            </Card>
            <Card>
              <Text>🔐 Privacy & Security</Text>
            </Card>
            <Card>
              <Text>📊 Data Usage</Text>
            </Card>
            <Card>
              <Text>❓ Help & Support</Text>
            </Card>
          </Column>

          {/* Account Actions */}
          <Column gap={theme.spacing.sm}>
            <Button 
              variant="outline" 
              onPress={handleLogout}
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              <ButtonText variant="outline">
                {isLoading ? 'Signing Out...' : 'Sign Out'}
              </ButtonText>
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
            Phase 7: Settings functionality will be implemented
          </Text>
        </Column>
      </Container>
    </SafeAreaView>
  );
};