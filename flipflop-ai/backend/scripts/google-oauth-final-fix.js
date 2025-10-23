import dotenv from 'dotenv';

dotenv.config();

console.log('🚨 Google OAuth Access Denied - Final Fix\n');

console.log('The error "scanlyf.com has not completed the Google verification process" means:');
console.log('================================================================\n');

console.log('Option 1: Check OAuth App Settings (Most Common Fix)');
console.log('====================================================');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
console.log('2. Click on your OAuth 2.0 Client ID');
console.log('3. Check if the OAuth client was created under the correct project');
console.log('4. The project domain MUST match your actual domain\n');

console.log('Option 2: Create NEW OAuth Credentials (Quick Fix)');
console.log('=================================================');
console.log('Sometimes it\'s easier to start fresh:');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
console.log('2. Click "+ CREATE CREDENTIALS" > "OAuth client ID"');
console.log('3. Choose "Web application"');
console.log('4. Add authorized redirect URIs:');
console.log('   - https://flipflop.scanlyf.com/api/integrations/gmail/callback');
console.log('   - https://flipflop.scanlyf.com/api/integrations/calendar/callback');
console.log('5. Copy new Client ID and Secret to your .env file\n');

console.log('Option 3: Check Project Settings');
console.log('================================');
console.log('1. Go to: https://console.cloud.google.com');
console.log('2. Make sure you\'re in the RIGHT PROJECT');
console.log('3. Project name should match your app/domain');
console.log('4. Check project ID in the dropdown\n');

console.log('Option 4: Domain Verification (If needed)');
console.log('========================================');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/domainverification');
console.log('2. Add and verify your domain if not already done');
console.log('3. This might be required for your setup\n');

console.log('Option 5: Use Different Google Account');
console.log('=====================================');
console.log('Try creating the OAuth app with a different Google account:');
console.log('1. Log out of current Google account');
console.log('2. Create new project with mayurnaik205@gmail.com');
console.log('3. Enable APIs and create OAuth credentials there\n');

console.log('🔍 Debug Information:');
console.log('====================');
console.log('Current Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Domain in error: scanlyf.com');
console.log('Your actual domain: flipflop.scanlyf.com');
console.log('Test user: mayurnaik205@gmail.com\n');

console.log('🎯 Most Likely Solution:');
console.log('=======================');
console.log('The OAuth credentials were probably created in a project');
console.log('that\'s associated with "scanlyf.com" domain instead of');
console.log('"flipflop.scanlyf.com". Create new credentials in the');
console.log('correct project or update the existing project settings.');