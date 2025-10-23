# FlipFlop AI Deployment Guide for flipflop.scanlyf.com

## 🚀 Quick Setup Overview

Your FlipFlop AI project is now configured to use `flipflop.scanlyf.com` as the backend domain.

## 📋 Configuration Summary

### ✅ **Backend Configuration**
- **Domain**: `https://flipflop.scanlyf.com`
- **Port**: 1243 (internal)
- **Environment**: Production ready
- **Database**: Supabase (configured and ready)

### ✅ **Extension Configuration**  
- **API Endpoint**: `https://flipflop.scanlyf.com/api`
- **Built and ready for Chrome installation**

## 🖥️ Server Deployment Steps

### 1. **DNS Setup**
Set up a subdomain `flipflop` pointing to your server `69.62.80.63`:
```bash
# DNS A Record
flipflop.scanlyf.com → 69.62.80.63
```

### 2. **Nginx/Apache Configuration**
Configure your web server to proxy requests to the Node.js app:

**Nginx Config Example:**
```nginx
server {
    listen 80;
    server_name flipflop.scanlyf.com;
    
    location / {
        proxy_pass http://localhost:1243;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. **SSL Certificate**
Install SSL certificate for HTTPS:
```bash
# Using certbot/Let's Encrypt
sudo certbot --nginx -d flipflop.scanlyf.com
```

### 4. **Deploy Backend**
Upload and run the backend on your server:
```bash
# On your server (69.62.80.63)
cd /path/to/flipflop-ai/backend
npm install --production
npm run build:prod
npm start

# Or with PM2 for production
pm2 start dist/index.js --name "flipflop-api"
pm2 startup
pm2 save
```

## 🔧 **Environment Variables**
Make sure your server `.env` file has:
```env
NODE_ENV=production
PORT=1243
API_URL=https://flipflop.scanlyf.com
FRONTEND_URL=https://flipflop.scanlyf.com

# All your existing Supabase, OpenAI, etc. credentials...
```

## 🌐 **Extension Installation**
1. **Build** (already done): Extension is built in `/extension/dist/`
2. **Load in Chrome**:
   - Open Chrome → Extensions → Developer mode
   - Click "Load unpacked" → Select `/extension/dist/` folder
3. **Extension will connect to**: `https://flipflop.scanlyf.com/api`

## 🔗 **Integration OAuth Callbacks**
Your integrations are configured to use:
- **Slack**: `https://flipflop.scanlyf.com/api/integrations/slack/callback`
- **Google Calendar**: `https://flipflop.scanlyf.com/api/integrations/calendar/callback`
- **GitHub**: `https://flipflop.scanlyf.com/api/integrations/github/callback`
- **Notion**: `https://flipflop.scanlyf.com/api/integrations/notion/callback`

Update your OAuth app settings in each service to use these callback URLs.

## ✅ **Verification Steps**
1. **Backend Health**: `https://flipflop.scanlyf.com/health`
2. **API Docs**: `https://flipflop.scanlyf.com/api/docs` (if implemented)
3. **Extension Login**: Test extension popup login

## 🚀 **Ready to Deploy!**
Your FlipFlop AI project is now configured and ready for `flipflop.scanlyf.com`!