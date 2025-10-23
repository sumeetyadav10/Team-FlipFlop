import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Container, Text, Button, ButtonText, Card, Column, Row } from '../../components/common/Styled';
import { theme } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { TeamMember } from '../../types';

export const ProfileScreen = () => {
  const { user, team, logout, isLoading, switchTeam } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [userTeams, setUserTeams] = useState(user?.teams || []);

  // Load team members when team changes
  useEffect(() => {
    if (team?.id) {
      loadTeamMembers();
    }
  }, [team?.id]);

  // Load user teams on mount
  useEffect(() => {
    loadUserTeams();
  }, []);

  const loadTeamMembers = async () => {
    if (!team?.id) return;
    
    setLoadingMembers(true);
    try {
      console.log('📋 Loading team members for team:', team.id);
      const members = await apiClient.getTeamMembers(team.id);
      setTeamMembers(members);
    } catch (error) {
      console.error('❌ Failed to load team members:', error);
      // Don't show error to user, just log it
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadUserTeams = async () => {
    try {
      console.log('🏢 Loading user teams');
      const teams = await apiClient.getTeams();
      setUserTeams(teams);
    } catch (error) {
      console.error('❌ Failed to load teams:', error);
      // Fallback to teams from user object
      setUserTeams(user?.teams || []);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing profile data');
      
      // Refresh user profile from API/Supabase
      const updatedUser = await apiClient.refreshUserProfile();
      
      // Update the auth store with fresh data
      const { loadStoredAuth } = useAuthStore.getState();
      await loadStoredAuth();
      
      // Reload team data
      await loadUserTeams();
      if (team?.id) {
        await loadTeamMembers();
      }
      
      console.log('✅ Profile refresh completed');
    } catch (error) {
      console.error('❌ Profile refresh failed:', error);
      Alert.alert('Refresh Failed', 'Could not refresh profile data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSwitchTeam = async (teamId: string) => {
    try {
      console.log('🔄 Switching to team:', teamId);
      const selectedTeam = await apiClient.switchTeam(teamId);
      await switchTeam(teamId);
      
      // Reload team members for the new team
      await loadTeamMembers();
      
      Alert.alert('Success', `Switched to ${selectedTeam.name}`);
    } catch (error) {
      console.error('❌ Team switch failed:', error);
      Alert.alert('Switch Failed', 'Could not switch teams. Please try again.');
    }
  };

  const showTeamSwitcher = () => {
    if (userTeams.length <= 1) {
      Alert.alert('No Other Teams', 'You are only a member of one team.');
      return;
    }

    const teamOptions = userTeams.map(t => ({
      text: t.name,
      onPress: () => handleSwitchTeam(t.id),
    }));

    Alert.alert(
      'Switch Team',
      'Select a team to switch to:',
      [
        ...teamOptions,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
    // Use loaded team members if available, otherwise fallback to stored data
    if (teamMembers.length > 0) {
      return teamMembers.length;
    }
    if (team?.members && team.members.length > 0) {
      return team.members.length;
    }
    return user?.teams?.[0]?.members?.length || 1; // At least the current user
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
                      {loadingMembers ? 'Loading members...' : `${getTeamMemberCount()} member${getTeamMemberCount() !== 1 ? 's' : ''}`}
                    </Text>
                    {userTeams.length > 0 && (
                      <Text color={theme.colors.text.secondary} size="xs">
                        {userTeams.length} team{userTeams.length !== 1 ? 's' : ''} available
                      </Text>
                    )}
                  </Column>
                  <Text>{'>'}</Text>
                </Row>
              </Card>
              <Button variant="outline" onPress={showTeamSwitcher}>
                <ButtonText variant="outline">
                  {userTeams.length > 1 ? 'Switch Team' : 'Manage Team'}
                </ButtonText>
              </Button>
              
              {/* Team Members Preview */}
              {teamMembers.length > 0 && (
                <Card>
                  <Text weight="medium" style={{ marginBottom: theme.spacing.sm }}>Team Members</Text>
                  <Column gap={theme.spacing.xs}>
                    {teamMembers.slice(0, 3).map((member, index) => (
                      <Row key={member.id} style={{ alignItems: 'center' }}>
                        <Text size="sm">👤</Text>
                        <Column style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                          <Text size="sm" weight="medium">{member.name}</Text>
                          <Text size="xs" color={theme.colors.text.secondary}>{member.role}</Text>
                        </Column>
                      </Row>
                    ))}
                    {teamMembers.length > 3 && (
                      <Text size="xs" color={theme.colors.text.secondary} style={{ textAlign: 'center' }}>
                        +{teamMembers.length - 3} more members
                      </Text>
                    )}
                  </Column>
                </Card>
              )}
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
                    <Text size="sm">{userTeams.length || user?.teams?.length || 0}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>Current Team:</Text>
                    <Text size="sm">{getTeamName()}</Text>
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

            {/* API Status */}
            <Column gap={theme.spacing.sm}>
              <Text weight="medium">API Status</Text>
              <Card>
                <Column gap={theme.spacing.sm}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>Real API:</Text>
                    <Text size="sm" color={theme.colors.warning}>
                      {refreshing ? 'Checking...' : 'Mock Mode'}
                    </Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>Supabase:</Text>
                    <Text size="sm" color={theme.colors.accent}>Connected</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text color={theme.colors.text.secondary}>Backend:</Text>
                    <Text size="sm" color={theme.colors.text.secondary}>flipflop.scanlyf.com</Text>
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
