import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { Message } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../utils/theme';
import { Feather } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuthStore.getState();
  const isUserMessage = message.user_id === user?.id;

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const senderName = isUserMessage ? 'You' : message.sender_name || 'FlipFlop';
  const avatarText = getInitials(isUserMessage ? user?.user_metadata.full_name : message.sender_name);

  return (
    <View style={[styles.messageRow, isUserMessage ? styles.userMessageRow : styles.botMessageRow]}>
      {!isUserMessage && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUserMessage ? styles.userMessageBubble : styles.botMessageBubble,
        ]}
      >
        <Text style={styles.senderName}>{senderName}</Text>
        <Text style={isUserMessage ? styles.userMessageText : styles.botMessageText}>
          {message.content}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginVertical: theme.spacing.sm,
    maxWidth: '85%',
  },
  userMessageRow: {
    alignSelf: 'flex-end',
    marginLeft: '15%',
  },
  botMessageRow: {
    alignSelf: 'flex-start',
    marginRight: '15%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    color: theme.colors.text.inverse,
    fontWeight: 'bold',
  },
  messageBubble: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
  },
  userMessageBubble: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 5,
  },
  botMessageBubble: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 5,
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.secondary,
  },
  userMessageText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.text.inverse,
  },
  botMessageText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.text.primary,
  },
  timestamp: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.text.secondary,
    alignSelf: 'flex-end',
    marginTop: theme.spacing.xs,
  },
});