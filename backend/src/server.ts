import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import authRoutes from './routes/auth';
import missionRoutes from './routes/missions';
import botRoutes from './routes/bots';
import contextRoutes from './routes/context';
import postRoutes from './routes/posts';
import adminRoutes from './routes/admin';
import stripeRoutes from './routes/stripe';
import twitterAuthRoutes from './routes/twitterAuth';
import analyticsRoutes from './routes/analytics';
import socialRoutes from './routes/social';

const app = express();
const PORT = process.env.PORT || 5000;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Middleware
app.set('trust proxy', 1); // Trust only the first proxy (nginx)
app.use(helmet());
app.use(cors());
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/twitter-auth', twitterAuthRoutes); // For twitter auth
app.use('/api/analytics', analyticsRoutes); // Analytics and AI content generation
app.use('/api/social', socialRoutes); // Social data with platform credentials

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
