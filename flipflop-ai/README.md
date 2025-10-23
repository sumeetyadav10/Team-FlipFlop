# FlipFlop AI - Team Memory Platform

A comprehensive AI-powered platform that acts as a shared memory layer for teams, capturing decisions and context from various collaboration tools.

## Project Structure

```
flipflop-ai/
├── backend/        # Node.js/Express API server
├── extension/      # Chrome/Edge browser extension
├── mobile/         # React Native mobile app
├── landing/        # Next.js marketing website
├── infrastructure/ # Docker, K8s, deployment configs
├── scripts/        # Build and deployment scripts
└── docs/          # Additional documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL with pgvector
- Redis
- Android Studio / Xcode (for mobile development)

### Environment Setup
1. Copy `.env.example` to `.env` in each project
2. Fill in required API keys and configuration
3. Run setup script: `./scripts/setup.sh`

### Development
```bash
# Start all services
docker-compose up

# Or run individually
cd backend && npm run dev
cd extension && npm run dev
cd mobile && npm start
cd landing && npm run dev
```

## Architecture
- **Backend**: RESTful API with WebSocket support
- **Extension**: Minimal Chrome extension for Google Meet
- **Mobile**: React Native app with Expo
- **Landing**: Next.js 14 with App Router

## License
Proprietary - All rights reserved