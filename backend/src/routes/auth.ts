import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { TwitterApi } from 'twitter-api-v2';
import logger from '../utils/logger';

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req: any, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

// Update user's Twitter API keys
router.put('/api-keys', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { apiKey, apiKeySecret, accessToken, accessTokenSecret, bearerToken } = req.body;

    if (!apiKey || !apiKeySecret || !accessToken || !accessTokenSecret) {
      return res.status(400).json({ 
        success: false, 
        message: 'All API keys are required: apiKey, apiKeySecret, accessToken, accessTokenSecret' 
      });
    }

    const user = await User.findByIdAndUpdate(userId, {
      'xApiKeys.apiKey': apiKey,
      'xApiKeys.apiKeySecret': apiKeySecret,
      'xApiKeys.accessToken': accessToken,
      'xApiKeys.accessTokenSecret': accessTokenSecret,
      'xApiKeys.bearerToken': bearerToken || '',
      'hasOwnApiKeys': true
    }, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    logger.info('API keys updated successfully', { userId, username: user.xUsername });
    res.json({ 
      success: true, 
      message: 'API keys updated successfully',
      hasOwnApiKeys: true
    });
  } catch (error: any) {
    logger.error('Error updating API keys', { error: error.message, userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Failed to update API keys' });
  }
});

// Fetch Twitter account ID
router.post('/fetch-account-id', authenticate, async (req: any, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const client = new TwitterApi(user.xApiKeys.bearerToken);
    const { data } = await client.v2.me();
    
    user.xAccountId = data.id;
    await user.save();
    
    res.json({ accountId: data.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch account ID' });
  }
});

// Login/Register route (fallback for non-Twitter auth)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.comparePassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
