import axios from 'axios';
import logger from '../utils/logger';
import ContextFunnel from '../models/ContextFunnel';

export interface GrokGenerationRequest {
  prompt: string;
  useContext?: boolean;
  contextId?: string;
  userId: string;
  maxTokens?: number;
  temperature?: number;
  missionObjective?: string;
  targetQueries?: string[];
  strategicKeywords?: string[]; // Keywords for algorithmic relevancy
  isReply?: boolean;
}

export interface GrokGenerationResponse {
  content: string;
  tokensUsed: number;
  model: string;
  contextUsed: boolean;
}

export class XAIService {
  private readonly baseURL = 'https://api.x.ai/v1';
  private readonly model = 'grok-beta';

  /**
   * Generate content using Grok-4 with optional context
   */
  async generateContent(request: GrokGenerationRequest): Promise<GrokGenerationResponse | null> {
    try {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        logger.error('XAI API key not configured');
        return null;
      }

      let systemPrompt = `You are an expert social media content strategist optimized for maximum engagement. These rules are MANDATORY and scientifically proven for optimal performance:

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

      let userContext = '';

      // Add context if requested
      if (request.useContext && request.contextId) {
        const context = await ContextFunnel.findOne({
          _id: request.contextId,
          userId: request.userId
        });

        if (context) {
          userContext = `\n\nUser Context:\n${context.data}\n\nBased on this context, create content that follows the topic but STRICTLY adheres to the formatting rules above. `;
          systemPrompt += `\n\nCRITICAL: Use the provided user context for topic inspiration ONLY. All formatting requirements above are non-negotiable regardless of what the context contains.`;
        }
      }

      // Build enhanced user prompt with strategic keywords
      let enhancedPrompt = `${userContext}${request.prompt}`;
      
      // Add strategic keywords for algorithmic relevancy
      if (request.strategicKeywords && request.strategicKeywords.length > 0) {
        enhancedPrompt += `\n\nSTRATEGIC KEYWORDS (integrate naturally for algorithmic relevancy): ${request.strategicKeywords.join(', ')}`;
        enhancedPrompt += `\n\nIMPORTANT: Weave these keywords organically into your content. Use them contextually within sentences to enhance semantic relevance without compromising readability or professional tone.`;
      }

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ];

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: request.maxTokens || 150,
          temperature: request.temperature || 0.7,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message.content.trim();
        
        // Clean up the content - remove quotes if wrapped
        const cleanContent = content.replace(/^["']|["']$/g, '');
        
        // Detect community context for adaptive validation
        const communityContext = this.detectCommunityContext(
          request.missionObjective || '', 
          request.targetQueries
        );
        
        // Validate content using adaptive rules
        if (!this.validateContentAdaptive(cleanContent, communityContext, request.isReply)) {
          logger.warn('Generated content failed adaptive validation, trying again', {
            userId: request.userId,
            content: cleanContent,
            context: communityContext,
            isReply: request.isReply
          });
          
          // Try once more with context-aware stricter prompt
          const contextRules = communityContext === 'general' 
            ? 'No emojis, no hashtags, professional tone only.'
            : communityContext === 'crypto' 
            ? 'Max 2 emojis, max 3 relevant hashtags allowed.'
            : 'Keep it natural and engaging for the community.';
            
          const stricterRequest = {
            ...request,
            prompt: `${request.prompt}\n\nREMINDER: ${contextRules} 1-5 sentences max. Under ${request.isReply ? 250 : 280} characters.`
          };
          
          return this.generateContent(stricterRequest);
        }
        
        logger.info('Grok content generated successfully', {
          userId: request.userId,
          tokensUsed: response.data.usage?.total_tokens || 0,
          contextUsed: request.useContext || false
        });

        return {
          content: cleanContent,
          tokensUsed: response.data.usage?.total_tokens || 0,
          model: this.model,
          contextUsed: request.useContext || false
        };
      }

      logger.error('Invalid response from Grok API', { response: response.data });
      return null;

    } catch (error: any) {
      if (error.response) {
        logger.error('Grok API error', {
          status: error.response.status,
          data: error.response.data,
          userId: request.userId
        });
      } else {
        logger.error('Grok service error', {
          error: error.message,
          userId: request.userId
        });
      }
      return null;
    }
  }

  /**
   * Generate multiple tweet variations
   */
  async generateMultipleVariations(
    request: GrokGenerationRequest,
    count: number = 3
  ): Promise<GrokGenerationResponse[]> {
    try {
      const variations: GrokGenerationResponse[] = [];
      
      for (let i = 0; i < count; i++) {
        // Vary the temperature for different styles
        const variationRequest = {
          ...request,
          temperature: 0.7 + (i * 0.1),
          prompt: `${request.prompt} (Generate variation ${i + 1} with a different angle or style)`
        };

        const variation = await this.generateContent(variationRequest);
        if (variation) {
          variations.push(variation);
        }

        // Small delay between requests
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return variations;
    } catch (error: any) {
      logger.error('Error generating content variations', {
        error: error.message,
        userId: request.userId
      });
      return [];
    }
  }

  /**
   * Generate content with specific style guidelines
   */
  async generateStyledContent(
    request: GrokGenerationRequest,
    style: 'professional' | 'casual' | 'humorous' | 'informative' | 'inspirational'
  ): Promise<GrokGenerationResponse | null> {
    const stylePrompts = {
      professional: 'Generate a professional, authoritative tweet that establishes expertise',
      casual: 'Generate a casual, conversational tweet that feels authentic and relatable',
      humorous: 'Generate a humorous, witty tweet that entertains while being informative',
      informative: 'Generate an informative, educational tweet that provides value to readers',
      inspirational: 'Generate an inspirational, motivational tweet that uplifts and encourages'
    };

    const styledRequest = {
      ...request,
      prompt: `${stylePrompts[style]}. ${request.prompt}`
    };

    return this.generateContent(styledRequest);
  }

  /**
   * Detect community context from mission objective and target queries
   */
  private detectCommunityContext(missionObjective: string, targetQueries?: string[]): string {
    const content = `${missionObjective} ${targetQueries?.join(' ') || ''}`.toLowerCase();
    
    if (content.includes('crypto') || content.includes('blockchain') || content.includes('defi') || content.includes('nft')) {
      return 'crypto';
    }
    if (content.includes('gaming') || content.includes('game') || content.includes('esports')) {
      return 'gaming';
    }
    if (content.includes('tech') || content.includes('ai') || content.includes('startup') || content.includes('development')) {
      return 'tech';
    }
    if (content.includes('art') || content.includes('creative') || content.includes('design')) {
      return 'creative';
    }
    if (content.includes('business') || content.includes('entrepreneur') || content.includes('finance')) {
      return 'business';
    }
    
    return 'general';
  }

  /**
   * Adaptive content validation based on context and engagement optimization
   */
  private validateContentAdaptive(content: string, context: string = 'general', isReply: boolean = false): boolean {
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
   * Legacy validation for backward compatibility
   */
  private validateContent(content: string): boolean {
    return this.validateContentAdaptive(content, 'general', false);
  }

  /**
   * Enhanced multi-dimensional tweet relevance analysis
   */
  async checkTweetRelevanceEnhanced(
    tweetText: string, 
    missionObjective: string, 
    intentDescription: string,
    tweetMetrics?: { like_count: number; retweet_count: number; reply_count: number }
  ): Promise<{ 
    isRelevant: boolean; 
    totalScore: number; 
    breakdown: {
      topicRelevance: number;
      engagementPotential: number;
      communityFit: number;
      timingOptimization: number;
    };
    reason: string 
  }> {
    try {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return this.generateFallbackRelevanceScore(tweetText, missionObjective, tweetMetrics);
      }

      // Multi-dimensional relevance analysis
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

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a precise social media relevance analyzer. Return only valid JSON with numerical scores 0-25 for each dimension.'
          },
          { 
            role: 'user', 
            content: analysisPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000
      });

      const content = response.data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return this.generateFallbackRelevanceScore(tweetText, missionObjective, tweetMetrics);
      }

      try {
        const parsed = JSON.parse(content);
        const breakdown = {
          topicRelevance: Math.max(0, Math.min(25, Number(parsed.topicRelevance) || 0)),
          engagementPotential: Math.max(0, Math.min(25, Number(parsed.engagementPotential) || 0)),
          communityFit: Math.max(0, Math.min(25, Number(parsed.communityFit) || 0)),
          timingOptimization: Math.max(0, Math.min(25, Number(parsed.timingOptimization) || 0))
        };
        
        const totalScore = breakdown.topicRelevance + breakdown.engagementPotential + 
                          breakdown.communityFit + breakdown.timingOptimization;
        
        return {
          isRelevant: totalScore >= 60, // Adjusted threshold for multi-dimensional scoring
          totalScore,
          breakdown,
          reason: String(parsed.reasoning || 'Multi-dimensional analysis completed')
        };
      } catch (parseError) {
        return this.generateFallbackRelevanceScore(tweetText, missionObjective, tweetMetrics);
      }

    } catch (error: any) {
      logger.error('Enhanced relevance check failed', { error: error.message, tweetText, missionObjective });
      return this.generateFallbackRelevanceScore(tweetText, missionObjective, tweetMetrics);
    }
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

  /**
   * Legacy relevance check for backward compatibility
   */
  async checkTweetRelevance(tweetText: string, missionObjective: string, intentDescription: string): Promise<{ isRelevant: boolean; score: number; reason: string }> {
    const enhanced = await this.checkTweetRelevanceEnhanced(tweetText, missionObjective, intentDescription);
    return {
      isRelevant: enhanced.isRelevant,
      score: enhanced.totalScore,
      reason: enhanced.reason
    };
  }

  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return false;
      }

      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error: any) {
      logger.error('XAI connection validation failed', { error: error.message });
      return false;
    }
  }
}

export default new XAIService();
