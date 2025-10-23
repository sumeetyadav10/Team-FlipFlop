import { Router } from 'express';
// import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase.js';
import { AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../index.js';
import slackService from '../../services/integrations/slack.js';
import notionService from '../../services/integrations/notion.js';
import gmailService from '../../services/integrations/gmail.js';
import githubRoutes from './github.routes.js';
import calendarRoutes from './calendar.routes.js';

const router = Router();

// Get team integrations
router.get('/', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { teamId } = req.user!;

    if (!teamId) {
      throw new AppError(400, 'No team selected');
    }

    const { data: integrations, error } = await supabaseAdmin
      .from('integrations')
      .select('id, type, status, last_sync, created_at')
      .eq('team_id', teamId);

    if (error) throw error;

    return res.json({ integrations: integrations || [] });
  } catch (error) {
    return _next(error);
  }
});

// Slack OAuth flow
router.get('/slack/auth', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const redirectUrl = slackService.getAuthUrl(teamId, req.user!.id);
    return res.json({ authUrl: redirectUrl });
  } catch (error) {
    return _next(error);
  }
});

// Slack OAuth callback
router.get('/slack/callback', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      throw new AppError(400, 'Invalid OAuth callback');
    }

    // Parse state (contains teamId and userId)
    const { teamId, userId } = JSON.parse(Buffer.from(state as string, 'base64').toString());

    // Verify user has access to team
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new AppError(403, 'Unauthorized');
    }

    // Exchange code for access token
    const credentials = await slackService.handleCallback(code as string);

    // Save integration
    const { error } = await supabaseAdmin
      .from('integrations')
      .upsert({
        team_id: teamId,
        type: 'slack',
        credentials: credentials, // Should be encrypted in production
        status: 'active',
      }, {
        onConflict: 'team_id,type'
      });

    if (error) throw error;

    // Start initial sync
    await slackService.syncTeamData(teamId);

    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=slack`);
  } catch (error) {
    logger.error('Slack OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=slack`);
  }
});

// Slack webhook endpoint
router.post('/slack/webhook', async (req, res, _next): Promise<any> => {
  try {
    // Handle URL verification first (before signature check)
    if (req.body.type === 'url_verification') {
      console.log('Slack URL verification - challenge:', req.body.challenge);
      return res.json({ challenge: req.body.challenge });
    }

    // Verify Slack signature for other requests
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (!slackService.verifyWebhook(signature, timestamp, req.body)) {
      throw new AppError(401, 'Invalid signature');
    }

    // Handle different event types
    const { type, event } = req.body;

    if (type === 'event_callback') {
      // Process async to respond quickly
      setImmediate(() => {
        slackService.handleEvent(event).catch(err => {
          logger.error('Slack event processing error:', err);
        });
      });
    }

    res.status(200).send();
  } catch (error) {
    return _next(error);
  }
});

// Notion OAuth flow
router.get('/notion/auth', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const redirectUrl = notionService.getAuthUrl(teamId, req.user!.id);
    return res.json({ authUrl: redirectUrl });
  } catch (error) {
    return _next(error);
  }
});

// Notion OAuth callback
router.get('/notion/callback', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      throw new AppError(400, 'Invalid OAuth callback');
    }

    const { teamId, userId } = JSON.parse(Buffer.from(state as string, 'base64').toString());

    // Verify permissions
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new AppError(403, 'Unauthorized');
    }

    // Exchange code for access token
    const credentials = await notionService.handleCallback(code as string);

    // Save integration
    const { error } = await supabaseAdmin
      .from('integrations')
      .upsert({
        team_id: teamId,
        type: 'notion',
        credentials: credentials,
        status: 'active',
      }, {
        onConflict: 'team_id,type'
      });

    if (error) throw error;

    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=notion`);
  } catch (error) {
    logger.error('Notion OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=notion`);
  }
});

// Gmail OAuth flow
router.get('/gmail/auth', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { teamId } = req.user!;
    if (!teamId) throw new AppError(400, 'No team selected');

    const redirectUrl = gmailService.getAuthUrl(teamId, req.user!.id);
    return res.json({ authUrl: redirectUrl });
  } catch (error) {
    return _next(error);
  }
});

// Gmail OAuth callback
router.get('/gmail/callback', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      throw new AppError(400, 'Invalid OAuth callback');
    }

    const { teamId, userId } = JSON.parse(Buffer.from(state as string, 'base64').toString());

    // Verify permissions
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new AppError(403, 'Unauthorized');
    }

    // Exchange code for tokens
    const credentials = await gmailService.handleCallback(code as string);

    // Save integration
    const { error } = await supabaseAdmin
      .from('integrations')
      .upsert({
        team_id: teamId,
        type: 'gmail',
        credentials: credentials,
        status: 'active',
      }, {
        onConflict: 'team_id,type'
      });

    if (error) throw error;

    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=gmail`);
  } catch (error) {
    logger.error('Gmail OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=gmail`);
  }
});

// Manual sync endpoint
router.post('/:integrationType/sync', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { integrationType } = req.params;
    const { teamId } = req.user!;

    if (!teamId) throw new AppError(400, 'No team selected');

    // Get integration
    const { data: integration, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('team_id', teamId)
      .eq('type', integrationType)
      .eq('status', 'active')
      .single();

    if (error || !integration) {
      throw new AppError(404, 'Integration not found');
    }

    // Trigger sync based on type
    switch (integrationType) {
      case 'slack':
        await slackService.syncTeamData(teamId);
        break;
      case 'notion':
        await notionService.syncPages(teamId);
        break;
      case 'gmail':
        await gmailService.syncEmails(teamId);
        break;
      default:
        throw new AppError(400, 'Invalid integration type');
    }

    // Update last_sync
    await supabaseAdmin
      .from('integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', integration.id);

    return res.json({ message: 'Sync initiated successfully' });
  } catch (error) {
    return _next(error);
  }
});

// Delete integration
router.delete('/:integrationType', async (req: AuthRequest, res, _next): Promise<any> => {
  try {
    const { integrationType } = req.params;
    const { teamId } = req.user!;

    if (!teamId) throw new AppError(400, 'No team selected');

    // Check permissions
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user!.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new AppError(403, 'Only owners and admins can remove integrations');
    }

    // Delete integration
    const { error } = await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('team_id', teamId)
      .eq('type', integrationType);

    if (error) throw error;

    logger.info(`Integration ${integrationType} removed for team ${teamId}`);

    return res.json({ message: 'Integration removed successfully' });
  } catch (error) {
    return _next(error);
  }
});

// Mount sub-routers
router.use('/github', githubRoutes);
router.use('/calendar', calendarRoutes);

export default router;