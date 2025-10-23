import { WebClient } from '@slack/web-api';
import crypto from 'crypto';
import { supabaseAdmin } from '../supabase.js';
import { logger } from '../../index.js';
import memoryService from '../memory.js';
import fetch from 'node-fetch';

class SlackService {
  private clientId: string;
  private clientSecret: string;
  private signingSecret: string;

  constructor() {
    this.clientId = process.env.SLACK_CLIENT_ID!;
    this.clientSecret = process.env.SLACK_CLIENT_SECRET!;
    this.signingSecret = process.env.SLACK_SIGNING_SECRET!;
  }

  getAuthUrl(teamId: string, userId: string): string {
    const state = Buffer.from(JSON.stringify({ teamId, userId })).toString('base64');
    const scopes = [
      'channels:history',
      'channels:read',
      'groups:history',
      'groups:read',
      'im:history',
      'im:read',
      'mpim:history',
      'mpim:read',
      'users:read',
    ].join(',');

    return `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=${scopes}&state=${state}&redirect_uri=${encodeURIComponent(`${process.env.API_URL}/api/integrations/slack/callback`)}`;
  }

  async handleCallback(code: string): Promise<any> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: `${process.env.API_URL}/api/integrations/slack/callback`,
      }),
    });

    const data = await response.json() as any;
    if (!(data as any).ok) {
      throw new Error((data as any).error || 'OAuth failed');
    }

    return {
      access_token: (data as any).access_token,
      team_id: (data as any).team?.id,
      team_name: (data as any).team?.name,
      bot_user_id: (data as any).bot_user_id,
    };
  }

  verifyWebhook(signature: string, timestamp: string, body: any): boolean {
    const time = Math.floor(Date.now() / 1000);
    if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${JSON.stringify(body)}`;
    const mySignature = 'v0=' + crypto
      .createHmac('sha256', this.signingSecret)
      .update(sigBasestring, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  }

  async handleEvent(event: any): Promise<void> {
    try {
      // Get team integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('type', 'slack')
        .eq('credentials->>team_id', event.team)
        .eq('status', 'active')
        .single();

      if (!integration) {
        logger.warn(`No active Slack integration found for team ${event.team}`);
        return;
      }

      const teamId = integration.team_id;
      const credentials = integration.credentials as any;

      // Process different event types
      switch (event.type) {
        case 'message':
          if (!event.subtype || event.subtype === 'message_changed') {
            await this.processMessage(teamId, event, credentials);
          }
          break;
        case 'reaction_added':
          if (event.reaction === 'white_check_mark' || event.reaction === 'heavy_check_mark') {
            await this.markAsDecision(teamId, event, credentials);
          }
          break;
      }
    } catch (error) {
      logger.error('Slack event handling error:', error);
    }
  }

  private async processMessage(teamId: string, event: any, credentials: any): Promise<void> {
    const client = new WebClient(credentials.access_token);

    // Get user info
    let author = { id: event.user, name: 'Unknown User' };
    try {
      const userInfo = await client.users.info({ user: event.user });
      if (userInfo.ok && userInfo.user) {
        author = {
          id: event.user,
          name: userInfo.user.real_name || userInfo.user.name || 'Unknown User'
        };
      }
    } catch (error) {
      logger.warn(`Failed to fetch user info for ${event.user}`);
    }

    // Get channel info
    let channelName = event.channel;
    try {
      const channelInfo = await client.conversations.info({ channel: event.channel });
      if (channelInfo.ok && channelInfo.channel) {
        channelName = channelInfo.channel.name || event.channel;
      }
    } catch (error) {
      logger.warn(`Failed to fetch channel info for ${event.channel}`);
    }

    // Process files and attachments
    let contentWithAttachments = event.text || '';
    const attachments: any[] = [];

    // Handle files (images, documents, etc.)
    if (event.files && event.files.length > 0) {
      for (const file of event.files) {
        const fileInfo = {
          name: file.name,
          title: file.title,
          mimetype: file.mimetype,
          size: file.size,
          url: file.url_private || file.permalink,
          thumb: file.thumb_360 || file.thumb_80,
          isImage: file.mimetype?.startsWith('image/'),
        };
        
        attachments.push(fileInfo);
        
        // Add file info to content for GPT understanding
        contentWithAttachments += `\n[File: ${file.name} (${file.mimetype})]`;
        
        // For images, add description for GPT
        if (fileInfo.isImage) {
          contentWithAttachments += `\n[Image description: User shared an image named "${file.name}"]`;
          
          // For small images, we could download and include as base64
          // Uncomment below to enable image downloading (may increase storage)
          /*
          if (file.size < 1024 * 1024) { // Less than 1MB
            const base64Image = await this.downloadFileAsBase64(file.url_private, credentials.access_token);
            if (base64Image) {
              fileInfo.base64 = base64Image;
              contentWithAttachments += `\n[Image data available for AI analysis]`;
            }
          }
          */
        }
      }
    }

    // Handle message attachments (links, unfurls, etc.)
    if (event.attachments && event.attachments.length > 0) {
      for (const attachment of event.attachments) {
        if (attachment.title || attachment.text) {
          contentWithAttachments += `\n[Attachment: ${attachment.title || 'Link'}]`;
          if (attachment.text) {
            contentWithAttachments += `\n${attachment.text}`;
          }
        }
      }
    }

    // Detect if this is a decision or action item
    const type = this.detectMessageType(contentWithAttachments);

    // Create memory
    await memoryService.createMemory({
      teamId,
      content: contentWithAttachments,
      type,
      source: 'slack',
      sourceId: `${event.channel}_${event.ts}`,
      sourceUrl: `https://${credentials.team_id}.slack.com/archives/${event.channel}/p${event.ts.replace('.', '')}`,
      author,
      timestamp: new Date(parseFloat(event.ts) * 1000),
      metadata: {
        channel: channelName,
        thread_ts: event.thread_ts,
        has_files: event.files?.length > 0,
        files: attachments,
        original_text: event.text,
      },
    });
  }

  private detectMessageType(text: string): 'decision' | 'action_item' | 'discussion' {
    const decisionKeywords = [
      'decided', 'decision', 'we will', "let's go with", 'agreed',
      'conclusion', 'final', 'approved', 'confirmed',
    ];
    
    const actionKeywords = [
      'todo', 'action item', 'will do', 'assigned to', '@',
      'by end of', 'deadline', 'due', 'task', 'need to',
    ];

    const lowerText = text.toLowerCase();

    if (decisionKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'decision';
    }
    
    if (actionKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'action_item';
    }

    return 'discussion';
  }

  private async markAsDecision(teamId: string, event: any, credentials: any): Promise<void> {
    const client = new WebClient(credentials.access_token);

    // Get the message that was reacted to
    try {
      const result = await client.conversations.history({
        channel: event.item.channel,
        latest: event.item.ts,
        limit: 1,
        inclusive: true,
      });

      if (result.ok && result.messages && result.messages.length > 0) {
        // const message = result.messages[0];
        
        // Update the memory type to decision if it exists
        const sourceId = `${event.item.channel}_${event.item.ts}`;
        await supabaseAdmin
          .from('memories')
          .update({ type: 'decision' })
          .eq('team_id', teamId)
          .eq('source_id', sourceId);
      }
    } catch (error) {
      logger.error('Failed to mark message as decision:', error);
    }
  }

  private async downloadFileAsBase64(url: string, token: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        logger.error(`Failed to download file: ${response.statusText}`);
        return null;
      }

      const buffer = await response.buffer();
      const base64 = buffer.toString('base64');
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      logger.error('Error downloading file:', error);
      return null;
    }
  }

  async syncTeamData(teamId: string): Promise<void> {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('team_id', teamId)
        .eq('type', 'slack')
        .eq('status', 'active')
        .single();

      if (!integration) {
        throw new Error('No active Slack integration found');
      }

      const client = new WebClient((integration.credentials as any).access_token);

      // Get all channels
      const channels = await client.conversations.list({
        types: 'public_channel,private_channel',
      });

      if (!channels.ok || !channels.channels) {
        throw new Error('Failed to fetch channels');
      }

      // Sync messages from each channel (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const oldest = yesterday.getTime() / 1000;

      for (const channel of channels.channels) {
        if (!channel.id || !channel.is_member) continue;

        try {
          const messages = await client.conversations.history({
            channel: channel.id,
            oldest: oldest.toString(),
          });

          if (messages.ok && messages.messages) {
            for (const message of messages.messages) {
              if (message.type === 'message' && !message.subtype) {
                await this.processMessage(teamId, {
                  ...message,
                  channel: channel.id,
                }, (integration.credentials as any));
              }
            }
          }
        } catch (error) {
          logger.error(`Failed to sync channel ${channel.name}:`, error);
        }
      }

      logger.info(`Slack sync completed for team ${teamId}`);
    } catch (error) {
      logger.error('Slack sync error:', error);
      throw error;
    }
  }
}

export { SlackService };
export default new SlackService();