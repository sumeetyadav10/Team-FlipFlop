import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { GitHubService } from '../../services/integrations/github.service.js';
import { supabaseAdmin } from '../../services/supabase.js';
import { queueService } from '../../services/queue.service.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const githubService = new GitHubService(supabaseAdmin);

/**
 * GitHub OAuth initiation
 */
router.get('/auth', authMiddleware, async (req: any, res, next) => {
  try {
    const teamId = req.query.team_id;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID required' });
    }

    const scope = 'repo,read:user,read:org';
    const state = `${teamId}:${req.user.id}`;
    
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${process.env.GITHUB_CLIENT_ID}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${encodeURIComponent(state)}`;

    return res.json({ authUrl });
  } catch (error) {
    return next(error);
  }
});

/**
 * GitHub OAuth callback
 */
router.post('/callback', authMiddleware, async (req: any, res, next) => {
  try {
    const { code, state } = req.body;
    const [teamId, userId] = state.split(':');

    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Invalid state parameter' });
    }

    await githubService.handleCallback(code);

    // Queue initial sync
    await queueService.addSyncJob({
      teamId,
      integrationType: 'github',
      integrationId: teamId, // Will be updated with actual integration ID
    });

    logger.info(`GitHub integration completed for team ${teamId}`);
    return res.json({ message: 'GitHub integration successful' });
  } catch (error) {
    return next(error);
  }
});

/**
 * Trigger manual sync
 */
router.post('/sync', authMiddleware, async (req: any, res, next) => {
  try {
    const { team_id } = req.body;

    // Get integration
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('team_id', team_id)
      .eq('type', 'github')
      .single();

    if (!integration) {
      return res.status(404).json({ error: 'GitHub integration not found' });
    }

    // Queue sync job
    await queueService.addSyncJob({
      teamId: team_id,
      integrationType: 'github',
      integrationId: integration.id,
    });

    return res.json({ message: 'GitHub sync queued' });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get GitHub statistics
 */
router.get('/stats/:teamId', authMiddleware, async (req: any, res, next) => {
  try {
    const { teamId } = req.params;
    const stats = await githubService.getTeamStats(teamId);
    return res.json(stats);
  } catch (error) {
    return next(error);
  }
});

/**
 * Search GitHub memories
 */
router.get('/search/:teamId', authMiddleware, async (req: any, res, next) => {
  try {
    const { teamId } = req.params;
    const { q, repository, type, author } = req.query;

    const results = await githubService.searchMemories(teamId, q as string, {
      repository: repository as string,
      type: type as string,
      author: author as string,
    });

    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

export default router;