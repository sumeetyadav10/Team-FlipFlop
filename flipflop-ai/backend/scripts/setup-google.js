import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupGoogleIntegrations() {
  console.log('🔍 Google Integration Setup\n');

  // Check current status
  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')
    .in('type', ['gmail', 'google_calendar']);

  console.log('Current integrations:', integrations?.length || 0);

  // Test Google OAuth setup
  console.log('\n🔑 Google OAuth Configuration:');
  console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('API URL:', process.env.API_URL || 'https://flipflop.scanlyf.com');

  // Generate auth URLs
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://flipflop.scanlyf.com/api/integrations/gmail/callback'
  );

  console.log('\n📧 Gmail Integration:');
  const gmailAuthUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.labels',
    ],
    state: Buffer.from(JSON.stringify({ 
      teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
      userId: 'test' 
    })).toString('base64')
  });
  console.log('Auth URL:', gmailAuthUrl.substring(0, 80) + '...');

  console.log('\n📅 Calendar Integration:');
  const calendarAuthUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ],
    state: Buffer.from(JSON.stringify({ 
      teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
      userId: 'test' 
    })).toString('base64')
  });
  console.log('Auth URL:', calendarAuthUrl.substring(0, 80) + '...');

  console.log('\n\n📋 To complete setup:');
  console.log('1. Make sure your Google Cloud Console has:');
  console.log('   - Gmail API enabled');
  console.log('   - Google Calendar API enabled');
  console.log('   - OAuth consent screen configured');
  console.log('   - Redirect URIs added:');
  console.log('     • https://flipflop.scanlyf.com/api/integrations/gmail/callback');
  console.log('     • https://flipflop.scanlyf.com/api/integrations/calendar/callback');
  console.log('\n2. Visit the auth URLs above to authorize');
  console.log('\n3. Or use the frontend integration page');
}

setupGoogleIntegrations().catch(console.error);