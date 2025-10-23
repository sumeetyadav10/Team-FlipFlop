import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Verifying OAuth Configuration\n');

console.log('✅ Checklist for Google Cloud Console:');
console.log('=====================================');
console.log('Go to: https://console.cloud.google.com\n');

console.log('1️⃣ OAuth Consent Screen:');
console.log('   □ App name: Your app name');
console.log('   □ User support email: Your email');
console.log('   □ Application home page: https://flipflop.scanlyf.com');
console.log('   □ Authorized domains:');
console.log('     □ scanlyf.com');
console.log('     □ flipflop.scanlyf.com');
console.log('   □ Developer contact: Your email\n');

console.log('2️⃣ Test Users Section:');
console.log('   □ mayurnaik205@gmail.com is listed');
console.log('   □ Status shows "Testing"\n');

console.log('3️⃣ OAuth 2.0 Client ID:');
console.log('   □ Client ID: ' + process.env.GOOGLE_CLIENT_ID);
console.log('   □ Authorized redirect URIs:');
console.log('     □ https://flipflop.scanlyf.com/api/integrations/gmail/callback');
console.log('     □ https://flipflop.scanlyf.com/api/integrations/calendar/callback\n');

console.log('4️⃣ APIs Enabled:');
console.log('   □ Gmail API');
console.log('   □ Google Calendar API\n');

console.log('⚠️  Common Issues:');
console.log('==================');
console.log('- Domain mismatch (scanlyf.com vs flipflop.scanlyf.com)');
console.log('- Test user email not added or misspelled');
console.log('- Redirect URIs not matching exactly');
console.log('- APIs not enabled\n');

console.log('🔧 If still blocked after fixing domains:');
console.log('========================================');
console.log('Try logging out of all Google accounts, then:');
console.log('1. Open incognito/private browser window');
console.log('2. Sign in ONLY with mayurnaik205@gmail.com');
console.log('3. Try the authorization URL again');