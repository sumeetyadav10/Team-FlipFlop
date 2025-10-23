import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupNotion() {
  console.log('Setting up Notion integration...\n');

  try {
    // Check if integration exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('*')
      .eq('type', 'notion')
      .eq('team_id', 'af94ac3c-9dea-4e17-a1cd-2bf448a83142')
      .single();

    if (existing) {
      console.log('✅ Notion integration already exists');
      return;
    }

    // Create integration
    const { data, error } = await supabase
      .from('integrations')
      .insert({
        team_id: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
        type: 'notion',
        status: 'active',
        credentials: {
          access_token: process.env.NOTION_INTEGRATION_TOKEN,
          workspace_name: 'Direct Integration'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating integration:', error);
    } else {
      console.log('✅ Created Notion integration successfully!');
      console.log('Integration ID:', data.id);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

setupNotion();