import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../services/supabase.js';
import { logger } from '../index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    teamId?: string;
  };
  token?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token with Supabase's JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from Supabase
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', decoded.sub)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's active team (first team for now)
    const { data: teamMember } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      teamId: teamMember?.team_id
    };
    req.token = token;

    return next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Extension-specific auth middleware
export async function extensionAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const apiKey = req.headers['x-extension-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    // Verify extension API key
    if (apiKey !== process.env.EXTENSION_API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Get user token from extension session
    const sessionToken = req.headers['x-session-token'] as string;
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    // Verify session token
    const { data: session, error } = await supabaseAdmin
      .from('extension_sessions')
      .select('*, profiles(*)')
      .eq('token', sessionToken)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = {
      id: session.user_id,
      email: session.profiles.email
    };

    return next();
  } catch (error) {
    logger.error('Extension auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}