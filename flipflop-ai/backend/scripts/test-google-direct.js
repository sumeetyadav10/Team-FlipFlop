import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function testGoogleDirect() {
  console.log('🔍 Testing Google APIs directly\n');

  // For direct access, you need either:
  // 1. Service account credentials (recommended for server apps)
  // 2. OAuth tokens from user authorization

  // Check what we have
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('❌ Missing Google Client ID');
    return;
  }

  console.log('✅ Google OAuth credentials found\n');
  
  console.log('To integrate Gmail and Calendar, you need to:\n');
  
  console.log('1. Go to Google Cloud Console:');
  console.log('   https://console.cloud.google.com/apis/dashboard\n');
  
  console.log('2. Enable these APIs:');
  console.log('   - Gmail API');
  console.log('   - Google Calendar API\n');
  
  console.log('3. Configure OAuth consent screen:');
  console.log('   - Add your app name');
  console.log('   - Add scopes for Gmail and Calendar\n');
  
  console.log('4. Add redirect URIs to your OAuth client:');
  console.log('   - https://flipflop.scanlyf.com/api/integrations/gmail/callback');
  console.log('   - https://flipflop.scanlyf.com/api/integrations/calendar/callback\n');
  
  console.log('5. Then users can authorize through your app!\n');
  
  // Generate manual auth URL for testing
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://flipflop.scanlyf.com/api/integrations/gmail/callback'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ]
  });
  
  console.log('📧 Quick test - authorize here:');
  console.log(authUrl);
}

testGoogleDirect().catch(console.error);