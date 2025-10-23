import { google } from 'googleapis';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

console.log('🧪 Testing NEW Google OAuth Credentials\n');

console.log('✅ New Credentials Loaded:');
console.log('=========================');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing');

// Test Gmail
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
    userId: 'mayurnaik205' 
  })).toString('base64'),
  prompt: 'consent'
});

// Test Calendar
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

console.log('\n📧 Gmail Integration Test URL:');
console.log('==============================');
console.log(gmailUrl);

console.log('\n📅 Calendar Integration Test URL:');
console.log('=================================');
console.log(calendarUrl);

// Quick validation
console.log('\n🔍 Validating URLs...');

async function validateUrl(url, type) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (response.status === 302 || response.status === 303) {
      console.log(`✅ ${type} URL is valid - redirects to Google login`);
      return true;
    } else {
      console.log(`❌ ${type} URL issue - Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${type} validation error:`, error.message);
    return false;
  }
}

const gmailValid = await validateUrl(gmailUrl, 'Gmail');
const calendarValid = await validateUrl(calendarUrl, 'Calendar');

if (gmailValid && calendarValid) {
  console.log('\n🎉 Success! New credentials are working!');
  console.log('=========================================');
  console.log('1. Click either URL above');
  console.log('2. Sign in with: mayurnaik205@gmail.com');
  console.log('3. Accept all permissions');
  console.log('4. You should be redirected without errors!');
} else {
  console.log('\n⚠️  URL validation failed. Check credentials.');
}

console.log('\n📌 Troubleshooting:');
console.log('==================');
console.log('If you still get "access denied":');
console.log('1. Make sure the new OAuth client has these redirect URIs:');
console.log('   - https://flipflop.scanlyf.com/api/integrations/gmail/callback');
console.log('   - https://flipflop.scanlyf.com/api/integrations/calendar/callback');
console.log('2. Ensure mayurnaik205@gmail.com is added as test user');
console.log('3. Try in incognito mode signed in only with test account');