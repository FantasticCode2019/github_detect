import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import repositoryRoutes from './routes/repositories.js';
import issueRoutes from './routes/issues.js';
import pullRequestRoutes from './routes/pullRequests.js';
import detectionRoutes from './routes/detections.js';
import whitelistRoutes from './routes/whitelist.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notifications.js';
import webhookRoutes from './routes/webhooks.js';
import { syncWorker } from './services/syncWorker.js';

const app = express();
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/repositories', repositoryRoutes);
app.use('/issues', issueRoutes);
app.use('/pulls', pullRequestRoutes);
app.use('/detections', detectionRoutes);
app.use('/whitelist', whitelistRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/webhooks', webhookRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);

  // Start sync worker
  syncWorker.start(30000); // Check every 30 seconds
  console.log('⏰ Sync worker started (30s interval)');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  syncWorker.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  syncWorker.stop();
  await prisma.$disconnect();
  process.exit(0);
});
