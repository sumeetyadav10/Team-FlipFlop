import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Container, Text, Button, ButtonText, Input, Card, Column, Row } from '../../components/common/Styled';
import { theme } from '../../utils/theme';

export const SearchScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Container style={{ padding: theme.spacing.md }}>
        <Column gap={theme.spacing.lg}>
          <Text size="xl" weight="bold">🔍 Smart Search</Text>
          
          {/* Search Bar */}
          <Input placeholder="Search your team's knowledge..." />
          
          {/* Quick Filters */}
          <Column gap={theme.spacing.sm}>
            <Text weight="medium">Quick Filters</Text>
            <Row gap={theme.spacing.sm} style={{ flexWrap: 'wrap' }}>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">Yesterday</ButtonText>
              </Button>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">Last Week</ButtonText>
              </Button>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">Decisions</ButtonText>
              </Button>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">Action Items</ButtonText>
              </Button>
            </Row>
          </Column>

          {/* Source Filters */}
          <Column gap={theme.spacing.sm}>
            <Text weight="medium">Sources</Text>
            <Row gap={theme.spacing.sm} style={{ flexWrap: 'wrap' }}>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">💬 Slack</ButtonText>
              </Button>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">📝 Notion</ButtonText>
              </Button>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">📧 Email</ButtonText>
              </Button>
              <Button size="sm" variant="outline">
                <ButtonText variant="outline" size="sm">📄 Documents</ButtonText>
              </Button>
            </Row>
          </Column>

          {/* Recent Searches */}
          <Column gap={theme.spacing.sm}>
            <Text weight="medium">Recent Searches</Text>
            <Card>
              <Text>"What tools did the team reject?"</Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fonts.sizes.sm }}>
                2 hours ago
              </Text>
            </Card>
            <Card>
              <Text>"Show me Sarah's recommendations"</Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fonts.sizes.sm }}>
                Yesterday
              </Text>
            </Card>
          </Column>

          <Text 
            style={{ 
              textAlign: 'center', 
              color: theme.colors.text.secondary, 
              fontSize: theme.fonts.sizes.sm,
              marginTop: theme.spacing.xl 
            }}
          >
            Phase 6: Advanced search will be implemented
          </Text>
        </Column>
      </Container>
    </SafeAreaView>
  );
};