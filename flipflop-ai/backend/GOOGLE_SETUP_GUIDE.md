# Google Gmail & Calendar Integration Guide

## Current Status
Your Google OAuth app is blocked because it hasn't completed Google's verification process. This is a security measure by Google for apps that haven't been verified.

## Quick Solution: Add Test Users

### Step 1: Add Test Users to Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select your project
3. Find the "Test users" section
4. Click "ADD USERS"
5. Add your Gmail account and any team members who need access
6. Save the changes

### Step 2: Test the Integration
Once you've added test users, run:
```bash
cd backend
node scripts/test-google-auth.js
```

This will generate an authorization URL. Click it and sign in with a test user account.

### Step 3: Verify Integration
After authorization, the integration will be saved automatically. You can verify it's working by checking the database:
```bash
node scripts/verify-integrations.js
```

## Alternative Solutions

### Option 1: Complete Google Verification (For Production)
1. Go to OAuth consent screen
2. Click "PUBLISH APP"
3. Submit for verification
4. Provide required documentation:
   - Privacy policy URL
   - Terms of service URL
   - Domain verification
   - Explanation of API usage
5. Wait for Google approval (7-21 days typically)

### Option 2: Use Service Account (For Google Workspace)
1. Create a service account in Google Cloud Console
2. Download the service account key JSON
3. Enable domain-wide delegation (admin required)
4. Update backend to use service account auth instead of OAuth

## Current Configuration
- **Client ID**: 872943089249-isitnd29mfl3q4pn7man7ujtev9uri5l.apps.googleusercontent.com
- **APIs Required**: Gmail API, Google Calendar API
- **Redirect URIs**: 
  - https://flipflop.scanlyf.com/api/integrations/gmail/callback
  - https://flipflop.scanlyf.com/api/integrations/calendar/callback

## What Happens After Authorization
1. User authorizes the app
2. Google redirects to your callback URL with an authorization code
3. Backend exchanges code for access/refresh tokens
4. Tokens are encrypted and stored in database
5. Background jobs sync emails and calendar events periodically
6. Team members can query this data through the chat interface

## Troubleshooting
- **"Access blocked" error**: You haven't added test users yet
- **"Redirect URI mismatch"**: The redirect URI in your code doesn't match Google Cloud Console
- **"Invalid scope"**: The Gmail or Calendar API isn't enabled in Google Cloud Console
- **Token expiration**: The backend automatically refreshes tokens using the refresh token