import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Column, Row, Card } from '../common/Styled';
import { theme } from '../../utils/theme';
import { TimelineEvent } from '../../types';

interface TimelineProps {
  events: TimelineEvent[];
  onEventPress?: (event: TimelineEvent) => void;
}

interface TimelineItemProps {
  event: TimelineEvent;
  isLast: boolean;
  onPress?: (event: TimelineEvent) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ event, isLast, onPress }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'decision': return '⚡';
      case 'discussion': return '💬';
      case 'milestone': return '🎯';
      case 'question': return '❓';
      default: return '📝';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'decision': return theme.colors.primary;
      case 'discussion': return theme.colors.success;
      case 'milestone': return theme.colors.warning;
      case 'question': return theme.colors.secondary;
      default: return theme.colors.text.secondary;
    }
  };

  return (
    <Row style={styles.timelineItem}>
      {/* Timeline Line */}
      <Column style={styles.timelineTrack}>
        <View style={[styles.timelineNode, { backgroundColor: getEventColor(event.type) }]}>
          <Text style={styles.timelineIcon}>{getEventIcon(event.type)}</Text>
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </Column>

      {/* Event Content */}
      <TouchableOpacity 
        style={styles.eventCard} 
        onPress={() => onPress?.(event)}
        activeOpacity={0.7}
      >
        <Card style={{ marginBottom: 0 }}>
          <Column gap={theme.spacing.sm}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text weight="medium" style={{ flex: 1 }}>
              {event.title}
            </Text>
            <Text size="xs" color={theme.colors.text.secondary}>
              {event.timestamp.toLocaleDateString()}
            </Text>
          </Row>
          
          <Text size="sm" color={theme.colors.text.secondary} numberOfLines={2}>
            {event.description}
          </Text>

          {event.participants.length > 0 && (
            <Row gap={theme.spacing.xs} style={{ flexWrap: 'wrap' }}>
              <Text size="xs" color={theme.colors.text.secondary}>Participants:</Text>
              {event.participants.slice(0, 3).map((participant: string, index: number) => (
                <View key={index} style={styles.participantTag}>
                  <Text size="xs" color={theme.colors.primary}>
                    {participant}
                  </Text>
                </View>
              ))}
              {event.participants.length > 3 && (
                <Text size="xs" color={theme.colors.text.secondary}>
                  +{event.participants.length - 3} more
                </Text>
              )}
            </Row>
          )}

          {event.sources.length > 0 && (
            <Text size="xs" color={theme.colors.text.secondary}>
              📎 {event.sources.length} source{event.sources.length > 1 ? 's' : ''}
            </Text>
            )}
          </Column>
        </Card>
      </TouchableOpacity>
    </Row>
  );
};export const Timeline: React.FC<TimelineProps> = ({ events, onEventPress }) => {
  if (events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text size="lg" color={theme.colors.text.secondary} style={{ textAlign: 'center' }}>
          📅 No timeline events yet
        </Text>
        <Text size="sm" color={theme.colors.text.secondary} style={{ textAlign: 'center' }}>
          Start a conversation to see decisions and milestones
        </Text>
      </View>
    );
  }

  // Sort events by timestamp (most recent first)
  const sortedEvents = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Column gap={theme.spacing.xs}>
        <Text size="lg" weight="bold" style={styles.title}>
          📅 Timeline
        </Text>
        {sortedEvents.map((event, index) => (
          <TimelineItem
            key={event.id}
            event={event}
            isLast={index === sortedEvents.length - 1}
            onPress={onEventPress}
          />
        ))}
      </Column>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  timelineItem: {
    marginBottom: theme.spacing.sm,
  },
  timelineTrack: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
    width: 24,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineIcon: {
    fontSize: 12,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    minHeight: 40,
  },
  eventCard: {
    flex: 1,
    marginBottom: theme.spacing.xs,
  },
  participantTag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
});