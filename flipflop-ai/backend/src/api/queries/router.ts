import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import queryService from '../../services/query.js';
import { logger } from '../../index.js';
import { supabaseAdmin } from '../../services/supabase.js';

const router = Router();

// Validation schemas
const querySchema = z.object({
  question: z.string().min(1).max(500),
  context: z.object({
    timeRange: z.enum(['today', 'yesterday', 'last_week', 'last_month', 'all_time']).optional(),
    sources: z.array(z.string()).optional(),
    type: z.string().optional(),
  }).optional(),
});

const feedbackSchema = z.object({
  feedback: z.enum(['helpful', 'not_helpful', 'incorrect']),
  details: z.string().optional(),
});

// Process a natural language query
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const { question, context } = querySchema.parse(req.body);

    // Process the query
    const result = await queryService.processQuery(
      teamId,
      question,
      context
    );

    // Store the query for analytics
    const { data: query, error } = await supabaseAdmin
      .from('queries')
      .insert({
        user_id: req.user!.id,
        team_id: teamId,
        question,
        answer: result.answer,
        sources: result.sources,
        context,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to store query:', error);
    }

    logger.info(`Query processed for team ${teamId}: ${question.substring(0, 50)}...`);

    res.json({
      queryId: query?.id,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// Get user's recent queries
router.get('/recent', async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const { data: queries, error } = await supabaseAdmin
      .from('queries')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ queries: queries || [] });
  } catch (error) {
    next(error);
  }
});

// Provide feedback on a query
router.post('/:queryId/feedback', async (req: AuthRequest, res, next) => {
  try {
    const { queryId } = req.params;
    const { feedback, details } = feedbackSchema.parse(req.body);

    // Verify query belongs to user
    const { data: query, error: queryError } = await supabaseAdmin
      .from('queries')
      .select('user_id')
      .eq('id', queryId)
      .single();

    if (queryError || !query || query.user_id !== req.user!.id) {
      throw new AppError(404, 'Query not found');
    }

    // Update feedback
    const { error } = await supabaseAdmin
      .from('queries')
      .update({ 
        feedback,
        metadata: {
          feedbackDetails: details,
        }
      })
      .eq('id', queryId);

    if (error) throw error;

    logger.info(`Feedback received for query ${queryId}: ${feedback}`);

    res.json({ message: 'Feedback recorded successfully' });
  } catch (error) {
    next(error);
  }
});

// Get popular queries for the team
router.get('/popular', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    // Get popular queries from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: queries, error } = await supabaseAdmin
      .from('queries')
      .select('question')
      .eq('team_id', teamId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(100);

    if (error) throw error;

    // Count frequency of similar queries
    const questionCounts = new Map<string, number>();
    queries?.forEach((q: any) => {
      // Simple normalization - in production, use NLP for better grouping
      const normalized = q.question.toLowerCase().trim();
      questionCounts.set(normalized, (questionCounts.get(normalized) || 0) + 1);
    });

    // Sort by frequency and get top 10
    const popular = Array.from(questionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }));

    res.json({ popularQueries: popular });
  } catch (error) {
    next(error);
  }
});

// Get suggested queries based on context
router.get('/suggestions', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const suggestions = await queryService.getSuggestions(teamId);

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

export default router;