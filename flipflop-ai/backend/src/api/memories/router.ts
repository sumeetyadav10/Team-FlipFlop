import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import memoryService from '../../services/memory.js';
import { logger } from '../../index.js';

const router = Router();

// Validation schemas
const searchMemoriesSchema = z.object({
  q: z.string().optional(),
  type: z.enum(['decision', 'action_item', 'discussion', 'document', 'meeting', 'other']).optional(),
  source: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
});

const createMemorySchema = z.object({
  content: z.string().min(1),
  type: z.enum(['decision', 'action_item', 'discussion', 'document', 'meeting', 'other']),
  source: z.string(),
  sourceId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email().optional(),
  }).optional(),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
  timestamp: z.string().datetime(),
  metadata: z.any().optional(),
});

// Search memories
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const params = searchMemoriesSchema.parse(req.query);

    const memories = await memoryService.searchMemories(
      teamId,
      params.q || '',
      {
        type: params.type,
        source: params.source,
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        endDate: params.endDate ? new Date(params.endDate) : undefined,
        limit: params.limit,
      }
    );

    res.json({ memories });
  } catch (error) {
    next(error);
  }
});

// Get memory by ID
router.get('/:memoryId', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const { memoryId } = req.params;

    const memory = await memoryService.getMemoryById(memoryId, teamId);
    if (!memory) {
      throw new AppError(404, 'Memory not found');
    }

    res.json({ memory });
  } catch (error) {
    next(error);
  }
});

// Create memory (manual)
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const data = createMemorySchema.parse(req.body);

    await memoryService.createMemory({
      teamId,
      content: data.content || '',
      type: data.type || 'other',
      source: data.source || 'manual',
      timestamp: new Date(data.timestamp),
      author: data.author,
      sourceId: data.sourceId,
      sourceUrl: data.sourceUrl,
      participants: data.participants,
      metadata: data.metadata,
    });

    logger.info(`Manual memory created for team ${teamId}`);

    res.status(201).json({ message: 'Memory created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update memory
router.patch('/:memoryId', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const { memoryId } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = ['type', 'metadata'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    const memory = await memoryService.updateMemory(memoryId, teamId, filteredUpdates);

    res.json({ memory });
  } catch (error) {
    next(error);
  }
});

// Delete memory
router.delete('/:memoryId', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const { memoryId } = req.params;

    await memoryService.deleteMemory(memoryId, teamId);

    logger.info(`Memory ${memoryId} deleted from team ${teamId}`);

    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get team memory stats
router.get('/stats/summary', async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const stats = await memoryService.getTeamStats(teamId);

    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

export default router;