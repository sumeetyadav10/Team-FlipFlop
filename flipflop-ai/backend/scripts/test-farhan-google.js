import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Google OAuth with farhanmanikofficial@gmail.com\n');

console.log('✅ Test User: farhanmanikofficial@gmail.com');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);

// Gmail Integration URL
const gmailClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://flipflop.scanlyf.com/api/integrations/gmail/callback'
);

const gmailUrl = gmailClient.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
  ],
  state: Buffer.from(JSON.stringify({ 
    teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
    userId: 'farhanmanikofficial' 
  })).toString('base64'),
  prompt: 'consent'
});

// Calendar Integration URL
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
    userId: 'farhanmanikofficial' 
  })).toString('base64'),
  prompt: 'consent'
});

console.log('\n📧 Gmail Integration URL for Farhan:');
console.log('====================================');
console.log(gmailUrl);

console.log('\n📅 Calendar Integration URL for Farhan:');
console.log('=======================================');
console.log(calendarUrl);

console.log('\n📝 Instructions:');
console.log('================');
console.log('1. Make sure farhanmanikofficial@gmail.com is added as test user in Google Console');
console.log('2. Click one of the URLs above');
console.log('3. Sign in with: farhanmanikofficial@gmail.com');
console.log('4. Accept all permissions');
console.log('5. You\'ll be redirected to your app');

console.log('\n🔍 What will happen:');
console.log('===================');
console.log('- Google will authenticate farhanmanikofficial@gmail.com');
console.log('- Your backend will receive an authorization code');
console.log('- The code will be exchanged for access tokens');
console.log('- Gmail/Calendar data will sync automatically');

console.log('\n⚠️  Important:');
console.log('=============');
console.log('If you get "access denied", add farhanmanikofficial@gmail.com as test user:');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
console.log('2. Click "ADD USERS" under Test users');
console.log('3. Add: farhanmanikofficial@gmail.com');
console.log('4. Save changes and try again');