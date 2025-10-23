import React from 'react';
import { TouchableOpacity, TextInput, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Row } from '../common/Styled';
import { theme } from '../../utils/theme';
import { Feather } from '@expo/vector-icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  value: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  value,
  onChangeText,
  disabled = false,
}) => {
  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSendMessage(value.trim());
      onChangeText(''); // Clear input after sending
    }
  };

  return (
    <View style={styles.container}>
      <Row style={styles.row}>
        {/* Attachment Button */}
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="paperclip" size={22} color={theme.colors.text.secondary} />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder="Ask FlipFlop..."
          placeholderTextColor={theme.colors.text.secondary}
          value={value}
          onChangeText={onChangeText}
          multiline
          editable={!disabled}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, { backgroundColor: (!value.trim() || disabled) ? theme.colors.surface : theme.colors.primary }]}
          disabled={!value.trim() || disabled}
        >
          {disabled && value.trim() ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Feather name="arrow-up" size={22} color={theme.colors.text.inverse} />
          )}
        </TouchableOpacity>
      </Row>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  row: {
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.text.primary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconButton: {
    padding: theme.spacing.sm,
  },
  sendButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
});