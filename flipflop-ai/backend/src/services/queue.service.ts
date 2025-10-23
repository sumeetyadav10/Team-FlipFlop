import Bull from 'bull';
// import { redis } from './redis.service.js';
import { logger } from '../index.js';
import { sendEmail } from './email.service.js';
import { SlackService } from './integrations/slack.js';
import { NotionService } from './integrations/notion.js';
import { GitHubService } from './integrations/github.service.js';
import { supabaseAdmin } from './supabase.js';

// Job types
export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  teamId?: string;
}

export interface SyncJob {
  teamId: string;
  integrationType: 'slack' | 'notion' | 'github' | 'calendar';
  integrationId: string;
}

export interface ProcessMeetingJob {
  meetingId: string;
  teamId: string;
  transcript: any[];
}

// Queue setup
const redisConfig = {
  redis: {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
  },
};

export class QueueService {
  public emailQueue: Bull.Queue<EmailJob>;
  public syncQueue: Bull.Queue<SyncJob>;
  public meetingQueue: Bull.Queue<ProcessMeetingJob>;

  constructor() {
    // Initialize queues
    this.emailQueue = new Bull('email', redisConfig);
    this.syncQueue = new Bull('sync', redisConfig);
    this.meetingQueue = new Bull('meeting', redisConfig);

    this.setupProcessors();
    this.setupEvents();
  }

  private setupProcessors() {
    // Email processor
    this.emailQueue.process(async (job) => {
      const { to, subject, html } = job.data;
      logger.info(`Processing email job: ${subject} to ${to}`);
      
      try {
        await sendEmail({ to, subject, html });
        logger.info(`Email sent successfully to ${to}`);
      } catch (error) {
        logger.error(`Failed to send email to ${to}:`, error);
        throw error;
      }
    });

    // Sync processor
    this.syncQueue.process(async (job) => {
      const { teamId, integrationType, integrationId } = job.data;
      logger.info(`Processing sync job: ${integrationType} for team ${teamId}`);

      try {
        // Get integration credentials
        const { data: integration } = await supabaseAdmin
          .from('integrations')
          .select('*')
          .eq('id', integrationId)
          .eq('team_id', teamId)
          .single();

        if (!integration) {
          throw new Error('Integration not found');
        }

        switch (integrationType) {
          case 'slack':
            const slackService = new SlackService();
            await slackService.syncTeamData(teamId);
            break;

          case 'notion':
            const notionService = new NotionService();
            await notionService.syncPages(teamId);
            break;

          case 'github':
            const githubService = new GitHubService(supabaseAdmin);
            await githubService.syncRepositories(teamId, integrationId);
            break;

          default:
            throw new Error(`Unknown integration type: ${integrationType}`);
        }

        // Update last sync timestamp
        await supabaseAdmin
          .from('integrations')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', integrationId);

        logger.info(`Sync completed for ${integrationType} integration ${integrationId}`);
      } catch (error) {
        logger.error(`Sync failed for ${integrationType} integration ${integrationId}:`, error);
        
        // Update integration status
        await supabaseAdmin
          .from('integrations')
          .update({ status: 'error' })
          .eq('id', integrationId);
        
        throw error;
      }
    });

    // Meeting processor
    this.meetingQueue.process(async (job) => {
      const { meetingId, teamId } = job.data;
      logger.info(`Processing meeting job: ${meetingId} for team ${teamId}`);

      try {
        // Process meeting transcript and create memories
        // This would involve AI analysis to extract decisions, action items, etc.
        logger.info(`Meeting processing completed for ${meetingId}`);
      } catch (error) {
        logger.error(`Meeting processing failed for ${meetingId}:`, error);
        throw error;
      }
    });
  }

  private setupEvents() {
    // Email queue events
    this.emailQueue.on('completed', (job) => {
      logger.info(`Email job ${job.id} completed`);
    });

    this.emailQueue.on('failed', (job, err) => {
      logger.error(`Email job ${job.id} failed:`, err);
    });

    // Sync queue events
    this.syncQueue.on('completed', (job) => {
      logger.info(`Sync job ${job.id} completed`);
    });

    this.syncQueue.on('failed', (job, err) => {
      logger.error(`Sync job ${job.id} failed:`, err);
    });

    // Meeting queue events
    this.meetingQueue.on('completed', (job) => {
      logger.info(`Meeting job ${job.id} completed`);
    });

    this.meetingQueue.on('failed', (job, err) => {
      logger.error(`Meeting job ${job.id} failed:`, err);
    });
  }

  /**
   * Add jobs to queues
   */

  async addEmailJob(data: EmailJob, options?: Bull.JobOptions): Promise<Bull.Job<EmailJob>> {
    return this.emailQueue.add('email-job', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...options,
    });
  }

  async addSyncJob(data: SyncJob, options?: Bull.JobOptions): Promise<Bull.Job<SyncJob>> {
    return this.syncQueue.add('sync-job', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      delay: 5000, // 5 second delay
      ...options,
    });
  }

  async addMeetingJob(data: ProcessMeetingJob, options?: Bull.JobOptions): Promise<Bull.Job<ProcessMeetingJob>> {
    return this.meetingQueue.add('meeting-job', data, {
      attempts: 1,
      ...options,
    });
  }

  /**
   * Schedule recurring jobs
   */

  async setupRecurringJobs() {
    // Daily sync for all active integrations
    await this.syncQueue.add(
      'daily-sync',
      { teamId: '', integrationType: 'slack' as const, integrationId: '' },
      {
        repeat: { cron: '0 2 * * *' }, // 2 AM daily
        jobId: 'daily-sync-all-integrations',
      }
    );

    logger.info('Recurring jobs scheduled');
  }

  /**
   * Queue management
   */

  async getQueueStats() {
    const [emailStats, syncStats, meetingStats] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.syncQueue.getJobCounts(),
      this.meetingQueue.getJobCounts(),
    ]);

    return {
      email: emailStats,
      sync: syncStats,
      meeting: meetingStats,
    };
  }

  async pauseAllQueues() {
    await Promise.all([
      this.emailQueue.pause(),
      this.syncQueue.pause(),
      this.meetingQueue.pause(),
    ]);
  }

  async resumeAllQueues() {
    await Promise.all([
      this.emailQueue.resume(),
      this.syncQueue.resume(),
      this.meetingQueue.resume(),
    ]);
  }

  async closeAllQueues() {
    await Promise.all([
      this.emailQueue.close(),
      this.syncQueue.close(),
      this.meetingQueue.close(),
    ]);
  }
}

// Export singleton instance
export const queueService = new QueueService();