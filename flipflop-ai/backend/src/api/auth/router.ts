import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase.js';
import { logger } from '../../index.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Sign up endpoint
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = signUpSchema.parse(req.body);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now
    });

    if (authError) {
      throw new AppError(400, authError.message);
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
      });

    if (profileError) {
      // Rollback auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new AppError(500, 'Failed to create user profile');
    }

    logger.info(`New user signed up: ${email}`);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sign in endpoint
router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = signInSchema.parse(req.body);

    // Sign in with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    logger.info(`User signed in: ${email}`);

    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required');
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new AppError(401, 'Invalid refresh token');
    }

    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (error) {
    next(error);
  }
});

// Sign out endpoint
router.post('/signout', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Revoke the session
      await supabaseAdmin.auth.admin.signOut(token);
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new AppError(401, 'Invalid token');
    }

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get teams
    const { data: teams } = await supabaseAdmin
      .from('team_members')
      .select('team_id, role, teams(*)')
      .eq('user_id', user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name,
      },
      teams: teams?.map((tm: any) => ({
        id: tm.team_id,
        name: tm.teams.name,
        role: tm.role,
      })) || [],
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth endpoint (for future implementation)
router.get('/google', async (_req, res, next) => {
  try {
    // Redirect to Google OAuth
    res.status(501).json({ error: 'Google OAuth not implemented yet' });
  } catch (error) {
    next(error);
  }
});

export default router;