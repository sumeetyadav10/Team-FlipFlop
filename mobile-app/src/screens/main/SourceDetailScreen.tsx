import React from 'react';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Text, Card, Column, Row, Button, ButtonText } from '../../components/common/Styled';
import { theme } from '../../utils/theme';
import { ChatStackParamList, Source } from '../../types';
import { useChatStore } from '../../stores/chatStore';

type SourceDetailRouteProp = RouteProp<ChatStackParamList, 'SourceDetail'>;
type SourceDetailNavigationProp = StackNavigationProp<ChatStackParamList, 'SourceDetail'>;

// Mock source data - in real app, this would come from the API
const mockSourceDetails: Record<string, Source> = {
  'src1': {
    id: 'src1',
    type: 'slack',
    title: 'Engineering Channel Discussion',
    content: `@sarah: After comparing all options, I think Stripe is our best bet for payment processing. The API is well-documented and developer-friendly.

@mike: Agreed! I've used Stripe before and their documentation is excellent. Plus, they handle PCI compliance for us.

@john: What about the fees? Are they competitive?

@sarah: Yes, their fees are 2.9% + 30¢ per transaction, which is standard for the industry. PayPal charges similar rates but with less flexibility.

@mike: One thing I like about Stripe is their testing environment. It's really easy to test different scenarios.

@sarah: Should we schedule a demo with their team?

@john: Good idea. Let me reach out to them this week.`,
    url: 'https://slack.com/channels/engineering',
    timestamp: new Date('2024-01-15T14:30:00'),
    author: 'Sarah Johnson',
    channel: '#engineering',
  },
  'src2': {
    id: 'src2',
    type: 'notion',
    title: 'Payment Gateway Decision Log',
    content: `# Payment Gateway Decision

## Overview
After evaluating multiple payment processing solutions, we have decided to integrate Stripe as our primary payment gateway.

## Evaluation Criteria
- Developer Experience
- Documentation Quality
- Security & Compliance
- Pricing Structure
- International Support
- Integration Complexity

## Options Considered

### Stripe ✅ SELECTED
**Pros:**
- Excellent API design and documentation
- Comprehensive dashboard
- Built-in PCI compliance
- Strong developer community
- Supports international payments
- Robust testing environment

**Cons:**
- Slightly higher fees for international transactions
- Limited customization for hosted checkout

### PayPal
**Pros:**
- Widely recognized brand
- Good mobile integration
- Buyer protection

**Cons:**
- Less developer-friendly API
- Limited customization options
- Higher dispute rates

### Square
**Pros:**
- Good for in-person payments
- Competitive pricing

**Cons:**
- Limited online payment features
- Weaker API documentation

## Decision
**Selected:** Stripe
**Timeline:** 2-3 weeks for full integration
**Next Steps:** 
1. Set up Stripe account
2. Implement basic payment flow
3. Add webhook handlers
4. Testing & security review`,
    url: 'https://notion.so/payment-gateway-decision',
    timestamp: new Date('2024-01-15T15:45:00'),
    author: 'Sarah Johnson',
  },
  'src3': {
    id: 'src3',
    type: 'email',
    title: 'Re: Payment Integration Timeline',
    content: `From: mike.chen@company.com
To: engineering-team@company.com
Subject: Re: Payment Integration Timeline

Hi team,

Following up on our discussion about payment integration. Based on Sarah's research and our team discussion, here's the implementation timeline for Stripe integration:

Week 1:
- Set up Stripe account and development environment
- Implement basic payment form UI
- Set up webhook endpoints

Week 2:
- Integrate payment processing logic
- Add error handling and validation
- Implement subscription billing (if needed)

Week 3:
- Security review and testing
- Load testing with test transactions
- Documentation and deployment

I estimate we'll need approximately 40-50 hours of development time across the team. Let me know if you have any questions or concerns about this timeline.

The main risks I see are:
1. Webhook reliability - we'll need robust error handling
2. PCI compliance verification
3. International payment testing

Let's schedule a kickoff meeting for next Monday to go over the technical implementation details.

Best,
Mike

--
Mike Chen
Senior Software Engineer
Engineering Team`,
    timestamp: new Date('2024-01-15T16:20:00'),
    author: 'Mike Chen',
  },
};

export const SourceDetailScreen = () => {
  const route = useRoute<SourceDetailRouteProp>();
  const navigation = useNavigation<SourceDetailNavigationProp>();
  const { sourceId } = route.params;
  
  const source = mockSourceDetails[sourceId];

  if (!source) {
    return (
      <Container style={{ padding: theme.spacing.md, justifyContent: 'center', alignItems: 'center' }}>
        <Text size="lg" weight="bold">Source Not Found</Text>
        <Text style={{ marginTop: theme.spacing.sm }}>
          The requested source could not be loaded.
        </Text>
        <Button 
          style={{ marginTop: theme.spacing.lg }}
          onPress={() => navigation.goBack()}
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
      </Container>
    );
  }

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'slack': return '💬';
      case 'notion': return '📝';
      case 'email': return '📧';
      case 'document': return '📄';
      default: return '📎';
    }
  };

  const getSourceTypeName = (type: string) => {
    switch (type) {
      case 'slack': return 'Slack';
      case 'notion': return 'Notion';
      case 'email': return 'Email';
      case 'document': return 'Document';
      default: return 'Source';
    }
  };

  const handleOpenInApp = () => {
    if (source.url) {
      Linking.openURL(source.url).catch(() => {
        // Handle error silently or show alert
      });
    }
  };

  return (
    <Container>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.md }}>
        {/* Source Header */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Row gap={theme.spacing.sm} style={{ marginBottom: theme.spacing.md }}>
            <Text size="lg">{getSourceIcon(source.type)}</Text>
            <Column style={{ flex: 1 }}>
              <Text weight="medium" color={theme.colors.text.secondary}>
                {getSourceTypeName(source.type)}
                {source.channel && ` - ${source.channel}`}
              </Text>
              <Text size="lg" weight="bold">{source.title}</Text>
            </Column>
          </Row>
          
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Column>
              <Text size="sm" color={theme.colors.text.secondary}>
                By {source.author}
              </Text>
              <Text size="sm" color={theme.colors.text.secondary}>
                {source.timestamp.toLocaleDateString()} at {source.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Column>
            
            {source.url && (
              <Button size="sm" onPress={handleOpenInApp}>
                <ButtonText size="sm">Open in App</ButtonText>
              </Button>
            )}
          </Row>
        </Card>

        {/* Source Content */}
        <Card>
          <Text style={{ lineHeight: 24 }}>
            {source.content}
          </Text>
        </Card>
      </ScrollView>
    </Container>
  );
};