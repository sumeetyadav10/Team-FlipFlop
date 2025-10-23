import notionService from '../dist/services/integrations/notion.js';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

async function testNotionSync() {
  console.log('🔄 Testing Notion sync...\n');

  // First check what's accessible
  const notion = new Client({ 
    auth: process.env.NOTION_INTEGRATION_TOKEN 
  });

  try {
    const response = await notion.search({
      page_size: 10
    });

    console.log('📊 Notion content status:');
    console.log(`Found ${response.results.length} accessible items\n`);

    if (response.results.length === 0) {
      console.log('❌ No content shared with integration!');
      console.log('\n📝 TO FIX:');
      console.log('1. Open a Notion page');
      console.log('2. Click Share → Add connections');
      console.log('3. Search for "team memory" and add it');
      console.log('4. Run this script again');
      return;
    }

    // Show what's available
    console.log('✅ Accessible content:');
    response.results.forEach((item, i) => {
      const title = item.properties?.title?.title?.[0]?.plain_text || 
                   item.properties?.Name?.title?.[0]?.plain_text || 
                   'Untitled';
      console.log(`${i + 1}. ${item.object}: ${title}`);
    });

    // Now try to sync
    console.log('\n🔄 Running sync...');
    await notionService.syncPages('af94ac3c-9dea-4e17-a1cd-2bf448a83142');
    
    console.log('✅ Sync completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNotionSync();