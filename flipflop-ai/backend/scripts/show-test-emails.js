import dotenv from 'dotenv';

dotenv.config();

console.log('📧 Email Addresses to Add as Test Users in Google Console\n');

console.log('Add these emails to test users:');
console.log('================================');
console.log('1. Your personal Gmail account that you\'ll use to test');
console.log('2. Any team member emails who need access');
console.log('3. The email associated with your Google Cloud Console account');

console.log('\n💡 Examples of emails to add:');
console.log('- yourname@gmail.com');
console.log('- teammate@gmail.com');
console.log('- admin@yourdomain.com');

console.log('\n📝 How to add test users:');
console.log('========================');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
console.log('2. Select your project');
console.log('3. Scroll down to "Test users" section');
console.log('4. Click "+ ADD USERS"');
console.log('5. Enter email addresses (one at a time)');
console.log('6. Click "ADD" for each email');
console.log('7. Click "SAVE" when done');

console.log('\n⚠️  Important Notes:');
console.log('==================');
console.log('- Only emails listed as test users can authorize your app');
console.log('- You can add up to 100 test users');
console.log('- Test users can use the app even while it\'s in testing mode');
console.log('- No verification needed for test users');

console.log('\n🔍 Current OAuth Configuration:');
console.log('==============================');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID || 'Not configured');
console.log('Domain: flipflop.scanlyf.com');

console.log('\n✅ After adding test users, test with:');
console.log('=====================================');
console.log('cd backend && node scripts/fix-google-oauth.js');
console.log('Then click one of the authorization URLs!');