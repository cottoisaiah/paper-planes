import express from 'express';
import { authenticate } from '../middleware/auth';
import UserApiKeys from '../models/UserApiKeys';
import AIProviderService from '../services/AIProviderService';

const router = express.Router();

// Get user's API key configuration
router.get('/keys', authenticate, async (req: any, res) => {
  try {
    const userKeys = await UserApiKeys.findOne({ userId: req.user._id });
    
    if (!userKeys) {
      return res.json({
        preferredProvider: 'openai',
        providers: {
          openai: { configured: false, active: false },
          xai: { configured: false, active: false }
        }
      });
    }
    
    const response = {
      preferredProvider: userKeys.preferredProvider || 'openai',
      providers: {
        openai: {
          configured: !!userKeys.apiKeys?.openai?.encrypted,
          active: userKeys.apiKeys?.openai?.active || false,
          lastUsed: userKeys.apiKeys?.openai?.lastUsed,
          usageCount: userKeys.apiKeys?.openai?.usageCount || 0
        },
        xai: {
          configured: !!userKeys.apiKeys?.xai?.encrypted,
          active: userKeys.apiKeys?.xai?.active || false,
          lastUsed: userKeys.apiKeys?.xai?.lastUsed,
          usageCount: userKeys.apiKeys?.xai?.usageCount || 0
        }
      }
    };
    
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get API keys', details: error.message });
  }
});

// Set/Update API key for a provider
router.post('/keys/:provider', authenticate, async (req: any, res) => {
  try {
    const { provider } = req.params;
    const { apiKey } = req.body;
    
    if (!['openai', 'xai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be openai or xai.' });
    }
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required and must be a string.' });
    }
    
    // Validate the API key format
    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      return res.status(400).json({ error: 'Invalid OpenAI API key format. Must start with sk-' });
    }
    
    if (provider === 'xai' && !apiKey.startsWith('xai-')) {
      return res.status(400).json({ error: 'Invalid XAI API key format. Must start with xai-' });
    }
    
    // Test the API key before saving
    const providerStatus = await AIProviderService.checkProviderStatus(provider as any, apiKey);
    if (!providerStatus.available) {
      return res.status(400).json({ 
        error: `Invalid ${provider} API key`, 
        details: providerStatus.error 
      });
    }
    
    let userKeys = await UserApiKeys.findOne({ userId: req.user._id });
    if (!userKeys) {
      userKeys = new UserApiKeys({ userId: req.user._id });
    }
    
    userKeys.setApiKey(provider as any, apiKey);
    await userKeys.save();
    
    res.json({ 
      success: true, 
      message: `${provider} API key configured successfully`,
      provider,
      model: providerStatus.model
    });
    
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to set API key', details: error.message });
  }
});

// Set preferred provider
router.post('/preferred-provider', authenticate, async (req: any, res) => {
  try {
    const { provider } = req.body;
    
    if (!['openai', 'xai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be openai or xai.' });
    }
    
    let userKeys = await UserApiKeys.findOne({ userId: req.user._id });
    if (!userKeys) {
      userKeys = new UserApiKeys({ userId: req.user._id });
    }
    
    userKeys.preferredProvider = provider;
    await userKeys.save();
    
    res.json({ 
      success: true, 
      preferredProvider: provider,
      message: `Preferred provider set to ${provider}`
    });
    
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to set preferred provider', details: error.message });
  }
});

// Remove API key for a provider
router.delete('/keys/:provider', authenticate, async (req: any, res) => {
  try {
    const { provider } = req.params;
    
    if (!['openai', 'xai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be openai or xai.' });
    }
    
    const userKeys = await UserApiKeys.findOne({ userId: req.user._id });
    if (!userKeys) {
      return res.status(404).json({ error: 'No API keys found for user' });
    }
    
    userKeys.deactivateApiKey(provider as any);
    await userKeys.save();
    
    res.json({ 
      success: true, 
      message: `${provider} API key removed successfully` 
    });
    
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove API key', details: error.message });
  }
});

// Test API key
router.post('/test/:provider', authenticate, async (req: any, res) => {
  try {
    const { provider } = req.params;
    const { apiKey } = req.body;
    
    if (!['openai', 'xai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be openai or xai.' });
    }
    
    // Test with provided key or user's stored key
    let keyToTest = apiKey;
    if (!keyToTest) {
      const userKeys = await UserApiKeys.findOne({ userId: req.user._id });
      if (userKeys) {
        keyToTest = userKeys.getApiKey(provider as any);
      }
    }
    
    if (!keyToTest) {
      return res.status(400).json({ error: 'No API key provided or stored' });
    }
    
    const status = await AIProviderService.checkProviderStatus(provider as any, keyToTest);
    
    res.json({
      provider,
      available: status.available,
      model: status.model,
      error: status.error || null
    });
    
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to test API key', details: error.message });
  }
});

// Test content generation with user's keys
router.post('/test-generation', authenticate, async (req: any, res) => {
  try {
    const { prompt, provider } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const userKeys = await UserApiKeys.findOne({ userId: req.user._id });
    let userApiKeys = {};
    let preferredProvider = provider;
    
    if (userKeys) {
      userApiKeys = userKeys.getDecryptedKeys();
      preferredProvider = preferredProvider || userKeys.preferredProvider;
    }
    
    const result = await AIProviderService.generateContent({
      prompt,
      userId: req.user._id.toString(),
      provider: preferredProvider,
      userApiKeys,
      maxTokens: 100,
      temperature: 0.7
    });
    
    if (!result) {
      return res.status(500).json({ error: 'Failed to generate content with all available providers' });
    }
    
    // Update usage stats
    if (userKeys && result.provider) {
      userKeys.updateUsage(result.provider);
      await userKeys.save();
    }
    
    res.json({
      success: true,
      content: result.content,
      provider: result.provider,
      model: result.model,
      tokensUsed: result.tokensUsed
    });
    
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to test content generation', details: error.message });
  }
});

export default router;