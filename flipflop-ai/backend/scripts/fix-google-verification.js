import dotenv from 'dotenv';

dotenv.config();

console.log('🚨 Google OAuth Verification Fix\n');

console.log('Your app is blocked because it hasn\'t completed Google\'s verification process.');
console.log('Here are your options to fix this:\n');

console.log('Option 1: Add Test Users (Quick Fix - Recommended)');
console.log('================================================');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
console.log('2. Select your project');
console.log('3. Under "Test users", click "ADD USERS"');
console.log('4. Add these email addresses:');
console.log('   - Your Gmail account');
console.log('   - Any team members who need access');
console.log('5. Save the changes\n');

console.log('Option 2: Complete Verification (Production)');
console.log('===========================================');
console.log('1. Go to OAuth consent screen');
console.log('2. Click "PUBLISH APP"');
console.log('3. Submit for verification');
console.log('4. Wait for Google approval (can take days/weeks)\n');

console.log('Option 3: Use Service Account (Alternative)');
console.log('=========================================');
console.log('1. Create a service account in Google Cloud Console');
console.log('2. Enable domain-wide delegation (for Google Workspace)');
console.log('3. Use service account credentials instead of OAuth\n');

console.log('Current Configuration:');
console.log('=====================');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID || 'Not set');
console.log('Redirect URIs configured:');
console.log('- https://flipflop.scanlyf.com/api/integrations/gmail/callback');
console.log('- https://flipflop.scanlyf.com/api/integrations/calendar/callback\n');

console.log('📧 Once you add test users, use this URL to authorize:');

const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly'
];

const params = new URLSearchParams({
  client_id: process.env.GOOGLE_CLIENT_ID,
  redirect_uri: 'https://flipflop.scanlyf.com/api/integrations/gmail/callback',
  response_type: 'code',
  scope: scopes.join(' '),
  access_type: 'offline',
  prompt: 'consent',
  state: Buffer.from(JSON.stringify({ 
    teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
    userId: 'test' 
  })).toString('base64')
});

console.log(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);