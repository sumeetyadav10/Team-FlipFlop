import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function verifyGoogleAPIs() {
  console.log('🔍 Verifying Google APIs Configuration\n');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://flipflop.scanlyf.com/api/integrations/gmail/callback'
  );

  console.log('✅ OAuth2 client configured\n');

  // Generate auth URLs
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
      userId: 'test' 
    })).toString('base64')
  });

  console.log('📧 Gmail & Calendar Authorization URL:');
  console.log(authUrl);
  console.log('\n📋 What this gives access to:');
  console.log('- Read Gmail messages');
  console.log('- Read Gmail labels');
  console.log('- Read Calendar events');
  console.log('- Read Calendar details');
  
  console.log('\n🔧 To complete setup:');
  console.log('1. Click the URL above');
  console.log('2. Sign in with Google');
  console.log('3. Grant permissions');
  console.log('4. You\'ll be redirected to your app');
  console.log('5. The integration will be saved automatically');
  
  console.log('\n⚠️  If you get "redirect_uri_mismatch" error:');
  console.log('Add this to your OAuth client in Google Cloud Console:');
  console.log('https://flipflop.scanlyf.com/api/integrations/gmail/callback');
}

verifyGoogleAPIs().catch(console.error);