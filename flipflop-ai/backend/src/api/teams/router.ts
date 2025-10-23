import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase.js';
import { AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../index.js';
import { io } from '../../index.js';

const router = Router();

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

// Get user's teams
router.get('/', async (req: AuthRequest, res, next): Promise<any> => {
  try {
    const { data: teams, error } = await supabaseAdmin
      .from('team_members')
      .select(`
        team_id,
        role,
        joined_at,
        teams (
          id,
          name,
          slug,
          created_at
        )
      `)
      .eq('user_id', req.user!.id);

    if (error) throw error;

    res.json({
      teams: teams?.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        slug: tm.teams.slug,
        role: tm.role,
        joinedAt: tm.joined_at,
      })) || [],
    });
  } catch (error) {
    next(error);
  }
});

// Create new team
router.post('/', async (req: AuthRequest, res, next): Promise<any> => {
  try {
    const { name, slug } = createTeamSchema.parse(req.body);

    // Check if slug is already taken
    const { data: existing } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      throw new AppError(400, 'Team slug already exists');
    }

    // Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({ name, slug })
      .select()
      .single();

    if (teamError) throw teamError;

    // Add creator as owner
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        user_id: req.user!.id,
        team_id: team.id,
        role: 'owner',
      });

    if (memberError) {
      // Rollback team creation
      await supabaseAdmin.from('teams').delete().eq('id', team.id);
      throw memberError;
    }

    logger.info(`Team created: ${team.name} by user ${req.user!.id}`);

    res.status(201).json({
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        role: 'owner',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get team details
router.get('/:teamId', async (req: AuthRequest, res, next): Promise<any> => {
  try {
    const { teamId } = req.params;

    // Check if user has access to team
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user!.id)
      .single();

    if (!member) {
      throw new AppError(403, 'Access denied');
    }

    // Get team details
    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error || !team) {
      throw new AppError(404, 'Team not found');
    }

    // Get member count
    const { count } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    res.json({
      team: {
        ...team,
        memberCount: count || 0,
        currentUserRole: member.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get team members
router.get('/:teamId/members', async (req: AuthRequest, res, next): Promise<any> => {
  try {
    const { teamId } = req.params;

    // Check if user has access to team
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user!.id)
      .single();

    if (!member) {
      throw new AppError(403, 'Access denied');
    }

    // Get team members
    const { data: members, error } = await supabaseAdmin
      .from('team_members')
      .select(`
        user_id,
        role,
        joined_at,
        profiles (
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('team_id', teamId);

    if (error) throw error;

    res.json({
      members: members?.map((m: any) => ({
        id: m.user_id,
        email: m.profiles.email,
        name: m.profiles.name,
        avatarUrl: m.profiles.avatar_url,
        role: m.role,
        joinedAt: m.joined_at,
      })) || [],
    });
  } catch (error) {
    next(error);
  }
});

// Invite team member
router.post('/:teamId/invite', async (req: AuthRequest, res, next): Promise<any> => {
  try {
    const { teamId } = req.params;
    const { email, role } = inviteMemberSchema.parse(req.body);

    // Check if user has permission to invite
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user!.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new AppError(403, 'Only owners and admins can invite members');
    }

    // Check if user exists
    const { data: invitedUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!invitedUser) {
      // TODO: Send invitation email
      return res.json({
        message: 'Invitation sent to email',
        email,
      });
    }

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingMember) {
      throw new AppError(400, 'User is already a team member');
    }

    // Add as team member
    const { error } = await supabaseAdmin
      .from('team_members')
      .insert({
        user_id: invitedUser.id,
        team_id: teamId,
        role,
      });

    if (error) throw error;

    // Notify via WebSocket
    io.to(`team-${teamId}`).emit('member-joined', {
      userId: invitedUser.id,
      email,
      role,
    });

    logger.info(`User ${email} invited to team ${teamId}`);

    res.json({
      message: 'Member added successfully',
      userId: invitedUser.id,
    });
  } catch (error) {
    next(error);
  }
});

// Remove team member
router.delete('/:teamId/members/:userId', async (req: AuthRequest, res, next): Promise<any> => {
  try {
    const { teamId, userId } = req.params;

    // Check if user has permission
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user!.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new AppError(403, 'Only owners and admins can remove members');
    }

    // Prevent owner from removing themselves
    if (member.role === 'owner' && userId === req.user!.id) {
      throw new AppError(400, 'Owner cannot remove themselves');
    }

    // Remove member
    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;

    // Notify via WebSocket
    io.to(`team-${teamId}`).emit('member-removed', { userId });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
});

// Update team settings
router.patch('/:teamId', async (req: AuthRequest, res, next): Promise<any> => {
  try {
    const { teamId } = req.params;
    const { name, settings } = req.body;

    // Check if user has permission
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user!.id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new AppError(403, 'Only owners and admins can update team settings');
    }

    // Update team
    const updateData: any = {};
    if (name) updateData.name = name;
    if (settings) updateData.settings = settings;

    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;

    res.json({ team });
  } catch (error) {
    next(error);
  }
});

export default router;