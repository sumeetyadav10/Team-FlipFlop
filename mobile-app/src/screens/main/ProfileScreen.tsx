import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Container, Text, Button, ButtonText, Card, Column, Row } from '../../components/common/Styled';
import { theme } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';

export const ProfileScreen = () => {
  const { user, team, logout, isLoading } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Force reload auth state to get latest user data
    const { loadStoredAuth } = useAuthStore.getState();
    await loadStoredAuth();
    setRefreshing(false);
  };

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
              console.log('✅ User logged out successfully');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getDisplayName = () => {
    if (user?.name && user.name !== 'John Doe') {
      return user.name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getDisplayEmail = () => {
    return user?.email || 'No email available';
  };

  const getTeamName = () => {
    if (team?.name && team.name !== 'Engineering Team') {
      return team.name;
    }
    return user?.teams?.[0]?.name || 'No team assigned';
  };

  const getTeamMemberCount = () => {
    if (team?.members && team.members.length > 0) {
      return team.members.length;
    }
    return user?.teams?.[0]?.members?.length || 0;
  };

  const isRealUser = user && user.id !== '1' && user.email !== 'demo@example.com';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container style={{ padding: theme.spacing.md }}>
          <Column gap={theme.spacing.lg}>
            {/* Profile Header */}
            <Card style={{ alignItems: 'center', padding: theme.spacing.lg }}>
              <Text size="xxxl">{user?.avatar ? '👤' : '👤'}</Text>
              <Text size="lg" weight="bold" style={{ marginTop: theme.spacing.sm }}>
                {getDisplayName()}
              </Text>
              <Text color={theme.colors.text.secondary}>{getDisplayEmail()}</Text>
              {isRealUser && (
                <Card style={{ 
                  marginTop: theme.spacing.sm, 
                  backgroundColor: theme.colors.accent + '20',
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs
                }}>
                  <Text size="sm" color={theme.colors.accent}>✅ Real Account</Text>
                </Card>
              )}
              <Text color={theme.colors.text.secondary} style={{ marginTop: theme.spacing.xs }}>
                {getTeamName()}
              </Text>
            </Card>

            {/* Team Management */}
            <Column gap={theme.spacing.sm}>
              <Text weight="medium">Team Management</Text>
              <Card>
                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Column>
                    <Text weight="medium">{getTeamName()}</Text>
                    <Text color={theme.colors.text.secondary} size="sm">
                      {getTeamMemberCount()} member{getTeamMemberCount() !== 1 ? 's' : ''}
                    </Text>
                  </Column>
                  <Text>{'>'}</Text>
                </Row>
              </Card>
              <Button variant="outline">
                <ButtonText variant="outline">Switch Team</ButtonText>
              </Button>
            </Column>

            {/* User Info */}
            <Column gap={theme.spacing.sm}>
              <Text weight="medium">Account Information</Text>
              <Card>
                <Column gap={theme.spacing.sm}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>User ID:</Text>
                    <Text size="sm">{user?.id || 'N/A'}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>Email:</Text>
                    <Text size="sm">{getDisplayEmail()}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>Teams:</Text>
                    <Text size="sm">{user?.teams?.length || 0}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>Account Type:</Text>
                    <Text size="sm" color={isRealUser ? theme.colors.accent : theme.colors.text.secondary}>
                      {isRealUser ? 'Real User' : 'Demo User'}
                    </Text>
                  </Row>
                </Column>
              </Card>
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
                style={{ 
                  opacity: isLoading ? 0.7 : 1,
                  borderColor: theme.colors.error,
                }}
              >
                <ButtonText variant="outline" style={{ color: theme.colors.error }}>
                  {isLoading ? 'Signing Out...' : '🚪 Sign Out'}
                </ButtonText>
              </Button>
              
              <Button 
                variant="outline" 
                onPress={onRefresh}
                disabled={refreshing}
                style={{ opacity: refreshing ? 0.7 : 1 }}
              >
                <ButtonText variant="outline">
                  {refreshing ? 'Refreshing...' : '🔄 Refresh Profile'}
                </ButtonText>
              </Button>
            </Column>

            {!isRealUser && (
              <Card style={{ backgroundColor: theme.colors.warning + '20', padding: theme.spacing.md }}>
                <Text size="sm" color={theme.colors.warning} style={{ textAlign: 'center' }}>
                  ⚠️ You're using demo data. Sign up with a real account to access all features.
                </Text>
              </Card>
            )}

            <Text 
              style={{ 
                textAlign: 'center', 
                color: theme.colors.text.secondary, 
                fontSize: theme.fonts.sizes.sm,
                marginTop: theme.spacing.xl 
              }}
            >
              FlipFlop v1.0 - Team Collaboration Platform
            </Text>
          </Column>
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;