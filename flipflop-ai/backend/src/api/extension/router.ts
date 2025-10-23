import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { supabaseAdmin } from '../../services/supabase.js';
import { extensionAuthMiddleware } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import memoryService from '../../services/memory.js';
import { ScreenshotService } from '../../services/screenshot.service.js';
import { logger } from '../../index.js';

const router = Router();
const screenshotService = new ScreenshotService(supabaseAdmin);

// Validation schemas
const createSessionSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const captureSchema = z.object({
  content: z.string().min(1),
  url: z.string().url(),
  title: z.string().optional(),
  selection: z.string().optional(),
  screenshot: z.string().optional(), // base64
});

const meetTranscriptSchema = z.object({
  meetingId: z.string(),
  chunk: z.object({
    text: z.string(),
    speaker: z.string().optional(),
    timestamp: z.number(),
    confidence: z.number().optional(),
  }),
});

// Create extension session
router.post('/session', async (req, res, next) => {
  try {
    const { email, password } = createSessionSchema.parse(req.body);

    // Verify extension API key
    const apiKey = req.headers['x-extension-key'];
    if (apiKey !== process.env.EXTENSION_API_KEY) {
      throw new AppError(401, 'Invalid extension API key');
    }

    // Authenticate user
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Create extension session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const { error: sessionError } = await supabaseAdmin
      .from('extension_sessions')
      .insert({
        user_id: data.user.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) throw sessionError;

    // Get user's teams
    const { data: teams } = await supabaseAdmin
      .from('team_members')
      .select('team_id, role, teams(id, name)')
      .eq('user_id', data.user.id);

    logger.info(`Extension session created for user ${email}`);

    res.json({
      sessionToken,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      teams: teams?.map((t: any) => ({
        id: t.team_id,
        name: t.teams.name,
        role: t.role,
      })) || [],
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth for extension (using Chrome Identity API)
router.post('/google-auth', async (req, res, next) => {
  try {
    const { googleUser, googleToken } = req.body;

    if (!googleUser || !googleUser.email) {
      throw new AppError(400, 'Google user data required');
    }

    // Verify the Google token is valid by making a request to Google
    const verifyResponse = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${googleToken}`,
      },
    });

    if (!verifyResponse.ok) {
      throw new AppError(400, 'Invalid Google token');
    }

    // Find or create user in Supabase
    let userData;
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(googleUser.email);

    if (existingUser.user) {
      // User exists, sign them in
      userData = existingUser.user;
    } else {
      // Create new user
      const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: googleUser.email,
        password: crypto.randomBytes(32).toString('hex'), // Random password
        email_confirm: true,
        user_metadata: {
          name: googleUser.name,
          avatar_url: googleUser.picture,
          provider: 'google',
        },
      });

      if (signUpError) throw signUpError;
      userData = newUser.user;

      // Create profile
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: userData.id,
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
    }

    // Generate session token for extension
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error: sessionError } = await supabaseAdmin
      .from('extension_sessions')
      .insert({
        user_id: userData.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) throw sessionError;

    // Get user's teams
    const { data: teams } = await supabaseAdmin
      .from('team_members')
      .select('team_id, role, teams(id, name)')
      .eq('user_id', userData.id);

    logger.info(`Google OAuth extension session created for user ${googleUser.email}`);

    res.json({
      sessionToken,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.user_metadata?.name || googleUser.name,
      },
      teams: teams?.map((t: any) => ({
        id: t.team_id,
        name: t.teams.name,
        role: t.role,
      })) || [],
    });
  } catch (error) {
    logger.error('Google OAuth extension error:', error);
    next(error);
  }
});

// Verify session
router.get('/session/verify', extensionAuthMiddleware, async (req: any, res, next) => {
  try {
    res.json({
      valid: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
});

// Capture content from any webpage
router.post('/capture', extensionAuthMiddleware, async (req: any, res, next) => {
  try {
    const { content, url, title, selection, screenshot } = captureSchema.parse(req.body);
    const teamId = req.headers['x-team-id'];

    if (!teamId) {
      throw new AppError(400, 'No team selected');
    }

    // Verify user has access to team
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user.id)
      .single();

    if (!member) {
      throw new AppError(403, 'Access denied to team');
    }

    // Create memory from capture
    const memory = await memoryService.createMemory({
      teamId,
      content: selection || content,
      type: 'document',
      source: 'web_capture',
      sourceUrl: url,
      author: {
        id: req.user.id,
        name: req.user.email,
      },
      timestamp: new Date(),
      metadata: {
        pageTitle: title,
        fullContent: content,
        hasScreenshot: !!screenshot,
        captureType: selection ? 'selection' : 'full_page',
      },
    });

    // Store screenshot if provided
    if (screenshot) {
      await screenshotService.storeScreenshot(teamId, req.user.id, {
        filename: `capture_${new Date().getTime()}.png`,
        data: screenshot,
        memoryId: memory.id,
        metadata: {
          url,
          title,
          captureType: selection ? 'selection' : 'full_page',
        },
      });
    }

    logger.info(`Web content captured from ${url} for team ${teamId}`);

    res.json({ message: 'Content captured successfully' });
  } catch (error) {
    next(error);
  }
});

// Google Meet transcription endpoint
router.post('/meet/transcription', extensionAuthMiddleware, async (req: any, res, next) => {
  try {
    const { meetingId, chunk } = meetTranscriptSchema.parse(req.body);
    const teamId = req.headers['x-team-id'];

    if (!teamId) {
      throw new AppError(400, 'No team selected');
    }

    // Store transcription chunk in temporary storage
    // In production, you'd want to use Redis or a similar solution
    // const transcriptKey = `meet_transcript_${teamId}_${meetingId}`;

    // For now, we'll create a memory for significant chunks
    if (chunk.text.length > 50) {
      await memoryService.createMemory({
        teamId,
        content: chunk.text,
        type: 'meeting',
        source: 'google_meet',
        sourceId: meetingId,
        author: {
          id: chunk.speaker || 'unknown',
          name: chunk.speaker || 'Unknown Speaker',
        },
        timestamp: new Date(chunk.timestamp),
        metadata: {
          meetingId,
          confidence: chunk.confidence,
        },
      });
    }

    res.json({ message: 'Transcription received' });
  } catch (error) {
    next(error);
  }
});

// End meeting and process full transcript
router.post('/meet/end', extensionAuthMiddleware, async (req: any, res, next) => {
  try {
    const { meetingId, summary, decisions, actionItems } = req.body;
    const teamId = req.headers['x-team-id'];

    if (!teamId) {
      throw new AppError(400, 'No team selected');
    }

    // Create summary memory
    if (summary) {
      await memoryService.createMemory({
        teamId,
        content: summary,
        type: 'meeting',
        source: 'google_meet',
        sourceId: `${meetingId}_summary`,
        author: {
          id: req.user.id,
          name: 'Meeting Summary',
        },
        timestamp: new Date(),
        metadata: {
          meetingId,
          isSummary: true,
        },
      });
    }

    // Create memories for decisions
    for (const decision of decisions || []) {
      await memoryService.createMemory({
        teamId,
        content: decision,
        type: 'decision',
        source: 'google_meet',
        sourceId: `${meetingId}_decision`,
        timestamp: new Date(),
        metadata: { meetingId },
      });
    }

    // Create memories for action items
    for (const action of actionItems || []) {
      await memoryService.createMemory({
        teamId,
        content: action,
        type: 'action_item',
        source: 'google_meet',
        sourceId: `${meetingId}_action`,
        timestamp: new Date(),
        metadata: { meetingId },
      });
    }

    logger.info(`Meeting ${meetingId} ended and processed for team ${teamId}`);

    res.json({ message: 'Meeting processed successfully' });
  } catch (error) {
    next(error);
  }
});

// Get extension status
router.get('/status', extensionAuthMiddleware, async (req: any, res, next) => {
  try {
    const teamId = req.headers['x-team-id'];

    let teamStats = null;
    if (teamId) {
      teamStats = await memoryService.getTeamStats(teamId);
    }

    res.json({
      connected: true,
      userId: req.user.id,
      teamId,
      stats: teamStats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;