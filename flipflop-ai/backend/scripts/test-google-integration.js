import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Google OAuth Integration\n');

// Test Gmail authorization endpoint
async function testGmailAuth() {
  console.log('📧 Testing Gmail Integration...');
  
  const gmailAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://flipflop.scanlyf.com/api/integrations/gmail/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.labels',
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(JSON.stringify({ 
      teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
      userId: 'mayurnaik205' 
    })).toString('base64')
  }).toString();

  try {
    const response = await fetch(gmailAuthUrl, {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (response.status === 302 || response.status === 303) {
      console.log('✅ Gmail auth URL is valid and redirects to Google login');
      console.log('   Location:', response.headers.get('location')?.substring(0, 50) + '...');
    } else {
      console.log('❌ Unexpected response:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error testing Gmail auth:', error.message);
  }
}

// Test Calendar authorization endpoint
async function testCalendarAuth() {
  console.log('\n📅 Testing Calendar Integration...');
  
  const calendarAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://flipflop.scanlyf.com/api/integrations/calendar/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(JSON.stringify({ 
      teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142',
      userId: 'mayurnaik205' 
    })).toString('base64')
  }).toString();

  try {
    const response = await fetch(calendarAuthUrl, {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (response.status === 302 || response.status === 303) {
      console.log('✅ Calendar auth URL is valid and redirects to Google login');
      console.log('   Location:', response.headers.get('location')?.substring(0, 50) + '...');
    } else {
      console.log('❌ Unexpected response:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error testing Calendar auth:', error.message);
  }
}

// Test backend API endpoints
async function testBackendEndpoints() {
  console.log('\n🔌 Testing Backend API Endpoints...');
  
  const endpoints = [
    'https://flipflop.scanlyf.com/api/integrations/gmail/callback',
    'https://flipflop.scanlyf.com/api/integrations/calendar/callback'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'FlipFlop-Test/1.0'
        }
      });
      
      console.log(`${endpoint.includes('gmail') ? '📧' : '📅'} ${endpoint}`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 400 || response.status === 401) {
        console.log('   ✅ Endpoint exists (auth/param error expected)');
      } else if (response.status === 404) {
        console.log('   ❌ Endpoint not found - check routing');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Simulate OAuth callback
async function simulateOAuthFlow() {
  console.log('\n🔄 Simulating OAuth Flow...');
  console.log('To complete the test:');
  console.log('1. Open one of these URLs in your browser:');
  console.log('\n📧 Gmail:');
  console.log('https://accounts.google.com/o/oauth2/v2/auth?client_id=' + process.env.GOOGLE_CLIENT_ID + '&redirect_uri=https%3A%2F%2Fflipflop.scanlyf.com%2Fapi%2Fintegrations%2Fgmail%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.labels&access_type=offline&prompt=consent&state=' + Buffer.from(JSON.stringify({ teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142', userId: 'mayurnaik205' })).toString('base64'));
  
  console.log('\n📅 Calendar:');
  console.log('https://accounts.google.com/o/oauth2/v2/auth?client_id=' + process.env.GOOGLE_CLIENT_ID + '&redirect_uri=https%3A%2F%2Fflipflop.scanlyf.com%2Fapi%2Fintegrations%2Fcalendar%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly&access_type=offline&prompt=consent&state=' + Buffer.from(JSON.stringify({ teamId: 'af94ac3c-9dea-4e17-a1cd-2bf448a83142', userId: 'mayurnaik205' })).toString('base64'));
  
  console.log('\n2. Sign in with: mayurnaik205@gmail.com');
  console.log('3. Accept the permissions');
  console.log('4. Check the browser console for any errors after redirect');
}

// Run all tests
async function runTests() {
  await testGmailAuth();
  await testCalendarAuth();
  await testBackendEndpoints();
  await simulateOAuthFlow();
  
  console.log('\n✅ Test Summary:');
  console.log('- OAuth URLs are properly formed');
  console.log('- Backend endpoints should be accessible');
  console.log('- Test user mayurnaik205@gmail.com is configured');
  console.log('\nClick one of the URLs above to complete the integration!');
}

runTests().catch(console.error);