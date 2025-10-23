# FlipFlop AI - Team Memory Platform

AI-powered platform that captures and recalls team decisions, discussions, and knowledge across all your work tools.

## Project Structure

```
Team-FlipFlop/
├── backend/          # Node.js/Express API with Supabase
├── extension/        # Chrome/Edge browser extension
├── docs/            # Project documentation
│   ├── BACKEND_API_SPEC.md
│   ├── BROWSER_EXTENSION_SPEC.md
│   ├── MOBILE_APP_SPEC.md
│   └── LANDING_PAGE_SPEC.md
└── README.md
```

## Quick Start

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev
```

### Extension Development

```bash
cd extension
npm install
npm run dev
```

Then load the `extension/dist` folder as an unpacked extension in Chrome/Edge.

## Architecture

- **Backend**: RESTful API with Supabase for database, Redis for caching
- **Extension**: Manifest V3 Chrome extension for Google Meet transcription
- **Mobile App**: React Native (developed separately)
- **Landing Page**: Next.js marketing site (developed separately)

## Features

- 🔌 Direct API integrations (Slack, Notion, Gmail)
- 🎥 Real-time Google Meet transcription
- 💬 Natural language queries
- 🔍 Semantic search across all data
- 📱 Mobile app for on-the-go access
- 🔒 Enterprise-grade security

## Development Status

- ✅ Backend API implementation
- ✅ Database schema with Supabase
- ✅ Authentication system
- ✅ Integration APIs (Slack, Notion, Gmail)
- ✅ Memory storage and search
- ✅ Browser extension structure
- 🚧 Google Meet transcription
- 📱 Mobile app (external development)
- 🎨 Landing page (external development)

## API Documentation

See `BACKEND_API_SPEC.md` for detailed API documentation.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Proprietary - All rights reserved