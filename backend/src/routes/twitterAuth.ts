import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { TwitterApi } from 'twitter-api-v2';
import SocialMetricsService from '../services/SocialMetricsService';

const router = express.Router();

// Use OAuth 1.0a which is more reliable
const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY as string,
  appSecret: process.env.X_API_KEY_SECRET as string,
});

// Store OAuth tokens temporarily (in production, use Redis)
const oauthStore = new Map();

router.get('/twitter', async (req, res) => {
  try {
    // Use OAuth 1.0a flow
    const authLink = await twitterClient.generateAuthLink(
      `${process.env.FRONTEND_URL || 'http://localhost:3002'}/auth/callback`
    );
    
    // Store the secret for the callback
    oauthStore.set(authLink.oauth_token, authLink.oauth_token_secret);
    
    res.json({ url: authLink.url });
  } catch (error) {
    console.error('Twitter auth error:', error);
    res.status(500).json({ error: 'Failed to generate Twitter auth link' });
  }
});

router.post('/twitter/callback', async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.body;
    
    const oauth_token_secret = oauthStore.get(oauth_token);
    if (!oauth_token_secret) {
      return res.status(400).json({ error: 'Invalid OAuth token' });
    }
    
    // Complete the OAuth flow
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY as string,
      appSecret: process.env.X_API_KEY_SECRET as string,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });
    
    const { client: loggedClient, accessToken, accessSecret } = await client.login(oauth_verifier);
    
    // Clean up the stored secret
    oauthStore.delete(oauth_token);
    
    // Get user data
    const userData = await loggedClient.v1.verifyCredentials();
    
    let user = await User.findOne({ xAccountId: userData.id_str });
    if (!user) {
      user = new User({
        xAccountId: userData.id_str,
        xUsername: userData.screen_name,
        isAdmin: userData.screen_name === '_cottoisaiah',
        hasOwnApiKeys: false,
        subscriptionStatus: userData.screen_name === '_cottoisaiah' ? 'active' : 'inactive',
        socialMetrics: {
          followersCount: userData.followers_count || 0,
          followingCount: userData.friends_count || 0,
          tweetsCount: userData.statuses_count || 0,
          lastUpdated: new Date()
        },
        xApiKeys: {
          accessToken,
          accessTokenSecret: accessSecret,
          apiKey: process.env.X_API_KEY,
          apiKeySecret: process.env.X_API_KEY_SECRET,
          bearerToken: process.env.X_BEARER_TOKEN,
          appId: process.env.X_APP_ID,
        },
      });
      await user.save();
    } else {
      user.xApiKeys.accessToken = accessToken;
      user.xApiKeys.accessTokenSecret = accessSecret;
      if (userData.screen_name === '_cottoisaiah' && !user.isAdmin) {
        user.isAdmin = true;
        user.subscriptionStatus = 'active';
      }
      // Update social metrics
      user.socialMetrics = {
        followersCount: userData.followers_count || 0,
        followingCount: userData.friends_count || 0,
        tweetsCount: userData.statuses_count || 0,
        lastUpdated: new Date()
      };
      await user.save();
    }
    
    // Try to update detailed metrics in background
    SocialMetricsService.refreshMetricsIfNeeded(user._id.toString()).catch(err => {
      console.log('Background metrics update failed:', err.message);
    });
    
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ 
      token: jwtToken, 
      user: { 
        id: user._id, 
        xUsername: user.xUsername, 
        isAdmin: user.isAdmin,
        subscriptionStatus: user.subscriptionStatus,
        socialMetrics: user.socialMetrics
      } 
    });
  } catch (error) {
    console.error('Twitter callback error:', error);
    res.status(500).json({ error: 'Failed to complete Twitter authentication' });
  }
});

export default router;
