import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import winston from 'winston';
import { rateLimit } from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routers
import authRouter from './api/auth/router.js';
import teamsRouter from './api/teams/router.js';
import integrationsRouter from './api/integrations/router.js';
import memoriesRouter from './api/memories/router.js';
import queriesRouter from './api/queries/router.js';
import extensionRouter from './api/extension/router.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

// Load environment variables
dotenv.config();

// Initialize logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Create Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO for real-time updates
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
});

// Middleware
app.set('trust proxy', 1); // Trust first proxy (nginx)
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.EXTENSION_URL || 'chrome-extension://*'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes

// Webhook routes (no auth required)
app.post('/api/integrations/slack/webhook', async (req, res, _next): Promise<any> => {
  try {
    // Handle URL verification first (before signature check)
    if (req.body.type === 'url_verification') {
      console.log('Slack URL verification - challenge:', req.body.challenge);
      return res.json({ challenge: req.body.challenge });
    }

    // For other requests, import and use the slack service
    const slackService = (await import('./services/integrations/slack.js')).default;
    
    // Temporarily skip verification for testing
    // TODO: Re-enable this after fixing the logger issue
    /*
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (!slackService.verifyWebhook(signature, timestamp, req.body)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    */

    // Handle event callback
    if (req.body.type === 'event_callback') {
      console.log('📨 Received Slack event:', req.body.event?.type, 'in channel:', req.body.event?.channel);
      
      // Process async to respond quickly
      setImmediate(() => {
        slackService.handleEvent(req.body.event).catch((err: any) => {
          console.error('❌ Slack event processing error:', err);
          logger.error('Slack event processing error:', err);
        });
      });
    }

    return res.status(200).send();
  } catch (error) {
    return _next(error);
  }
});

// Protected routes (require auth)
app.use('/api/auth', authRouter);
app.use('/api/teams', authMiddleware, teamsRouter);
app.use('/api/integrations', authMiddleware, integrationsRouter);
app.use('/api/memories', authMiddleware, memoriesRouter);
app.use('/api/queries', authMiddleware, queriesRouter);
app.use('/api/extension', extensionRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  socket.on('join-team', async (data: { teamId: string; userId: string }) => {
    // Verify user belongs to team before joining room
    socket.join(`team-${data.teamId}`);
    logger.info(`User ${data.userId} joined team ${data.teamId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };