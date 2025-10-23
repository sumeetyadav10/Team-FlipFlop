import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export class GitHubService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * GitHub OAuth flow
   */
  async getAuthUrl(teamId: string, userId: string): Promise<string> {
    const state = Buffer.from(JSON.stringify({ teamId, userId })).toString('base64');
    const scopes = ['repo', 'read:user', 'read:org'].join(',');

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: `${process.env.API_URL}/api/integrations/github/callback`,
      scope: scopes,
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string): Promise<any> {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          code,
        }),
      });

      const data = await response.json() as any;
      
      if (!response.ok || (data as any).error) {
        throw new AppError('GitHub OAuth failed', 400, (data as any).error_description);
      }

      return {
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      logger.error('GitHub OAuth error:', error);
      throw error;
    }
  }

  /**
   * Store GitHub integration
   */
  async storeIntegration(teamId: string, credentials: any): Promise<any> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('integrations')
        .insert({
          team_id: teamId,
          type: 'github',
          credentials: JSON.stringify(credentials),
          status: 'active',
          settings: {
            repos: [],
            syncPRs: true,
            syncIssues: true,
            syncCommits: false,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('GitHub integration storage error:', error);
      throw error;
    }
  }

  /**
   * Sync repositories
   */
  async syncRepositories(teamId: string, integrationId: string): Promise<void> {
    try {
      // Get integration credentials
      const { data: integration } = await (this.supabase as any)
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('team_id', teamId)
        .single();

      if (!integration) {
        throw new AppError('GitHub integration not found', 404);
      }

      const credentials = JSON.parse(integration.credentials as string);
      
      // Get repositories from GitHub API
      const repos = await this.fetchRepositories(credentials.access_token);
      
      // Process and store repository data as memories
      for (const repo of repos) {
        await this.processRepository(teamId, repo, credentials.access_token);
      }

      // Update last sync timestamp
      await (this.supabase as any)
        .from('integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', integrationId);

      logger.info(`GitHub sync completed for team ${teamId}`);
    } catch (error) {
      logger.error('GitHub sync error:', error);
      throw error;
    }
  }

  /**
   * Fetch repositories from GitHub
   */
  private async fetchRepositories(accessToken: string): Promise<any[]> {
    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new AppError('Failed to fetch repositories', response.status, data);
      }

      return (data as any[]) || [];
    } catch (error) {
      logger.error('GitHub API error:', error);
      throw error;
    }
  }

  /**
   * Process repository into memory
   */
  private async processRepository(teamId: string, repo: any, accessToken: string): Promise<void> {
    try {
      // Skip archived or private repos unless specifically configured
      if (repo.archived) {
        return;
      }

      const content = this.extractRepositoryContent(repo);
      if (!content) return;

      // Import memory service
      const { MemoryService } = await import('../memory.js');
      const memoryService = new MemoryService();

      await memoryService.createMemory({
        teamId,
        content,
        type: 'document',
        source: 'github',
        sourceId: repo.id.toString(),
        sourceUrl: repo.html_url,
        timestamp: new Date(repo.updated_at),
        metadata: {
          repositoryId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          language: repo.language,
          stargazersCount: repo.stargazers_count,
          forksCount: repo.forks_count,
          openIssuesCount: repo.open_issues_count,
        },
      });

      // Sync recent issues and PRs if enabled
      await this.syncRecentIssues(teamId, repo, accessToken);
      await this.syncRecentPRs(teamId, repo, accessToken);
    } catch (error) {
      logger.error(`Failed to process repository ${repo.id}:`, error);
    }
  }

  /**
   * Extract meaningful content from repository
   */
  private extractRepositoryContent(repo: any): string | null {
    let content = `Repository: ${repo.full_name}`;
    
    if (repo.description) {
      content += `\n\nDescription: ${repo.description}`;
    }

    if (repo.language) {
      content += `\n\nPrimary Language: ${repo.language}`;
    }

    if (repo.topics && repo.topics.length > 0) {
      content += `\n\nTopics: ${repo.topics.join(', ')}`;
    }

    return content.trim().length > 20 ? content.trim() : null;
  }

  /**
   * Sync recent issues
   */
  private async syncRecentIssues(teamId: string, repo: any, accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo.full_name}/issues?state=all&per_page=10&sort=updated`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      const issues = await response.json() as any[];
      
      if (!response.ok) return;

      for (const issue of (issues || [])) {
        if (issue.pull_request) continue; // Skip PRs

        const content = `Issue: ${issue.title}\n\n${issue.body || 'No description'}`;
        
        const { MemoryService } = await import('../memory.js');
        const memoryService = new MemoryService();

        await memoryService.createMemory({
          teamId,
          content,
          type: 'discussion',
          source: 'github',
          sourceId: issue.id.toString(),
          sourceUrl: issue.html_url,
          timestamp: new Date(issue.updated_at),
          metadata: {
            issueNumber: issue.number,
            state: issue.state,
            repository: repo.full_name,
            author: issue.user?.login,
            labels: issue.labels?.map((l: any) => l.name) || [],
          },
        });
      }
    } catch (error) {
      logger.error(`Failed to sync issues for ${repo.full_name}:`, error);
    }
  }

  /**
   * Sync recent pull requests
   */
  private async syncRecentPRs(teamId: string, repo: any, accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo.full_name}/pulls?state=all&per_page=10&sort=updated`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      const prs = await response.json() as any[];
      
      if (!response.ok) return;

      for (const pr of (prs || [])) {
        const content = `Pull Request: ${pr.title}\n\n${pr.body || 'No description'}`;
        
        const { MemoryService } = await import('../memory.js');
        const memoryService = new MemoryService();

        await memoryService.createMemory({
          teamId,
          content,
          type: 'decision',
          source: 'github',
          sourceId: pr.id.toString(),
          sourceUrl: pr.html_url,
          timestamp: new Date(pr.updated_at),
          metadata: {
            prNumber: pr.number,
            state: pr.state,
            merged: pr.merged,
            repository: repo.full_name,
            author: pr.user?.login,
            reviewers: pr.requested_reviewers?.map((r: any) => r.login) || [],
          },
        });
      }
    } catch (error) {
      logger.error(`Failed to sync PRs for ${repo.full_name}:`, error);
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<any> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('memories')
        .select('id, type, created_at')
        .eq('team_id', teamId)
        .eq('source', 'github');

      if (error) throw error;

      const stats = {
        totalMemories: data?.length || 0,
        repositories: 0,
        issues: 0,
        pullRequests: 0,
        lastSync: null,
      };

      data?.forEach((memory: any) => {
        switch (memory.type) {
          case 'document':
            stats.repositories++;
            break;
          case 'discussion':
            stats.issues++;
            break;
          case 'decision':
            stats.pullRequests++;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error('GitHub stats error:', error);
      return { totalMemories: 0, repositories: 0, issues: 0, pullRequests: 0 };
    }
  }

  /**
   * Search GitHub memories
   */
  async searchMemories(teamId: string, query: string, filters: any = {}): Promise<any[]> {
    try {
      let supabaseQuery = (this.supabase as any)
        .from('memories')
        .select('*')
        .eq('team_id', teamId)
        .eq('source', 'github')
        .ilike('content', `%${query}%`);

      if (filters.repository) {
        supabaseQuery = supabaseQuery.contains('metadata', { repository: filters.repository });
      }

      if (filters.type) {
        supabaseQuery = supabaseQuery.eq('type', filters.type);
      }

      const { data, error } = await supabaseQuery.order('timestamp', { ascending: false }).limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('GitHub search error:', error);
      return [];
    }
  }
}