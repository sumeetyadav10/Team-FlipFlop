import React, { useEffect, useRef, useCallback } from 'react';
import { FlatList, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { Container, Text, Row } from '../../components/common/Styled';
import { MessageBubble, Suggestions, TypingIndicator } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { theme } from '../../utils/theme';

export const ChatScreen = () => {
  const { team } = useAuthStore();
  const { 
    messages, 
    isLoading, 
    currentQuery, 
    sendMessage, 
    setCurrentQuery, 
    loadMoreMessages,
    setCurrentTeam
  } = useChatStore();
  
  const flatListRef = useRef<FlatList>(null);

  // Set current team when component mounts
  useEffect(() => {
    if (team?.id) {
      setCurrentTeam(team.id);
    }
  }, [team?.id, setCurrentTeam]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (team?.id && text.trim().length > 0) {
      await sendMessage(text, team.id);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    if (team?.id) {
      sendMessage(suggestion, team.id);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (team?.id) {
      await loadMoreMessages(team.id);
    }
  }, [team?.id, loadMoreMessages]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'suggestion') {
      return (
        <Suggestions
          suggestions={item.suggestions}
          onSuggestionPress={handleSuggestionPress}
        />
      );
    }
    if (item.type === 'indicator') {
      return <TypingIndicator />;
    }
    return <MessageBubble message={item} />;
  };

  const lastAssistantMessage = messages
    .slice()
    .reverse()
    .find(msg => msg.type === 'assistant');

  const listData = [
    ...messages,
    ...(isLoading ? [{ id: 'typing-indicator', type: 'indicator' }] : []),
    ...(lastAssistantMessage?.suggestions && !isLoading
      ? [{ id: 'suggestions-section', type: 'suggestion', suggestions: lastAssistantMessage.suggestions }]
      : []),
  ];

  const keyExtractor = (item: any, index: number) => {
    if (item.type === 'indicator') {
      return `typing-indicator-${index}`;
    }
    if (item.type === 'suggestion') {
      return `suggestions-section-${index}`;
    }
    const base = item?.id ?? (item?.timestamp ? String(item.timestamp) : 'message');
    return `${base}-${index}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Container>
          {/* Header */}
          <Row style={{ 
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            backgroundColor: 'transparent', // Make header transparent
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text size="lg" weight="bold" style={{ color: theme.colors.primary }}>FlipFlop</Text>
            <Row gap={theme.spacing.sm} style={{ alignItems: 'center' }}>
              <Text weight="medium" color={theme.colors.text.secondary}>{team?.name || 'Engineering'}</Text>
              {/* Replace with an actual icon */}
              <Text size="xl" weight="bold" color={theme.colors.primary}>≡</Text>
            </Row>
          </Row>

          {/* Chat Messages */}
          <FlatList
            ref={flatListRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm }}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />

          {/* Chat Input */}
          <ChatInput
            value={currentQuery}
            onChangeText={setCurrentQuery}
            onSendMessage={handleSendMessage}
            disabled={isLoading || !team?.id}
          />
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};