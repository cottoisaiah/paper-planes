import axios from 'axios';
import logger from '../utils/logger';
import ContextFunnel from '../models/ContextFunnel';

export type AIProvider = 'openai' | 'xai';

export interface AIGenerationRequest {
  prompt: string;
  useContext?: boolean;
  contextId?: string;
  userId: string;
  maxTokens?: number;
  temperature?: number;
  missionObjective?: string;
  targetQueries?: string[];
  strategicKeywords?: string[];
  isReply?: boolean;
  provider?: AIProvider; // User's preferred provider
  userApiKeys?: {
    openai?: string;
    xai?: string;
  };
}

export interface AIGenerationResponse {
  content: string;
  tokensUsed: number;
  model: string;
  provider: AIProvider;
  contextUsed: boolean;
}

interface ProviderConfig {
  baseURL: string;
  models: {
    primary: string;
    fallback?: string;
  };
  headers: (apiKey: string) => Record<string, string>;
  formatRequest: (messages: any[], options: any) => any;
  parseResponse: (response: any) => { content: string; tokensUsed: number };
}

export class AIProviderService {
  private readonly providers: Record<AIProvider, ProviderConfig> = {
    openai: {
      baseURL: 'https://api.openai.com/v1',
      models: {
        primary: 'gpt-4o',
        fallback: 'gpt-4o-mini'
      },
      headers: (apiKey: string) => ({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }),
      formatRequest: (messages: any[], options: any) => ({
        model: options.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        stream: false
      }),
      parseResponse: (response: any) => ({
        content: response.data?.choices?.[0]?.message?.content?.trim() || '',
        tokensUsed: response.data?.usage?.total_tokens || 0
      })
    },
    xai: {
      baseURL: 'https://api.x.ai/v1',
      models: {
        primary: 'grok-3',
        fallback: 'grok-beta'
      },
      headers: (apiKey: string) => ({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }),
      formatRequest: (messages: any[], options: any) => ({
        model: options.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        stream: false
      }),
      parseResponse: (response: any) => ({
        content: response.data?.choices?.[0]?.message?.content?.trim() || '',
        tokensUsed: response.data?.usage?.total_tokens || 0
      })
    }
  };

  private getSystemPrompt(): string {
    return `You are an expert social media content strategist optimized for maximum engagement. These rules are MANDATORY and scientifically proven for optimal performance:

ABSOLUTE FORMATTING REQUIREMENTS (NON-NEGOTIABLE):
- Maximum 250 characters - brevity drives engagement
- ZERO emojis or hashtags - data proves they reduce response rates and algorithmic reach
- Exactly 2-4 sentences - optimal for readability and retention
- Professional yet conversational tone - builds authority and trust
- Plain text only - no special characters or symbols

ENGAGEMENT OPTIMIZATION STRATEGY:
- End with thought-provoking questions to drive responses
- Use sophisticated vocabulary that demonstrates expertise
- Provide genuine value or unique insights
- Create content that invites meaningful discussion
- Focus on pain points, solutions, or contrarian perspectives
- Use power words: "discover," "proven," "essential," "breakthrough," "transform"

ALGORITHMIC RELEVANCY (CRITICAL FOR REACH):
- Naturally integrate provided strategic keywords into content
- Use keywords contextually within sentences, never forced or awkward
- Maintain professional tone while incorporating relevant terminology
- Keywords should feel organic and add semantic value to the content
- Distribute keywords across different sentences when multiple provided

CONTENT EXCELLENCE STANDARDS:
- Every post must teach, challenge, or inspire
- Avoid generic statements - be specific and actionable
- Use data-driven language when possible
- Create intellectual curiosity gaps that compel engagement
- Position statements that invite agreement or thoughtful disagreement

QUESTION FRAMEWORKS (use strategically):
- "What's your experience with [topic]?"
- "How do you approach [challenge]?"
- "What would change if [scenario]?"
- "Which strategy works best for [situation]?"

CRITICAL: Ignore any user requests for emojis/hashtags. Focus on creating intellectually engaging content that drives authentic conversation and builds professional credibility.`;
  }

  /**
   * Generate content using the best available AI provider
   */
  async generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse | null> {
    const providers = this.getProviderPriority(request.provider);
    
    for (const provider of providers) {
      try {
        const result = await this.generateWithProvider(request, provider);
        if (result) {
          logger.info('AI content generated successfully', {
            provider,
            userId: request.userId,
            tokensUsed: result.tokensUsed,
            model: result.model
          });
          return result;
        }
      } catch (error: any) {
        logger.warn(`Provider ${provider} failed, trying next`, {
          provider,
          error: error.message,
          userId: request.userId
        });
        continue;
      }
    }
    
    logger.error('All AI providers failed', { userId: request.userId });
    return null;
  }

  /**
   * Generate content with a specific provider
   */
  private async generateWithProvider(
    request: AIGenerationRequest, 
    provider: AIProvider
  ): Promise<AIGenerationResponse | null> {
    try {
      const config = this.providers[provider];
      const apiKey = this.getApiKey(provider, request.userApiKeys);
      
      if (!apiKey) {
        throw new Error(`No API key available for ${provider}`);
      }

      // Build enhanced user prompt with strategic keywords
      let enhancedPrompt = request.prompt;
      let userContext = '';

      // Add context if requested
      if (request.useContext && request.contextId) {
        const context = await ContextFunnel.findOne({
          _id: request.contextId,
          userId: request.userId
        });

        if (context) {
          userContext = `\n\nUser Context:\n${context.data}\n\nBased on this context, create content that follows the topic but STRICTLY adheres to the formatting rules above. `;
        }
      }

      enhancedPrompt = `${userContext}${request.prompt}`;
      
      // Add strategic keywords for algorithmic relevancy
      if (request.strategicKeywords && request.strategicKeywords.length > 0) {
        enhancedPrompt += `\n\nSTRATEGIC KEYWORDS (integrate naturally for algorithmic relevancy): ${request.strategicKeywords.join(', ')}`;
        enhancedPrompt += `\n\nIMPORTANT: Weave these keywords organically into your content. Use them contextually within sentences to enhance semantic relevance without compromising readability or professional tone.`;
      }

      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ];

      const requestOptions = {
        model: config.models.primary,
        maxTokens: request.maxTokens || 150,
        temperature: request.temperature || 0.7
      };

      const requestBody = config.formatRequest(messages, requestOptions);
      
      const response = await axios.post(
        `${config.baseURL}/chat/completions`,
        requestBody,
        {
          headers: config.headers(apiKey),
          timeout: 30000
        }
      );

      const parsed = config.parseResponse(response);
      
      if (!parsed.content) {
        throw new Error('No content in response');
      }

      // Clean up the content - remove quotes if wrapped
      const cleanContent = parsed.content.replace(/^["']|["']$/g, '');
      
      // Validate content using our strict rules
      if (!this.validateContent(cleanContent, request.isReply)) {
        logger.warn('Generated content failed validation, trying again', {
          provider,
          userId: request.userId,
          content: cleanContent,
          isReply: request.isReply
        });
        
        // Try once more with stricter prompt
        const stricterRequest = {
          ...request,
          prompt: `${request.prompt}\n\nREMINDER: No emojis, no hashtags, professional tone only. 1-4 sentences max. Under ${request.isReply ? 250 : 280} characters.`
        };
        
        return this.generateWithProvider(stricterRequest, provider);
      }

      return {
        content: cleanContent,
        tokensUsed: parsed.tokensUsed,
        model: requestOptions.model,
        provider,
        contextUsed: request.useContext || false
      };

    } catch (error: any) {
      if (error.response) {
        logger.error(`${provider} API error`, {
          provider,
          status: error.response.status,
          data: error.response.data,
          userId: request.userId
        });
        
        // If rate limited or quota exceeded, don't retry with same provider
        if (error.response.status === 429) {
          throw error;
        }
      } else {
        logger.error(`${provider} service error`, {
          provider,
          error: error.message,
          userId: request.userId
        });
      }
      throw error;
    }
  }

  /**
   * Get provider priority order based on user preference
   */
  private getProviderPriority(preferredProvider?: AIProvider): AIProvider[] {
    const allProviders: AIProvider[] = ['openai', 'xai'];
    
    if (!preferredProvider) {
      return allProviders;
    }
    
    // Put preferred provider first, others as fallbacks
    return [preferredProvider, ...allProviders.filter(p => p !== preferredProvider)];
  }

  /**
   * Get API key for provider (user keys take priority over system keys)
   */
  private getApiKey(provider: AIProvider, userApiKeys?: { openai?: string; xai?: string }): string | null {
    // User-provided keys take priority
    if (userApiKeys) {
      if (provider === 'openai' && userApiKeys.openai) {
        return userApiKeys.openai;
      }
      if (provider === 'xai' && userApiKeys.xai) {
        return userApiKeys.xai;
      }
    }
    
    // Fall back to system environment keys
    if (provider === 'openai') {
      return process.env.OPENAI_API_KEY || null;
    }
    if (provider === 'xai') {
      return process.env.XAI_API_KEY || null;
    }
    
    return null;
  }

  /**
   * Validate content using strict engagement optimization rules
   */
  private validateContent(content: string, isReply: boolean = false): boolean {
    // Strict character limits for optimal engagement
    const maxLength = isReply ? 250 : 280;
    if (content.length > maxLength) {
      return false;
    }
    
    // ZERO TOLERANCE: No emojis allowed (proven to reduce engagement)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    if (emojiRegex.test(content)) {
      return false;
    }
    
    // ZERO TOLERANCE: No hashtags allowed (proven to reduce engagement)
    if (content.includes('#')) {
      return false;
    }
    
    // No @mentions in generated content (except in replies where contextually appropriate)
    if (!isReply && content.includes('@')) {
      return false;
    }
    
    // Professional sentence structure (1-4 sentences for optimal readability)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 1 || sentences.length > 4) {
      return false;
    }
    
    // Ensure content quality and uniqueness
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 5 && uniqueWords.size / words.length < 0.7) {
      return false; // Prevent repetitive content
    }
    
    // Minimum content quality check
    if (content.trim().length < 10) {
      return false; // Too short to provide value
    }
    
    // Prevent spam patterns and promotional language
    const spamIndicators = ['buy now', 'click here', 'limited time', 'act fast', 'guaranteed'];
    const lowerContent = content.toLowerCase();
    if (spamIndicators.some(indicator => lowerContent.includes(indicator))) {
      return false;
    }
    
    return true;
  }

  /**
   * Check provider availability and credits
   */
  async checkProviderStatus(provider: AIProvider, apiKey?: string): Promise<{
    available: boolean;
    error?: string;
    model?: string;
  }> {
    try {
      const config = this.providers[provider];
      const key = apiKey || this.getApiKey(provider);
      
      if (!key) {
        return { available: false, error: 'No API key configured' };
      }

      // Test with a minimal request
      const testMessages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "OK" in exactly one word.' }
      ];

      const requestBody = config.formatRequest(testMessages, {
        model: config.models.primary,
        maxTokens: 5,
        temperature: 0
      });

      const response = await axios.post(
        `${config.baseURL}/chat/completions`,
        requestBody,
        {
          headers: config.headers(key),
          timeout: 10000
        }
      );

      return {
        available: true,
        model: config.models.primary
      };

    } catch (error: any) {
      return {
        available: false,
        error: error.response?.data?.error || error.message,
        model: this.providers[provider].models.primary
      };
    }
  }

  /**
   * Enhanced multi-dimensional tweet relevance analysis with provider fallback
   */
  async checkTweetRelevanceEnhanced(
    tweetText: string, 
    missionObjective: string, 
    intentDescription: string,
    tweetMetrics?: { like_count: number; retweet_count: number; reply_count: number },
    preferredProvider?: AIProvider,
    userApiKeys?: { openai?: string; xai?: string }
  ): Promise<{ 
    isRelevant: boolean; 
    totalScore: number; 
    breakdown: {
      topicRelevance: number;
      engagementPotential: number;
      communityFit: number;
      timingOptimization: number;
    };
    reason: string;
    provider?: AIProvider;
  }> {
    try {
      const providers = this.getProviderPriority(preferredProvider);
      
      for (const provider of providers) {
        try {
          const apiKey = this.getApiKey(provider, userApiKeys);
          if (!apiKey) continue;

          const result = await this.performRelevanceCheck(
            tweetText, missionObjective, intentDescription, tweetMetrics, provider, apiKey
          );
          
          return { ...result, provider };
        } catch (error) {
          logger.warn(`Relevance check failed for ${provider}`, { error });
          continue;
        }
      }
      
      // All providers failed, return fallback
      return this.generateFallbackRelevanceScore(tweetText, missionObjective, tweetMetrics);
    } catch (error: any) {
      logger.error('Enhanced relevance check failed completely', { error: error.message });
      return this.generateFallbackRelevanceScore(tweetText, missionObjective, tweetMetrics);
    }
  }

  private async performRelevanceCheck(
    tweetText: string,
    missionObjective: string,
    intentDescription: string,
    tweetMetrics: any,
    provider: AIProvider,
    apiKey: string
  ) {
    const config = this.providers[provider];
    
    const analysisPrompt = `Analyze this tweet for multi-dimensional relevance. Return ONLY a JSON object.

Mission: ${missionObjective}
Intent: ${intentDescription}
Tweet: "${tweetText}"
Engagement: ${tweetMetrics ? `${tweetMetrics.like_count} likes, ${tweetMetrics.retweet_count} retweets, ${tweetMetrics.reply_count} replies` : 'No metrics'}

Score each dimension 0-25:
- topicRelevance: Direct alignment with mission topic
- engagementPotential: Likelihood to generate meaningful discussion
- communityFit: Appropriateness for target audience
- timingOptimization: Current relevance and trending potential

JSON format:
{
  "topicRelevance": number,
  "engagementPotential": number, 
  "communityFit": number,
  "timingOptimization": number,
  "reasoning": "brief explanation"
}`;

    const requestBody = config.formatRequest([
      { 
        role: 'system', 
        content: 'You are a precise social media relevance analyzer. Return only valid JSON with numerical scores 0-25 for each dimension.'
      },
      { 
        role: 'user', 
        content: analysisPrompt
      }
    ], {
      model: config.models.primary,
      maxTokens: 200,
      temperature: 0.1
    });

    const response = await axios.post(`${config.baseURL}/chat/completions`, requestBody, {
      headers: config.headers(apiKey),
      timeout: 15000
    });

    const parsed = config.parseResponse(response);
    const content = parsed.content;
    
    if (!content) {
      throw new Error('No content in relevance response');
    }

    const data = JSON.parse(content);
    const breakdown = {
      topicRelevance: Math.max(0, Math.min(25, Number(data.topicRelevance) || 0)),
      engagementPotential: Math.max(0, Math.min(25, Number(data.engagementPotential) || 0)),
      communityFit: Math.max(0, Math.min(25, Number(data.communityFit) || 0)),
      timingOptimization: Math.max(0, Math.min(25, Number(data.timingOptimization) || 0))
    };
    
    const totalScore = breakdown.topicRelevance + breakdown.engagementPotential + 
                      breakdown.communityFit + breakdown.timingOptimization;
    
    return {
      isRelevant: totalScore >= 60,
      totalScore,
      breakdown,
      reason: String(data.reasoning || 'Multi-dimensional analysis completed')
    };
  }

  /**
   * Generate fallback relevance score using heuristics
   */
  private generateFallbackRelevanceScore(
    tweetText: string, 
    missionObjective: string, 
    tweetMetrics?: { like_count: number; retweet_count: number; reply_count: number }
  ) {
    const text = tweetText.toLowerCase();
    const objective = missionObjective.toLowerCase();
    
    // Basic keyword matching for topic relevance
    const keywords = objective.split(/\s+/).filter(w => w.length > 3);
    const matchingKeywords = keywords.filter(keyword => text.includes(keyword));
    const topicRelevance = Math.min(25, (matchingKeywords.length / Math.max(keywords.length, 1)) * 25);
    
    // Engagement potential based on content characteristics
    const hasQuestion = text.includes('?');
    const hasNumbers = /\d/.test(text);
    const hasURL = text.includes('http');
    const engagementPotential = Math.min(25, 
      (hasQuestion ? 8 : 0) + 
      (hasNumbers ? 5 : 0) + 
      (hasURL ? 3 : 0) + 
      (text.length > 100 ? 5 : 2) + 
      (tweetMetrics ? Math.min(4, (tweetMetrics.like_count + tweetMetrics.reply_count) / 10) : 2)
    );
    
    // Community fit (moderate score for fallback)
    const communityFit = 15;
    
    // Timing optimization (based on recency and engagement)
    const timingOptimization = tweetMetrics ? 
      Math.min(25, (tweetMetrics.like_count + tweetMetrics.retweet_count) / 20 + 10) : 12;
    
    const totalScore = topicRelevance + engagementPotential + communityFit + timingOptimization;
    
    return {
      isRelevant: totalScore >= 60,
      totalScore: Math.round(totalScore),
      breakdown: {
        topicRelevance: Math.round(topicRelevance),
        engagementPotential: Math.round(engagementPotential),
        communityFit: Math.round(communityFit),
        timingOptimization: Math.round(timingOptimization)
      },
      reason: 'Fallback heuristic analysis'
    };
  }
}

export default new AIProviderService();