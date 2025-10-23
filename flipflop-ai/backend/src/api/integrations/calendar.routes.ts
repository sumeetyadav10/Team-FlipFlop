import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { CalendarService } from '../../services/integrations/calendar.service.js';
import { supabaseAdmin } from '../../services/supabase.js';
import { queueService } from '../../services/queue.service.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const calendarService = new CalendarService(supabaseAdmin);

/**
 * Google Calendar OAuth initiation
 */
router.get('/auth', authMiddleware, async (req: any, res, next) => {
  try {
    const teamId = req.query.team_id;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID required' });
    }

    const scope = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const state = `${teamId}:${req.user.id}`;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(`${process.env.API_URL}/api/integrations/calendar/callback`)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;

    return res.json({ authUrl });
  } catch (error) {
    return next(error);
  }
});

/**
 * Google Calendar OAuth callback
 */
router.post('/callback', authMiddleware, async (req: any, res, next) => {
  try {
    const { code, state } = req.body;
    const [teamId, userId] = state.split(':');

    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Invalid state parameter' });
    }

    await calendarService.handleCallback(code);

    // Queue initial sync
    await queueService.addSyncJob({
      teamId,
      integrationType: 'calendar',
      integrationId: teamId, // Will be updated with actual integration ID
    });

    logger.info(`Google Calendar integration completed for team ${teamId}`);
    return res.json({ message: 'Google Calendar integration successful' });
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
      .eq('type', 'calendar')
      .single();

    if (!integration) {
      return res.status(404).json({ error: 'Google Calendar integration not found' });
    }

    // Queue sync job
    await queueService.addSyncJob({
      teamId: team_id,
      integrationType: 'calendar',
      integrationId: integration.id,
    });

    return res.json({ message: 'Google Calendar sync queued' });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get calendar statistics
 */
router.get('/stats/:teamId', authMiddleware, async (req: any, res, next) => {
  try {
    const { teamId } = req.params;
    const stats = await calendarService.getTeamStats(teamId);
    return res.json(stats);
  } catch (error) {
    return next(error);
  }
});

/**
 * Search calendar memories
 */
router.get('/search/:teamId', authMiddleware, async (req: any, res, next) => {
  try {
    const { teamId } = req.params;
    const { q, dateFrom, dateTo, attendee } = req.query;

    const results = await calendarService.searchMemories(teamId, q as string, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      attendee: attendee as string,
    });

    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

export default router;