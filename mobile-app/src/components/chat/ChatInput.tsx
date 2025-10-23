import React from 'react';
import { TouchableOpacity, TextInput, View, StyleSheet } from 'react-native';
import { Row, Text } from '../common/Styled';
import { theme } from '../../utils/theme';

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
          style={[styles.sendButton, { opacity: (!value.trim() || disabled) ? 0.5 : 1 }]}
          disabled={!value.trim() || disabled}
        >
          <Text size="lg" color={theme.colors.text.inverse}>➤</Text>
        </TouchableOpacity>
      </Row>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'transparent', // Make input container transparent
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  row: {
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface, // Darker input background
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.text.primary,
    maxHeight: 120,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
});