import { supabaseAdmin } from './supabase.js';
import { logger } from '../index.js';
import { io } from '../index.js';
import embeddingService from './embedding.js';

export interface CreateMemoryData {
  teamId: string;
  content: string;
  type: 'decision' | 'action_item' | 'discussion' | 'document' | 'meeting' | 'other';
  source: string;
  sourceId?: string;
  sourceUrl?: string;
  author?: any;
  participants?: any[];
  timestamp: Date;
  metadata?: any;
}

class MemoryService {
  async createMemory(data: CreateMemoryData): Promise<any> {
    try {
      // Generate embedding for the content
      const embedding = await embeddingService.generateEmbedding(data.content);

      // Insert memory into database
      const { data: memory, error } = await supabaseAdmin
        .from('memories')
        .insert({
          team_id: data.teamId,
          content: data.content,
          content_vector: embedding,
          type: data.type,
          source: data.source,
          source_id: data.sourceId,
          source_url: data.sourceUrl,
          author: data.author,
          participants: data.participants,
          timestamp: data.timestamp.toISOString(),
          metadata: data.metadata,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Notify team members via WebSocket
      io.to(`team-${data.teamId}`).emit('new-memory', {
        id: memory.id,
        type: memory.type,
        source: memory.source,
        preview: memory.content.substring(0, 100) + '...',
        timestamp: memory.timestamp,
      });

      logger.info(`Memory created: ${memory.id} for team ${data.teamId}`);
      return memory;
    } catch (error) {
      logger.error('Failed to create memory:', error);
      throw error;
    }
  }

  async searchMemories(
    teamId: string,
    query: string,
    options: {
      limit?: number;
      type?: string;
      source?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any[]> {
    try {
      // Generate embedding for search query
      // const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Build the query
      let dbQuery = supabaseAdmin
        .from('memories')
        .select('*')
        .eq('team_id', teamId);

      // Apply filters
      if (options.type) {
        dbQuery = dbQuery.eq('type', options.type);
      }
      if (options.source) {
        dbQuery = dbQuery.eq('source', options.source);
      }
      if (options.startDate) {
        dbQuery = dbQuery.gte('timestamp', options.startDate.toISOString());
      }
      if (options.endDate) {
        dbQuery = dbQuery.lte('timestamp', options.endDate.toISOString());
      }

      // For now, we'll do a simple text search
      // In production, you'd use pgvector for semantic search
      dbQuery = dbQuery.textSearch('content', query);

      // Limit results
      dbQuery = dbQuery.limit(options.limit || 20);

      const { data: memories, error } = await dbQuery;

      if (error) {
        throw error;
      }

      return memories || [];
    } catch (error) {
      logger.error('Memory search error:', error);
      throw error;
    }
  }

  async getMemoryById(memoryId: string, teamId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('id', memoryId)
      .eq('team_id', teamId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateMemory(memoryId: string, teamId: string, updates: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('memories')
      .update(updates)
      .eq('id', memoryId)
      .eq('team_id', teamId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async deleteMemory(memoryId: string, teamId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }
  }

  async getTeamStats(teamId: string): Promise<any> {
    const { data: stats, error } = await supabaseAdmin
      .from('memories')
      .select('type')
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }

    // Count by type
    const typeCounts = stats?.reduce((acc: any, memory: any) => {
      acc[memory.type] = (acc[memory.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get recent activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: recentCount } = await supabaseAdmin
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', oneWeekAgo.toISOString());

    return {
      total: stats?.length || 0,
      byType: typeCounts,
      recentActivity: recentCount || 0,
    };
  }
}

export default new MemoryService();
export { MemoryService };