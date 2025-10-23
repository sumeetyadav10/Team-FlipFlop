import dotenv from 'dotenv';

dotenv.config();

console.log('🚨 Access Blocked Error - Domain Issue\n');

console.log('The error shows "scanlyf.com" but your app uses "flipflop.scanlyf.com"');
console.log('This mismatch is causing the access denied error.\n');

console.log('📋 Quick Fix Steps:');
console.log('===================');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
console.log('2. Click "EDIT APP" on your OAuth consent screen');
console.log('3. Check these settings:\n');

console.log('   Application name: Should match your app name');
console.log('   Application homepage: https://flipflop.scanlyf.com');
console.log('   Authorized domains: Add BOTH:');
console.log('     - scanlyf.com');
console.log('     - flipflop.scanlyf.com\n');

console.log('4. Make sure "Publishing status" shows "Testing"');
console.log('5. Verify test users section has: mayurnaik205@gmail.com\n');

console.log('🔍 Current Configuration Check:');
console.log('==============================');
console.log('Your OAuth URLs use: flipflop.scanlyf.com');
console.log('Error message shows: scanlyf.com');
console.log('This domain mismatch is the issue!\n');

console.log('📌 Alternative Solution:');
console.log('=======================');
console.log('If the above doesn\'t work, try:');
console.log('1. Create a new OAuth 2.0 Client ID');
console.log('2. Set it up fresh with correct domains');
console.log('3. Add these redirect URIs:');
console.log('   - https://flipflop.scanlyf.com/api/integrations/gmail/callback');
console.log('   - https://flipflop.scanlyf.com/api/integrations/calendar/callback\n');

console.log('🎯 Root Cause:');
console.log('=============');
console.log('Google is seeing your app as coming from "scanlyf.com" domain');
console.log('But your OAuth consent screen might be configured for a different domain');
console.log('The domains must match exactly!');