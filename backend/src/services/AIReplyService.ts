import axios from 'axios';
import PersonalityService, { PersonalityTraits } from './PersonalityService';

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
  personalityTraits?: PersonalityTraits;
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
            content: 'You are an expert engagement strategist creating high-converting social media replies. MANDATORY RULES: Maximum 250 characters, 2-4 sentences only, ZERO emojis/hashtags (proven engagement killers), professional yet conversational tone. ENGAGEMENT OPTIMIZATION: Ask thoughtful follow-up questions, provide valuable insights, challenge assumptions respectfully, use sophisticated vocabulary, create intellectual curiosity. Focus on building meaningful discourse that drives continued conversation. Be authentic, authoritative, and add genuine value to every interaction.'
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
    
    let basePrompt = `ENGAGEMENT MISSION: ${missionObjective}\n\n`;
    basePrompt += `ORIGINAL TWEET: "${originalTweet.text}"\n\n`;
    
    if (replyPrompts.length > 0) {
      const randomPrompt = replyPrompts[Math.floor(Math.random() * replyPrompts.length)];
      basePrompt += `STRATEGIC APPROACH: ${randomPrompt}\n\n`;
    }
    
    basePrompt += `CREATE A HIGH-ENGAGEMENT REPLY THAT:\n`;
    basePrompt += `✓ Drives meaningful responses through thoughtful questions\n`;
    basePrompt += `✓ Provides unique insights or perspectives\n`;
    basePrompt += `✓ Uses sophisticated vocabulary to demonstrate expertise\n`;
    basePrompt += `✓ Challenges assumptions or builds on key points\n`;
    basePrompt += `✓ Creates intellectual curiosity gaps\n`;
    basePrompt += `✓ Positions for continued conversation\n`;
    basePrompt += `✓ Maintains professional authority\n\n`;
    
    basePrompt += `ENGAGEMENT TECHNIQUES:\n`;
    basePrompt += `- Ask follow-up questions that require thoughtful answers\n`;
    basePrompt += `- Share contrarian but respectful viewpoints\n`;
    basePrompt += `- Reference specific data or frameworks when relevant\n`;
    basePrompt += `- Create "what if" scenarios that spark discussion\n`;
    basePrompt += `- Acknowledge their point while adding new dimensions\n\n`;
    
    basePrompt += `POWER WORDS TO CONSIDER:\n`;
    basePrompt += `"Proven," "Essential," "Breakthrough," "Transform," "Discover," "Critical," "Strategic," "Optimal"\n\n`;
    
    basePrompt += `GENERATE REPLY:`;
    
    // Enhance with personality if available
    if (context.personalityTraits) {
      return PersonalityService.enhancePromptWithPersonality(
        basePrompt,
        context.personalityTraits,
        `High-engagement reply to: "${originalTweet.text}"`
      );
    }
    
    return basePrompt;
  }

  private generateFallbackReply(context: ReplyContext): string {
    const { originalTweet, missionObjective } = context;
    
    // High-engagement fallback responses optimized for interaction
    const engagementResponses = [
      "What's been your experience with this approach?",
      "How do you see this evolving in the next few years?",
      "Which aspect of this resonates most with your work?",
      "Have you noticed similar patterns in your field?",
      "What would you add to this perspective?",
      "How has this strategy worked for others in your experience?",
      "What challenges have you seen with this method?",
      "Which part of this framework do you find most valuable?",
      "How do you typically approach situations like this?",
      "What results have you seen when implementing this?"
    ];

    // Context-aware high-engagement responses
    const tweet = originalTweet.text.toLowerCase();
    
    if (tweet.includes('question') || tweet.includes('?')) {
      return "Thought-provoking question. What factors do you think influence this most?";
    }
    
    if (tweet.includes('strategy') || tweet.includes('approach')) {
      return "Solid strategy. How do you measure success with this approach?";
    }
    
    if (tweet.includes('challenge') || tweet.includes('problem')) {
      return "Critical challenge to address. What solutions have shown promise?";
    }
    
    if (tweet.includes('data') || tweet.includes('research') || tweet.includes('study')) {
      return "Compelling data. How do you think this translates to practical applications?";
    }
    
    if (tweet.includes('trend') || tweet.includes('future')) {
      return "Interesting trend analysis. What driving forces do you see behind this?";
    }
    
    if (tweet.includes('thanks') || tweet.includes('thank')) {
      return "What specific aspects have you found most valuable in your work?";
    }
    
    if (tweet.includes('blockchain') || tweet.includes('crypto') || tweet.includes('defi')) {
      return "How do you see this technology evolving for mainstream adoption?";
    }
    
    if (tweet.includes('ai') || tweet.includes('artificial intelligence') || tweet.includes('machine learning')) {
      return "What practical applications are you most excited about?";
    }
    
    // Default to random high-engagement response
    return engagementResponses[Math.floor(Math.random() * engagementResponses.length)];
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
            content: 'You are a master of viral quote tweet commentary. RULES: Maximum 200 characters, 2-4 sentences, ZERO emojis/hashtags (engagement killers). STRATEGY: Create commentary that amplifies the original tweet while adding your unique perspective. Use powerful language that drives shares and responses. Ask compelling questions, provide contrarian insights, or highlight key implications. Be provocative yet professional. Your quote should make people think, agree, or engage in meaningful debate.'
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
