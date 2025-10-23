import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

console.log('🔍 Diagnosing Google OAuth Issues\n');

console.log('1. Environment Configuration:');
console.log('============================');
console.log('API_URL:', process.env.API_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');

console.log('\n2. Redirect URI Mismatch Found:');
console.log('================================');
console.log('❌ PROBLEM: Your code uses different redirect URIs:');
console.log('   - Gmail service: ' + process.env.API_URL + '/api/integrations/gmail/callback');
console.log('   - Calendar service: ' + process.env.API_URL + '/api/integrations/calendar/callback');
console.log('   - Calendar routes: ' + process.env.FRONTEND_URL + '/integrations/calendar/callback');

console.log('\n3. Required Google Cloud Console Settings:');
console.log('=========================================');
console.log('Add ALL these redirect URIs to your OAuth 2.0 Client:');
console.log('   ✅ https://flipflop.scanlyf.com/api/integrations/gmail/callback');
console.log('   ✅ https://flipflop.scanlyf.com/api/integrations/calendar/callback');

console.log('\n4. Test Authorization URLs:');
console.log('===========================');

// Create OAuth client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://flipflop.scanlyf.com/api/integrations/gmail/callback'
);

// Gmail auth URL
const gmailUrl = oauth2Client.generateAuthUrl({
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

console.log('Gmail Authorization URL:');
console.log(gmailUrl);

// Calendar auth URL with correct redirect
const calendarClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://flipflop.scanlyf.com/api/integrations/calendar/callback'
);

const calendarUrl = calendarClient.generateAuthUrl({
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

console.log('\nCalendar Authorization URL:');
console.log(calendarUrl);

console.log('\n5. Why You\'re Getting "Access Blocked":');
console.log('======================================');
console.log('The error happens because:');
console.log('1. Your OAuth app is in "Testing" mode and needs test users added');
console.log('2. OR the redirect URI in your request doesn\'t match Google Console exactly');
console.log('3. OR required APIs (Gmail API, Calendar API) aren\'t enabled');

console.log('\n6. Fix Steps:');
console.log('=============');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
console.log('2. Add test users (your email) under "Test users"');
console.log('3. Go to: https://console.cloud.google.com/apis/credentials');
console.log('4. Click on your OAuth 2.0 Client ID');
console.log('5. Add these exact redirect URIs:');
console.log('   - https://flipflop.scanlyf.com/api/integrations/gmail/callback');
console.log('   - https://flipflop.scanlyf.com/api/integrations/calendar/callback');
console.log('6. Save changes');
console.log('\n7. Then click one of the authorization URLs above to test!');