import React from 'react';
import { TouchableOpacity, View, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Text, Column, Row } from '../common/Styled';
import { theme } from '../../utils/theme';
import { Message, MessageAction } from '../../types';
import { ChatStackParamList } from '../../types';

type NavigationProp = StackNavigationProp<ChatStackParamList>;

interface MessageBubbleProps {
  message: Message;
}

const formatMessageContent = (content: string) => {
  // Enhanced formatting for team member mentions and emphasis
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold formatting for display
    .split(/(\*\*.*?\*\*)/)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const name = part.slice(2, -2);
        return (
          <Text key={index} style={styles.teamMemberMention}>
            {name}
          </Text>
        );
      }
      return part;
    });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const navigation = useNavigation<NavigationProp>();
  const isUser = message.type === 'user';

  const handleSourcePress = (sourceId: string) => {
    navigation.navigate('SourceDetail', { sourceId });
  };

  const handleActionPress = (action: MessageAction) => {
    console.log('🎯 Action pressed:', action.type, action.label);
    
    if (action.url) {
      // Open external URL
      Linking.openURL(action.url).catch(err => {
        console.error('❌ Failed to open URL:', err);
        Alert.alert('Error', 'Could not open the link');
      });
    } else if (action.action) {
      // Execute custom action
      action.action();
    } else {
      // Default actions based on type
      switch (action.type) {
        case 'notion':
          Alert.alert('Notion', 'Open this in Notion workspace');
          break;
        case 'slack':
          Alert.alert('Slack', 'Navigate to Slack channel');
          break;
        case 'calendar':
          Alert.alert('Calendar', 'Schedule a meeting about this topic');
          break;
        case 'meet':
          Alert.alert('Meet', 'Start a Google Meet about this');
          break;
        case 'email':
          Alert.alert('Email', 'Send email about this discussion');
          break;
        case 'search':
          Alert.alert('Search', 'Search for more information');
          break;
        case 'share':
          Alert.alert('Share', 'Share this message');
          break;
        default:
          Alert.alert('Action', `${action.label} clicked`);
      }
    }
  };

  const generateSmartActions = (message: Message): MessageAction[] => {
    const actions: MessageAction[] = [];
    const content = message.content.toLowerCase();

    // Based on message content, suggest relevant actions
    if (content.includes('meeting') || content.includes('schedule') || content.includes('calendar')) {
      actions.push({
        id: 'calendar',
        type: 'calendar',
        label: 'Schedule',
        icon: '📅',
        action: () => Alert.alert('Calendar', 'Schedule a meeting about: ' + message.content.substring(0, 50) + '...')
      });
    }

    if (content.includes('document') || content.includes('note') || content.includes('write')) {
      actions.push({
        id: 'notion',
        type: 'notion',
        label: 'Notion',
        icon: '📝',
        action: () => Alert.alert('Notion', 'Create a Notion page for this topic')
      });
    }

    if (content.includes('team') || content.includes('discuss') || content.includes('chat')) {
      actions.push({
        id: 'slack',
        type: 'slack',
        label: 'Slack',
        icon: '💬',
        action: () => Alert.alert('Slack', 'Continue this discussion in Slack')
      });
    }

    if (content.includes('video') || content.includes('call') || content.includes('meet')) {
      actions.push({
        id: 'meet',
        type: 'meet',
        label: 'Meet',
        icon: '🎥',
        action: () => Alert.alert('Google Meet', 'Start a video call about this topic')
      });
    }

    // Based on sources, add relevant actions
    if (message.sources) {
      message.sources.forEach(source => {
        switch (source.type) {
          case 'slack':
            if (!actions.find(a => a.type === 'slack')) {
              actions.push({
                id: 'slack-source',
                type: 'slack',
                label: 'Open in Slack',
                icon: '💬',
                url: source.url
              });
            }
            break;
          case 'notion':
            if (!actions.find(a => a.type === 'notion')) {
              actions.push({
                id: 'notion-source',
                type: 'notion',
                label: 'Open in Notion',
                icon: '📝',
                url: source.url
              });
            }
            break;
          case 'email':
            actions.push({
              id: 'email-source',
              type: 'email',
              label: 'View Email',
              icon: '📧',
              url: source.url
            });
            break;
        }
      });
    }

    // Always add search and share for assistant messages
    if (message.type === 'assistant') {
      actions.push({
        id: 'search',
        type: 'search',
        label: 'Search More',
        icon: '🔍',
        action: () => Alert.alert('Search', 'Search for more information about this topic')
      });

      actions.push({
        id: 'share',
        type: 'share',
        label: 'Share',
        icon: '📤',
        action: () => Alert.alert('Share', 'Share this message with team members')
      });
    }

    return actions.slice(0, 4); // Limit to 4 actions to avoid clutter
  };

  const smartActions = message.actionButtons || generateSmartActions(message);

  return (
    <View style={[
      styles.messageContainer,
      isUser ? styles.userMessageContainer : styles.assistantMessageContainer
    ]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text color={isUser ? theme.colors.text.inverse : theme.colors.text.primary}>
          {typeof message.content === 'string' ? formatMessageContent(message.content) : message.content}
        </Text>

        {message.sources && message.sources.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSourcePress(message.sources![0].id)}
            style={styles.sourceContainer}
          >
            <Text
              size="sm"
              color={isUser ? theme.colors.text.inverse : theme.colors.text.secondary}
              style={styles.sourceText}
            >
              📎 {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        {smartActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Row gap={theme.spacing.xs} style={styles.actionsRow}>
              {smartActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  onPress={() => handleActionPress(action)}
                  style={[
                    styles.actionButton,
                    isUser ? styles.userActionButton : styles.assistantActionButton
                  ]}
                >
                  <Text size="xs" style={styles.actionIcon}>
                    {action.icon}
                  </Text>
                  <Text 
                    size="xs" 
                    color={isUser ? theme.colors.text.inverse : theme.colors.primary}
                    style={styles.actionLabel}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Row>
          </View>
        )}
        
        <Text
          size="xs"
          color={isUser ? theme.colors.text.inverse : theme.colors.text.secondary}
          style={styles.timestamp}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

interface SuggestionsProps {
  suggestions: string[];
  onSuggestionPress: (suggestion: string) => void;
}

export const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, onSuggestionPress }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Column gap={theme.spacing.xs} style={styles.suggestionsContainer}>
      <Text size="sm" color={theme.colors.text.secondary} style={styles.suggestionTitle}>
        Suggestions:
      </Text>
      {suggestions.slice(0, 3).map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onSuggestionPress(suggestion)}
          style={styles.suggestionBubble}
        >
          <Text size="sm" color={theme.colors.primary}>
            {suggestion}
          </Text>
        </TouchableOpacity>
      ))}
    </Column>
  );
};

export const TypingIndicator: React.FC = () => {
  return (
    <View style={[styles.messageContainer, styles.assistantMessageContainer]}>
      <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
        <Row gap={theme.spacing.xs} style={{ alignItems: 'center' }}>
          <Text color={theme.colors.text.secondary}>💭</Text>
          <Text color={theme.colors.text.secondary} style={{ fontStyle: 'italic' }}>
            FlipFlop is thinking...
          </Text>
        </Row>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: theme.spacing.xs,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.primary, // Vibrant Blue for user
    borderBottomRightRadius: theme.borderRadius.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.borderRadius.sm,
  },
  sourceContainer: {
    marginTop: theme.spacing.sm,
  },
  sourceText: {
    fontStyle: 'italic',
    opacity: 0.8,
  },
  actionsContainer: {
    marginTop: theme.spacing.sm,
  },
  actionsRow: {
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.xs,
  },
  userActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  assistantActionButton: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  actionIcon: {
    marginRight: theme.spacing.xs,
  },
  actionLabel: {
    fontWeight: '500',
  },
  timestamp: {
    marginTop: theme.spacing.xs,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  suggestionsContainer: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    marginLeft: theme.spacing.md,
  },
  suggestionTitle: {
    fontStyle: 'italic',
    marginBottom: theme.spacing.xs,
  },
  suggestionBubble: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typingBubble: {
    paddingVertical: theme.spacing.sm,
  },
  teamMemberMention: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});