import { Client } from '@notionhq/client';
import { supabaseAdmin } from '../supabase.js';
import { logger } from '../../index.js';
import memoryService from '../memory.js';

class NotionService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.NOTION_CLIENT_ID!;
    this.clientSecret = process.env.NOTION_CLIENT_SECRET!;
  }

  getAuthUrl(teamId: string, userId: string): string {
    const state = Buffer.from(JSON.stringify({ teamId, userId })).toString('base64');
    return `https://api.notion.com/v1/oauth/authorize?client_id=${this.clientId}&response_type=code&owner=user&state=${state}&redirect_uri=${encodeURIComponent(`${process.env.API_URL}/api/integrations/notion/callback`)}`;
  }

  async handleCallback(code: string): Promise<any> {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.API_URL}/api/integrations/notion/callback`,
      }),
    });

    const data = await response.json() as any;
    if (!(data as any).access_token) {
      throw new Error('OAuth failed');
    }

    return {
      access_token: (data as any).access_token,
      workspace_id: (data as any).workspace_id,
      workspace_name: (data as any).workspace_name,
    };
  }

  async syncPages(teamId: string): Promise<void> {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('team_id', teamId)
        .eq('type', 'notion')
        .eq('status', 'active')
        .single();

      if (!integration) {
        throw new Error('No active Notion integration found');
      }

      const notion = new Client({
        auth: integration.credentials.access_token,
      });

      // Search for recently updated pages
      const response = await notion.search({
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 50,
      });

      for (const page of response.results) {
        if (page.object === 'page' && 'properties' in page) {
          const title = this.extractTitle(page.properties);
          const content = await this.getPageContent(notion, page.id);

          await memoryService.createMemory({
            teamId,
            content: `${title}\n\n${content}`,
            type: 'document',
            source: 'notion',
            sourceId: page.id,
            sourceUrl: page.url,
            timestamp: new Date(page.last_edited_time),
            metadata: {
              pageId: page.id,
              parent: page.parent,
            },
          });
        }
      }

      logger.info(`Notion sync completed for team ${teamId}`);
    } catch (error) {
      logger.error('Notion sync error:', error);
      throw error;
    }
  }

  private extractTitle(properties: any): string {
    const titleProp = Object.values(properties).find(
      (prop: any) => prop.type === 'title'
    ) as any;

    if (titleProp?.title?.[0]?.plain_text) {
      return titleProp.title[0].plain_text;
    }

    return 'Untitled';
  }

  private async getPageContent(notion: Client, pageId: string): Promise<string> {
    try {
      const blocks = await notion.blocks.children.list({ block_id: pageId });
      return blocks.results
        .map((block: any) => {
          if (block.type === 'paragraph') {
            return block.paragraph.rich_text
              .map((text: any) => text.plain_text)
              .join('');
          }
          // Add more block types as needed
          return '';
        })
        .filter(Boolean)
        .join('\n');
    } catch (error) {
      logger.error(`Failed to get content for page ${pageId}:`, error);
      return '';
    }
  }
}

export { NotionService };
export default new NotionService();