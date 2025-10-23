import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_INTEGRATION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function extractPageContent(pageId) {
  try {
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    });
    
    let content = '';
    for (const block of blocks.results) {
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        content += block.paragraph.rich_text.map(t => t.plain_text).join('') + '\n';
      } else if (block.type === 'heading_1' && block.heading_1?.rich_text) {
        content += '# ' + block.heading_1.rich_text.map(t => t.plain_text).join('') + '\n';
      } else if (block.type === 'heading_2' && block.heading_2?.rich_text) {
        content += '## ' + block.heading_2.rich_text.map(t => t.plain_text).join('') + '\n';
      } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
        content += '• ' + block.bulleted_list_item.rich_text.map(t => t.plain_text).join('') + '\n';
      }
    }
    return content;
  } catch (error) {
    console.error('Error extracting content:', error.message);
    return '';
  }
}

async function syncNotion() {
  console.log('🔄 Starting Notion sync...\n');
  
  try {
    // Get all accessible pages
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      page_size: 100
    });
    
    console.log(`Found ${response.results.length} pages to sync\n`);
    
    let synced = 0;
    for (const page of response.results) {
      if (page.object !== 'page') continue;
      
      // Extract title
      const title = page.properties?.title?.title?.[0]?.plain_text || 
                   page.properties?.Name?.title?.[0]?.plain_text || 
                   'Untitled';
      
      console.log(`Syncing: ${title}`);
      
      // Get page content
      const content = await extractPageContent(page.id);
      
      // Generate embedding (simplified - just using length as mock)
      const mockEmbedding = new Array(1536).fill(0.1);
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('memories')
        .select('id')
        .eq('source_id', page.id)
        .single();
      
      let error;
      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('memories')
          .update({
            content: `${title}\n\n${content}`,
            content_vector: mockEmbedding,
            timestamp: new Date(page.last_edited_time).toISOString(),
          })
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('memories')
          .insert({
            team_id: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
            content: `${title}\n\n${content}`,
            content_vector: mockEmbedding,
            type: 'document',
            source: 'notion',
            source_id: page.id,
            source_url: page.url,
            timestamp: new Date(page.last_edited_time).toISOString(),
            metadata: {
              page_id: page.id,
              title: title
            }
          });
        error = insertError;
      }
      
      if (error) {
        console.error(`  ❌ Error:`, error.message);
      } else {
        console.log(`  ✅ Saved`);
        synced++;
      }
    }
    
    console.log(`\n✅ Sync complete! ${synced} pages saved to team memory.`);
    
  } catch (error) {
    console.error('Sync error:', error.message);
  }
}

syncNotion();