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

      let systemPrompt = `You are a Twitter content creation AI assistant. Generate engaging, concise tweets that:
- Are under 280 characters
- Include relevant hashtags (1-3 max)
- Have a clear call-to-action or engagement hook
- Match the tone and style appropriate for the platform
- Are original and creative
- Avoid controversial or sensitive topics unless specifically requested`;

      let userContext = '';

      // Add context if requested
      if (request.useContext && request.contextId) {
        const context = await ContextFunnel.findOne({
          _id: request.contextId,
          userId: request.userId
        });

        if (context) {
          userContext = `\n\nUser Context:\n${context.data}\n\nBased on this context, `;
          systemPrompt += `\n\nIMPORTANT: Use the provided user context to inform your tweet generation. Make the content relevant to their context while keeping it engaging for a general audience.`;
        }
      }

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `${userContext}${request.prompt}`
        }
      ];

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: request.maxTokens || 150,
          temperature: request.temperature || 0.8,
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
