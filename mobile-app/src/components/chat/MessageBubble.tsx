import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Text, Column, Row } from '../common/Styled';
import { theme } from '../../utils/theme';
import { Message } from '../../types';
import { ChatStackParamList } from '../../types';

type NavigationProp = StackNavigationProp<ChatStackParamList>;

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const navigation = useNavigation<NavigationProp>();
  const isUser = message.type === 'user';

  const handleSourcePress = (sourceId: string) => {
    navigation.navigate('SourceDetail', { sourceId });
  };

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
          {message.content}
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
});