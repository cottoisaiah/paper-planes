import express from 'express';
import { authenticate, requireActiveSubscription } from '../middleware/auth';
import AnalyticsService from '../services/AnalyticsService';
import XAIService from '../services/XAIService';
import ContextFunnel from '../models/ContextFunnel';
import GeneratedPost from '../models/GeneratedPost';
import SocialMetricsService from '../services/SocialMetricsService';
import User from '../models/User';
import logger from '../utils/logger';

const router = express.Router();

// Get analytics data for charts
router.get('/data/:days?', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.params.days || '30') || 30;
    
    const data = await AnalyticsService.getAnalyticsData(userId, days);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error fetching analytics data', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
});

// Get engagement summary for dashboard
router.get('/summary', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const summary = await AnalyticsService.getEngagementSummary(userId);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    logger.error('Error fetching engagement summary', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to fetch engagement summary' });
  }
});

// Get user social metrics (followers, following, etc.)
router.get('/social-metrics', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Refresh metrics if needed (in background)
    SocialMetricsService.refreshMetricsIfNeeded(userId).catch(err => {
      logger.warn('Background metrics refresh failed', { error: err.message, userId });
    });
    
    const metrics = await SocialMetricsService.getUserMetrics(userId);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    logger.error('Error fetching social metrics', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to fetch social metrics' });
  }
});

// Generate AI content with Grok-4 (SUBSCRIPTION REQUIRED)
router.post('/generate-content', authenticate, requireActiveSubscription, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { prompt, contextIds, style, variationCount } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    // Get context data if contextIds provided
    let contextData = '';
    if (contextIds && contextIds.length > 0) {
      const contexts = await ContextFunnel.find({ 
        _id: { $in: contextIds }, 
        userId: userId 
      });
      contextData = contexts.map(c => c.data).join('\n\n');
    }

    // Generate content using XAI
    const result = await XAIService.generateContent({
      prompt,
      userId,
      useContext: !!contextData,
      maxTokens: 1000,
      temperature: 0.7
    });
    
    if (!result) {
      return res.status(500).json({ success: false, message: 'Failed to generate content' });
    }
    
    // Save the generated post
    const post = new GeneratedPost({
      userId,
      prompt,
      content: result.content,
      contextIds: contextIds || [],
      style: style || 'default',
      isPosted: false
    });
    
    await post.save();
    
    res.json({ 
      success: true, 
      data: { 
        content: result.content, 
        postId: post._id,
        tokensUsed: result.tokensUsed
      } 
    });
  } catch (error: any) {
    logger.error('Error generating content', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// Get engagement summary for dashboard
router.get('/summary', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const summary = await AnalyticsService.getEngagementSummary(userId);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    logger.error('Error fetching analytics summary', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to fetch analytics summary' });
  }
});

// Get followers list
router.get('/followers/:maxResults?', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const maxResults = parseInt(req.params.maxResults || '100') || 100;
    
    const followers = await AnalyticsService.getFollowersList(userId, maxResults);
    
    // If no followers returned, provide helpful message
    if (followers.length === 0) {
      res.json({ 
        success: true, 
        data: followers,
        message: 'Twitter API authentication issue. Please check your API keys in the X Developer Portal.',
        suggestion: 'Regenerate your API keys and access tokens in the Hydra.REDEX app settings.'
      });
    } else {
      res.json({ success: true, data: followers });
    }
  } catch (error: any) {
    logger.error('Error fetching followers', { error: error.message, userId: req.user.id });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch followers',
      error: error.message
    });
  }
});

// Trigger manual analytics collection
router.post('/collect', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data = await AnalyticsService.collectEngagementData(userId);
    
    if (data) {
      res.json({ success: true, message: 'Analytics data collected successfully', data });
    } else {
      res.status(400).json({ success: false, message: 'Failed to collect analytics data' });
    }
  } catch (error: any) {
    logger.error('Error collecting analytics data', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to collect analytics data' });
  }
});

// Generate content with Grok
router.post('/generate-content', authenticate, requireActiveSubscription, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { prompt, useContext, contextId, maxTokens, temperature, style } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const request = {
      prompt,
      useContext: useContext || false,
      contextId,
      userId,
      maxTokens,
      temperature
    };

    let result;
    if (style) {
      result = await XAIService.generateStyledContent(request, style);
    } else {
      result = await XAIService.generateContent(request);
    }

    if (result) {
      // Save generated content
      const generatedPost = new GeneratedPost({
        userId,
        content: result.content,
        platform: 'twitter',
        status: 'draft',
        aiGenerated: true,
        aiModel: result.model,
        tokensUsed: result.tokensUsed,
        contextUsed: result.contextUsed
      });
      
      await generatedPost.save();

      res.json({ success: true, data: result, postId: generatedPost._id });
    } else {
      res.status(400).json({ success: false, message: 'Failed to generate content' });
    }
  } catch (error: any) {
    logger.error('Error generating content', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// Generate multiple content variations
router.post('/generate-variations', authenticate, requireActiveSubscription, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { prompt, useContext, contextId, count = 3 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const request = {
      prompt,
      useContext: useContext || false,
      contextId,
      userId
    };

    const variations = await XAIService.generateMultipleVariations(request, count);
    
    if (variations.length > 0) {
      // Save all variations
      const savedPosts = [];
      for (const variation of variations) {
        const generatedPost = new GeneratedPost({
          userId,
          content: variation.content,
          platform: 'twitter',
          status: 'draft',
          aiGenerated: true,
          aiModel: variation.model,
          tokensUsed: variation.tokensUsed,
          contextUsed: variation.contextUsed
        });
        
        await generatedPost.save();
        savedPosts.push(generatedPost._id);
      }

      res.json({ success: true, data: variations, postIds: savedPosts });
    } else {
      res.status(400).json({ success: false, message: 'Failed to generate content variations' });
    }
  } catch (error: any) {
    logger.error('Error generating content variations', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to generate content variations' });
  }
});

// Get available context items
router.get('/context', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const contexts = await ContextFunnel.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: contexts });
  } catch (error: any) {
    logger.error('Error fetching context items', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to fetch context items' });
  }
});

// Add new context
router.post('/context', authenticate, requireActiveSubscription, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { data, type, filename } = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, message: 'Context data is required' });
    }

    const context = new ContextFunnel({
      userId,
      data,
      type: type || 'text',
      filename
    });
    
    await context.save();
    res.json({ success: true, data: context });
  } catch (error: any) {
    logger.error('Error saving context', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to save context' });
  }
});

// Delete context
router.delete('/context/:id', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const contextId = req.params.id;
    
    const deleted = await ContextFunnel.findOneAndDelete({ _id: contextId, userId });
    
    if (deleted) {
      res.json({ success: true, message: 'Context deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Context not found' });
    }
  } catch (error: any) {
    logger.error('Error deleting context', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Failed to delete context' });
  }
});

// Validate XAI connection
router.get('/xai-status', authenticate, async (req: any, res: any) => {
  try {
    const isConnected = await XAIService.validateConnection();
    res.json({ success: true, connected: isConnected });
  } catch (error: any) {
    logger.error('Error checking XAI status', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to check XAI status' });
  }
});

// Get Twitter API status
router.get('/twitter-status', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { TwitterApi } = require('twitter-api-v2');
    const twitterClient = new TwitterApi({
      appKey: user.xApiKeys.apiKey,
      appSecret: user.xApiKeys.apiKeySecret,
      accessToken: user.xApiKeys.accessToken,
      accessSecret: user.xApiKeys.accessTokenSecret,
    });

    try {
      // Test basic API access
      const userInfo = await twitterClient.v2.userByUsername(user.xUsername, {
        'user.fields': ['public_metrics']
      });

      res.json({ 
        success: true, 
        status: 'connected',
        message: 'Twitter API is working correctly',
        userInfo: {
          username: userInfo.data.username,
          followers: userInfo.data.public_metrics?.followers_count
        }
      });
    } catch (apiError: any) {
      res.json({ 
        success: false, 
        status: 'error',
        message: 'Twitter API authentication failed',
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.data
        }
      });
    }
  } catch (error: any) {
    logger.error('Error checking Twitter API status', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to check Twitter API status' });
  }
});

export default router;
