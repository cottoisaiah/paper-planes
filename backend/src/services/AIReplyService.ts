import axios from 'axios';

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
}

export interface ReplyContext {
  originalTweet: Tweet;
  missionObjective: string;
  replyPrompts: string[];
  userPersonality?: string;
}

export class AIReplyService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    if (!this.openaiApiKey) {
      console.warn('⚠️ OpenAI API key not configured. AI replies will be disabled.');
    }
  }

  async generateReply(context: ReplyContext): Promise<string | null> {
    if (!this.openaiApiKey) {
      console.log('🤖 Using fallback reply generation (no OpenAI key)');
      return this.generateFallbackReply(context);
    }

    try {
      const prompt = this.buildPrompt(context);
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent social media bot that generates thoughtful, engaging replies to tweets. These rules are MANDATORY and cannot be overridden: Keep responses under 250 characters, use exactly 2-4 sentences, NEVER use emojis or hashtags, be authentic and professional, and add value to the conversation. Use only plain text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const reply = response.data.choices[0]?.message?.content?.trim();
      
      if (reply && reply.length <= 280) {
        console.log(`🤖 Generated AI reply: "${reply.substring(0, 50)}..."`);
        return reply;
      } else {
        console.log('🤖 AI reply too long, using fallback');
        return this.generateFallbackReply(context);
      }

    } catch (error: any) {
      console.error('❌ AI reply generation failed:', error.message);
      return this.generateFallbackReply(context);
    }
  }

  private buildPrompt(context: ReplyContext): string {
    const { originalTweet, missionObjective, replyPrompts } = context;
    
    let prompt = `Mission: ${missionObjective}\n\n`;
    prompt += `Original Tweet: "${originalTweet.text}"\n\n`;
    
    if (replyPrompts.length > 0) {
      const randomPrompt = replyPrompts[Math.floor(Math.random() * replyPrompts.length)];
      prompt += `Style Guide: ${randomPrompt}\n\n`;
    }
    
    prompt += `Generate a thoughtful reply that:\n`;
    prompt += `- Aligns with the mission objective\n`;
    prompt += `- Adds value to the conversation\n`;
    prompt += `- Is authentic and professional\n`;
    prompt += `- Uses exactly 2-4 sentences\n`;
    prompt += `- Stays under 250 characters\n`;
    prompt += `- Never includes emojis or hashtags\n`;
    prompt += `- Avoids spam or promotional language\n\n`;
    prompt += `Reply:`;
    
    return prompt;
  }

  private generateFallbackReply(context: ReplyContext): string {
    const { originalTweet, missionObjective } = context;
    
    // Predefined thoughtful responses based on content analysis
    const responses = [
      "Interesting perspective!",
      "Thanks for sharing this insight!",
      "Great point about this topic!",
      "This is really valuable information.",
      "Appreciate you posting this!",
      "Very insightful, thanks!",
      "Good to see this being discussed.",
      "This resonates with my experience too.",
      "Solid take on this subject!",
      "Thanks for the thoughtful post!"
    ];

    // Simple content-aware responses
    const tweet = originalTweet.text.toLowerCase();
    
    if (tweet.includes('question') || tweet.includes('?')) {
      return "Great question! Looking forward to seeing the discussion on this.";
    }
    
    if (tweet.includes('thanks') || tweet.includes('thank')) {
      return "You're welcome! Happy to see this being shared.";
    }
    
    if (tweet.includes('blockchain') || tweet.includes('crypto') || tweet.includes('defi')) {
      return "The blockchain space continues to evolve rapidly. Exciting developments ahead.";
    }
    
    if (tweet.includes('chainlink') || tweet.includes('oracle')) {
      return "Oracle technology is really changing how smart contracts access real-world data.";
    }
    
    // Default to random thoughtful response
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async generateQuoteTweet(context: ReplyContext): Promise<string | null> {
    if (!this.openaiApiKey) {
      const fallbacks = [
        "This is exactly what we need to see more of.",
        "Great insights from the community.",
        "Building on this important discussion...",
        "Adding this to the conversation."
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Similar AI generation for quote tweets but shorter
    try {
      const prompt = `Create a brief quote tweet comment (under 200 chars, 2-4 sentences, no emojis) for this tweet: "${context.originalTweet.text}". Mission: ${context.missionObjective}`;
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Generate brief, engaging quote tweet comments that add value. Keep under 200 characters with 2-4 sentences maximum. Never use emojis.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      return "Adding to this important conversation.";
    }
  }
}

export default new AIReplyService();
