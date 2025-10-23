import React, { useEffect, useRef, useCallback } from 'react';
import { FlatList, RefreshControl, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { Container, Text, Row } from '../../components/common/Styled';
import { MessageBubble, Suggestions, TypingIndicator } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { Timeline } from '../../components/chat/Timeline';
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
    setCurrentTeam,
    timelineEvents,
    showTimeline,
    toggleTimeline,
    loadTimelineEvents
  } = useChatStore();
  
  const flatListRef = useRef<FlatList>(null);

  // Set current team when component mounts
  useEffect(() => {
    console.log('🏢 ChatScreen: Team effect triggered, team:', team);
    if (team?.id) {
      console.log('✅ ChatScreen: Setting current team:', team.id);
      setCurrentTeam(team.id);
      if (typeof loadTimelineEvents === 'function') {
        loadTimelineEvents(team.id);
      } else {
        console.warn('⚠️ ChatScreen: loadTimelineEvents is undefined');
      }
    } else {
      console.log('❌ ChatScreen: No team ID available');
    }
  }, [team?.id, setCurrentTeam, loadTimelineEvents]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    console.log('🚀 ChatScreen handleSendMessage called with:', text);
    console.log('🔍 Team ID:', team?.id);
    
    if (team?.id && text.trim().length > 0) {
      console.log('✅ Sending message to chat store');
      await sendMessage(text, team.id);
    } else {
      console.log('❌ Cannot send message - missing team ID or empty text');
      console.log('Team:', team);
      console.log('Text length:', text.trim().length);
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
      <Container>
        {/* Header */}
        <Row style={{ 
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          backgroundColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text size="lg" weight="bold" style={{ color: theme.colors.primary }}>FlipFlop</Text>
          <Row gap={theme.spacing.sm} style={{ alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => {
                if (typeof toggleTimeline === 'function') {
                  toggleTimeline();
                } else {
                  console.warn('⚠️ ChatScreen: toggleTimeline is undefined');
                }
              }}
              style={{
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.md,
                backgroundColor: showTimeline ? theme.colors.primary : theme.colors.surface,
              }}
            >
              <Text 
                size="xs" 
                weight="medium"
                color={showTimeline ? theme.colors.text.inverse : theme.colors.text.primary}
              >
                {showTimeline ? '💬' : '📅'}
              </Text>
            </TouchableOpacity>
            <Text weight="medium" color={theme.colors.text.secondary}>{team?.name || 'Engineering'}</Text>
            <Text size="xl" weight="bold" color={theme.colors.primary}>≡</Text>
          </Row>
        </Row>

        {/* Content */}
        {showTimeline ? (
          <Timeline 
            events={timelineEvents} 
            onEventPress={(event) => {
              console.log('Timeline event pressed:', event.title);
              // Switch back to chat view when timeline event is pressed
              toggleTimeline();
            }}
          />
        ) : (
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            {/* Chat Messages */}
            <FlatList
              ref={flatListRef}
              data={listData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              style={{ flex: 1 }}
              contentContainerStyle={{ 
                paddingHorizontal: theme.spacing.md, 
                paddingTop: theme.spacing.md, 
                paddingBottom: theme.spacing.sm,
                flexGrow: 1
              }}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary}
                />
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />

            {/* Chat Input */}
            <ChatInput
              value={currentQuery}
              onChangeText={(text) => {
                console.log('📝 ChatScreen received text change:', text);
                setCurrentQuery(text);
              }}
              onSendMessage={handleSendMessage}
              disabled={isLoading || !team?.id}
            />
          </KeyboardAvoidingView>
        )}
      </Container>
    </SafeAreaView>
  );
};

// Also export as default to avoid import mismatches (named vs default)
export default ChatScreen;