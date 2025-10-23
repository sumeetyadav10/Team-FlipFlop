# Backend API Server Specification

## Overview
The backend API server is the central intelligence hub that collects data from various sources, processes it with AI, and serves intelligent responses to user queries.

## Tech Stack
- **Language**: Node.js with TypeScript (or Python with FastAPI)
- **Framework**: Express.js + TypeScript (or FastAPI)
- **Database**: PostgreSQL with pgvector extension
- **Cache**: Redis
- **Vector DB**: Pinecone or Qdrant (self-hosted)
- **Queue**: Bull (Redis-based) for async jobs
- **ORM**: Prisma (Node.js) or SQLAlchemy (Python)
- **Authentication**: JWT with refresh tokens
- **API Documentation**: Swagger/OpenAPI

## Core Features

### 1. Authentication & Team Management
- JWT-based authentication
- Team creation and invitation system
- Role-based access control (Admin, Member, Viewer)
- OAuth integration for Google/Slack

### 2. Data Ingestion Pipeline
- Webhook receivers for real-time data
- Batch processing for historical imports
- Deduplication logic
- Data normalization and enrichment

### 3. Memory Processing
- Automatic categorization (Decision, Action Item, Discussion)
- Entity extraction (people, projects, tools)
- Timestamp normalization across timezones
- Context linking between related memories

### 4. AI Integration
- LLM query processing (GPT-4/Claude)
- Embedding generation for semantic search
- Decision detection algorithms
- Summarization pipeline

### 5. Search & Retrieval
- Vector similarity search
- Keyword search with filters
- Time-based queries
- Source attribution

## API Endpoints

### Authentication
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/google
POST   /auth/invite-member
```

### Team Management
```
GET    /teams
POST   /teams
GET    /teams/:id
PUT    /teams/:id
DELETE /teams/:id
GET    /teams/:id/members
POST   /teams/:id/members
DELETE /teams/:id/members/:userId
```

### Integrations
```
GET    /integrations
POST   /integrations/slack/auth
GET    /integrations/slack/callback
POST   /integrations/slack/webhook
DELETE /integrations/slack

POST   /integrations/notion/auth
GET    /integrations/notion/callback
POST   /integrations/notion/webhook
DELETE /integrations/notion

POST   /integrations/gmail/auth
GET    /integrations/gmail/callback
POST   /integrations/gmail/sync
DELETE /integrations/gmail
```

### Memory Management
```
GET    /memories?q=&from=&to=&source=&type=
GET    /memories/:id
POST   /memories
PUT    /memories/:id
DELETE /memories/:id
POST   /memories/batch-import
```

### Query Interface
```
POST   /query
{
  "question": "What did we decide about the payment system?",
  "context": {
    "timeRange": "last_week",
    "sources": ["slack", "notion"],
    "team": "engineering"
  }
}

Response:
{
  "answer": "The team decided to use Stripe for payment processing...",
  "sources": [
    {
      "id": "mem_123",
      "type": "slack_message",
      "timestamp": "2024-01-15T10:30:00Z",
      "author": "John Doe",
      "content": "Let's go with Stripe for payments...",
      "url": "https://slack.com/..."
    }
  ],
  "confidence": 0.92,
  "relatedMemories": [...]
}
```

### Extension API
```
POST   /extension/capture
POST   /extension/meet/transcription
GET    /extension/status
```

### Mobile API
```
POST   /mobile/query
GET    /mobile/recent-queries
POST   /mobile/feedback
GET    /mobile/notifications
```

### Analytics
```
GET    /analytics/usage
GET    /analytics/decisions
GET    /analytics/team-insights
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  settings JSONB DEFAULT '{}'
);
```

### Memories Table
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  content TEXT NOT NULL,
  content_vector vector(1536),
  type VARCHAR(50), -- decision, action_item, discussion
  source VARCHAR(50), -- slack, notion, gmail, meet
  source_id VARCHAR(255),
  source_url TEXT,
  author JSONB,
  participants JSONB,
  timestamp TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memories_vector ON memories 
USING ivfflat (content_vector vector_cosine_ops);
```

### Integrations Table
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  type VARCHAR(50), -- slack, notion, gmail
  credentials JSONB, -- encrypted
  settings JSONB,
  last_sync TIMESTAMP,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Background Jobs

### 1. Data Sync Jobs
- Periodic sync from Slack (every 5 mins)
- Notion page change detection (webhook + polling)
- Gmail thread monitoring (every 10 mins)

### 2. Processing Jobs
- Embedding generation for new memories
- Decision detection on conversations
- Daily summary generation

### 3. Maintenance Jobs
- Old memory archival
- Vector index optimization
- Cache cleanup

## Security

### API Security
- Rate limiting per user/team
- API key authentication for extensions
- Request signing for webhooks
- Input validation and sanitization

### Data Security
- Encryption at rest for sensitive data
- Credential encryption with team-specific keys
- Audit logging for all data access
- GDPR compliance with data export/deletion

## Performance Optimization

### Caching Strategy
- Redis cache for frequent queries
- Memory cache for team settings
- CDN for static assets

### Database Optimization
- Proper indexing on search fields
- Partitioning for large memory tables
- Connection pooling
- Read replicas for analytics

### Query Optimization
- Limit vector search to recent memories first
- Pre-compute common aggregations
- Lazy loading for related data

## Monitoring & Logging

### Application Metrics
- API response times
- Error rates by endpoint
- Memory processing pipeline stats
- Integration sync success rates

### Infrastructure Metrics
- CPU and memory usage
- Database query performance
- Redis hit/miss rates
- Queue job processing times

### Error Tracking
- Sentry integration for exceptions
- Structured logging with context
- Alert thresholds for critical errors

## Deployment

### Environment Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  postgres:
    image: pgvector/pgvector:pg15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=flipflop
      - POSTGRES_USER=flipflop
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

### CI/CD Pipeline
- GitHub Actions for testing
- Docker build and push
- Blue-green deployment
- Health checks before switching

## Scaling Considerations

### Horizontal Scaling
- Stateless API servers
- Load balancing with Nginx
- Queue workers can scale independently
- Database read replicas

### Vertical Scaling
- Start with 4GB RAM, 2 CPU VPS
- Scale PostgreSQL separately
- Dedicated vector database instance

## API Response Examples

### Successful Query
```json
{
  "success": true,
  "data": {
    "answer": "Based on the team discussion on Monday, we decided to implement Stripe for payment processing. The key reasons were: 1) Better developer experience, 2) Lower fees for our volume, 3) Built-in fraud protection.",
    "sources": [
      {
        "id": "mem_abc123",
        "type": "slack_message",
        "timestamp": "2024-01-15T14:30:00Z",
        "author": {
          "name": "Sarah Chen",
          "email": "sarah@company.com"
        },
        "preview": "After comparing Stripe, PayPal, and Square, I think Stripe offers the best developer experience...",
        "url": "https://app.slack.com/client/T123/C456/thread/789"
      }
    ],
    "confidence": 0.89,
    "processingTime": 234
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds.",
    "details": {
      "limit": 100,
      "window": "15m",
      "remaining": 0,
      "resetAt": "2024-01-20T12:00:00Z"
    }
  }
}
```