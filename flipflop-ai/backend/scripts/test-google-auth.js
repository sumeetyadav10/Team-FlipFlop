import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function testGoogleAuth() {
  console.log('🧪 Testing Google OAuth After Adding Test Users\n');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://flipflop.scanlyf.com/api/integrations/gmail/callback'
  );

  // Generate auth URL for both Gmail and Calendar
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: Buffer.from(JSON.stringify({ 
      teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
      userId: 'test',
      integration: 'both' // both gmail and calendar
    })).toString('base64'),
    prompt: 'consent'
  });

  console.log('✅ Configuration Check:');
  console.log('======================');
  console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing');
  console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
  console.log('Redirect URI: https://flipflop.scanlyf.com/api/integrations/gmail/callback');
  console.log('\n✅ APIs Required:');
  console.log('================');
  console.log('- Gmail API');
  console.log('- Google Calendar API');
  console.log('\n✅ Scopes Requested:');
  console.log('===================');
  scopes.forEach(scope => {
    const name = scope.split('/').pop().replace('.readonly', ' (read)').replace('.labels', ' labels');
    console.log(`- ${name}`);
  });

  console.log('\n🔗 Authorization URL:');
  console.log('====================');
  console.log(authUrl);
  
  console.log('\n📋 Next Steps:');
  console.log('=============');
  console.log('1. Make sure you\'ve added your email as a test user');
  console.log('2. Click the authorization URL above');
  console.log('3. Sign in with a test user account');
  console.log('4. Grant all requested permissions');
  console.log('5. You\'ll be redirected to your app');
  console.log('6. The backend will save the integration automatically');
  
  console.log('\n🔍 Troubleshooting:');
  console.log('==================');
  console.log('- If you still see "Access blocked", make sure you added test users');
  console.log('- If redirect fails, check that the redirect URI matches exactly');
  console.log('- If permissions are missing, check that APIs are enabled in Google Cloud Console');
}

testGoogleAuth().catch(console.error);