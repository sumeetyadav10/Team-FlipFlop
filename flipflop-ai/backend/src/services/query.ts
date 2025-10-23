import OpenAI from 'openai';
import { supabaseAdmin } from './supabase.js';
import memoryService from './memory.js';
// import embeddingService from './embedding.js';
import { logger } from '../index.js';

interface QueryResult {
  answer: string;
  sources: any[];
  confidence: number;
  processingTime: number;
}

interface QueryContext {
  timeRange?: string;
  sources?: string[];
  type?: string;
}

class QueryService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async processQuery(
    teamId: string,
    question: string,
    context?: QueryContext
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // Step 1: Search for relevant memories
      const memories = await this.searchRelevantMemories(teamId, question, context);

      if (memories.length === 0) {
        return {
          answer: "I couldn't find any information related to your question in the team's memory.",
          sources: [],
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }

      // Step 2: Generate answer using GPT
      const answer = await this.generateAnswer(question, memories, context);

      // Step 3: Extract and format sources
      const sources = this.formatSources(memories.slice(0, 5));

      return {
        answer,
        sources,
        confidence: this.calculateConfidence(memories),
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Query processing error:', error);
      throw error;
    }
  }

  private async searchRelevantMemories(
    teamId: string,
    question: string,
    context?: QueryContext
  ): Promise<any[]> {
    // Parse time range
    const dateRange = this.parseTimeRange(context?.timeRange);

    // Search memories
    const memories = await memoryService.searchMemories(teamId, question, {
      type: context?.type as any,
      source: context?.sources?.[0],
      startDate: dateRange.start,
      endDate: dateRange.end,
      limit: 20,
    });

    return memories;
  }

  private parseTimeRange(timeRange?: string): { start?: Date; end?: Date } {
    if (!timeRange) return {};

    const now = new Date();
    const result: { start?: Date; end?: Date } = { end: now };

    switch (timeRange) {
      case 'today':
        result.start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        result.start = new Date(yesterday.setHours(0, 0, 0, 0));
        result.end = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case 'last_week':
        result.start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'last_month':
        result.start = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    return result;
  }

  private async generateAnswer(
    question: string,
    memories: any[],
    _context?: QueryContext
  ): Promise<string> {
    // Prepare context for GPT
    const memoryContext = memories
      .map((m: any, i: number) => {
        const author = m.author?.name || 'Unknown';
        const date = new Date(m.timestamp).toLocaleDateString();
        return `[${i + 1}] ${m.type} from ${m.source} by ${author} on ${date}:\n${m.content}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an AI assistant helping teams recall information from their collective memory. 
Answer questions based on the provided context. Be specific and cite sources when possible.
If the context doesn't contain enough information, say so clearly.`;

    const userPrompt = `Question: ${question}

Context from team memory:
${memoryContext}

Please provide a clear, concise answer based on the context above. Reference specific sources by their numbers [1], [2], etc.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0].message.content || 'Unable to generate answer';
  }

  private formatSources(memories: any[]): any[] {
    return memories.map((m: any) => ({
      id: m.id,
      type: m.source,
      timestamp: m.timestamp,
      author: m.author,
      content: m.content.substring(0, 200) + '...',
      url: m.source_url,
    }));
  }

  private calculateConfidence(memories: any[]): number {
    // Simple confidence calculation based on number and relevance of sources
    if (memories.length === 0) return 0;
    if (memories.length >= 5) return 0.9;
    if (memories.length >= 3) return 0.75;
    if (memories.length >= 2) return 0.6;
    return 0.4;
  }

  async getSuggestions(teamId: string): Promise<string[]> {
    // Get recent team activity
    const { data: recentMemories } = await supabaseAdmin
      .from('memories')
      .select('type, source')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Generate contextual suggestions
    const suggestions = [
      'What were the key decisions from this week?',
      'Show me all action items assigned to me',
      'What did we decide about the project timeline?',
      'What tools did the team recommend?',
      'Show me the latest updates from Slack',
    ];

    // Add type-specific suggestions based on recent activity
    const hasDecisions = recentMemories?.some((m: any) => m.type === 'decision');
    const hasActionItems = recentMemories?.some((m: any) => m.type === 'action_item');

    if (hasDecisions) {
      suggestions.push('What decisions were made yesterday?');
    }
    if (hasActionItems) {
      suggestions.push('What are the pending action items?');
    }

    return suggestions.slice(0, 5);
  }
}

export default new QueryService();