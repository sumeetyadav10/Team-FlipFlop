import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

console.log('✅ Test User Added: mayurnaik205@gmail.com\n');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://flipflop.scanlyf.com/api/integrations/gmail/callback'
);

// Gmail Authorization URL
const gmailUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
  ],
  state: Buffer.from(JSON.stringify({ 
    teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
    userId: 'mayurnaik205' 
  })).toString('base64'),
  prompt: 'consent'
});

// Calendar Authorization URL
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
    userId: 'mayurnaik205' 
  })).toString('base64'),
  prompt: 'consent'
});

console.log('🎉 Ready to test! Click one of these links:\n');

console.log('📧 Gmail Integration:');
console.log(gmailUrl);

console.log('\n📅 Calendar Integration:');
console.log(calendarUrl);

console.log('\n📝 Instructions:');
console.log('1. Click one of the URLs above');
console.log('2. Sign in with: mayurnaik205@gmail.com');
console.log('3. Review and accept the permissions');
console.log('4. You\'ll be redirected back to your app');
console.log('5. The integration will be saved automatically');

console.log('\n🔍 What happens next:');
console.log('- The backend will exchange the code for access tokens');
console.log('- Tokens will be encrypted and stored in the database');
console.log('- Emails/calendar events will sync automatically');
console.log('- Team members can query this data through chat!');