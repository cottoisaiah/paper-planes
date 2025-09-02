import express from 'express';
import PlatformTwitterService from '../services/PlatformTwitterService';
import { authenticate } from '../middleware/auth';
import User from '../models/User';
import logger from '../utils/logger';

const router = express.Router();

/**
 * GET /api/social/followers
 * Get user's followers using platform credentials
 */
router.get('/followers', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user || !user.xUsername) {
      return res.status(404).json({ error: 'User not found or missing X username' });
    }

    const maxResults = parseInt(req.query.limit as string) || 100;
    
    logger.info(`Fetching followers for user ${user.xUsername}`);
    
    const followers = await PlatformTwitterService.getUserFollowers(user.xUsername, maxResults);
    
    res.json({
      success: true,
      username: user.xUsername,
      followers,
      count: followers.length
    });

  } catch (error: any) {
    logger.error('Error fetching followers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch followers',
      details: error.message,
      code: error.code
    });
  }
});

/**
 * GET /api/social/following
 * Get user's following list using platform credentials
 */
router.get('/following', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user || !user.xUsername) {
      return res.status(404).json({ error: 'User not found or missing X username' });
    }

    const maxResults = parseInt(req.query.limit as string) || 100;
    
    logger.info(`Fetching following for user ${user.xUsername}`);
    
    const following = await PlatformTwitterService.getUserFollowing(user.xUsername, maxResults);
    
    res.json({
      success: true,
      username: user.xUsername,
      following,
      count: following.length
    });

  } catch (error: any) {
    logger.error('Error fetching following:', error);
    res.status(500).json({ 
      error: 'Failed to fetch following',
      details: error.message,
      code: error.code
    });
  }
});

/**
 * GET /api/social/tweets
 * Get user's recent tweets using platform credentials
 */
router.get('/tweets', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user || !user.xUsername) {
      return res.status(404).json({ error: 'User not found or missing X username' });
    }

    const maxResults = parseInt(req.query.limit as string) || 50;
    
    logger.info(`Fetching tweets for user ${user.xUsername}`);
    
    const tweets = await PlatformTwitterService.getUserTweets(user.xUsername, maxResults);
    
    res.json({
      success: true,
      username: user.xUsername,
      tweets,
      count: tweets.length
    });

  } catch (error: any) {
    logger.error('Error fetching tweets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tweets',
      details: error.message,
      code: error.code
    });
  }
});

/**
 * POST /api/social/refresh-metrics
 * Refresh user's social metrics using platform credentials
 */
router.post('/refresh-metrics', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user || !user.xUsername) {
      return res.status(404).json({ error: 'User not found or missing X username' });
    }

    logger.info(`Refreshing metrics for user ${user.xUsername}`);
    
    const updatedMetrics = await PlatformTwitterService.updateUserMetrics(user.xUsername);
    
    res.json({
      success: true,
      message: 'Metrics updated successfully',
      data: updatedMetrics
    });

  } catch (error: any) {
    logger.error('Error refreshing metrics:', error);
    res.status(500).json({ 
      error: 'Failed to refresh metrics',
      details: error.message,
      code: error.code
    });
  }
});

/**
 * GET /api/social/test-connection
 * Test platform Twitter API connection (admin only)
 */
router.get('/test-connection', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    logger.info('Testing platform Twitter API connection');
    
    const isConnected = await PlatformTwitterService.testConnection();
    
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'Platform Twitter API is working' : 'Platform Twitter API connection failed'
    });

  } catch (error: any) {
    logger.error('Error testing connection:', error);
    res.status(500).json({ 
      error: 'Failed to test connection',
      details: error.message
    });
  }
});

export default router;
