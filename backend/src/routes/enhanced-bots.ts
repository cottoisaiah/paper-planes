import express from 'express';
import cron from 'node-cron';
import Mission from '../models/Mission';
import GeneratedPost from '../models/GeneratedPost';
import { TwitterApi } from 'twitter-api-v2';
import { authenticate, requireActiveSubscription } from '../middleware/auth';
import AIProviderService from '../services/AIProviderService';
import UserApiKeys from '../models/UserApiKeys';
import { AIReplyService, ReplyContext } from '../services/AIReplyService';
import PersonalityService from '../services/PersonalityService';
import { ThreadIntelligenceService } from '../services/ThreadIntelligenceService';
import LogStreamService from '../services/LogStreamService';

// Define Tweet interface
interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  context_annotations?: any[];
}

const router = express.Router();

// Store active cron jobs
const activeCronJobs = new Map();

// Initialize and restore active missions on startup
const initializeActiveMissions = async () => {
  try {
    console.log('🔄 Initializing active missions...');
    const activeMissions = await Mission.find({ active: true });
    
    for (const mission of activeMissions) {
      const twitterClient = new TwitterApi({
        appKey: process.env.X_API_KEY!,
        appSecret: process.env.X_API_KEY_SECRET!,
        accessToken: process.env.X_ACCESS_TOKEN!,
        accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
      });

      const executeMission = async () => {
        const pilot = new PaperPlanePilot(twitterClient, mission);
        await pilot.executeMission();
      };
      
      const cronJob = cron.schedule(mission.repeatSchedule, executeMission, {
        scheduled: true,
        timezone: "America/New_York"
      });
      
      activeCronJobs.set(mission._id.toString(), cronJob);
      console.log(`✅ Restored mission: ${mission.objective} (${mission.repeatSchedule})`);
    }
    
    console.log(`🚀 Restored ${activeMissions.length} active missions`);
  } catch (error: any) {
    console.error('❌ Failed to initialize active missions:', error.message);
  }
};

// Initialize on module load
initializeActiveMissions();

// Rate limit tracking for Twitter API
interface RateLimitWindow {
  startTime: number;
  likesUsed: number;
  searchesUsed: number;
  repliesUsed: number;
  retweetsUsed: number;
  postsUsed: number;
}

const rateLimitWindows = new Map<string, RateLimitWindow>();

// Twitter API Rate Limits (per 15-minute window)
const RATE_LIMITS = {
  LIKES_PER_WINDOW: 300,
  SEARCHES_PER_WINDOW: 450,
  REPLIES_PER_WINDOW: 300,
  RETWEETS_PER_WINDOW: 300,
  POSTS_PER_WINDOW: 300,
  WINDOW_DURATION_MS: 15 * 60 * 1000, // 15 minutes
};

// Enhanced mission execution engine
class PaperPlanePilot {
  private twitterClient: TwitterApi;
  private mission: any;
  
  private replyService: AIReplyService;
  private threadIntelligence: ThreadIntelligenceService;
  private aiService = AIProviderService;
  private logger: LogStreamService;
  private userApiKeys: any = null;

  constructor(twitterClient: TwitterApi, mission: any) {
    this.twitterClient = twitterClient;
    this.mission = mission;
    this.replyService = new AIReplyService();
    this.threadIntelligence = new ThreadIntelligenceService(twitterClient);
    this.logger = LogStreamService.getInstance();
    
    // Initialize user API keys
    this.initializeUserApiKeys();
  }

  async executeMission(): Promise<void> {
    console.log(`🛩️  Paper Plane "${this.mission.objective}" taking off!`);
    console.log(`📋 Mission Type: ${this.mission.missionType}`);
    
    this.logger.logMission('info', `Mission "${this.mission.objective}" starting execution`, this.mission._id.toString(), {
      missionType: this.mission.missionType,
      contentQuotas: this.mission.contentQuotas,
      strategicKeywords: this.mission.strategicKeywords
    });
    
    try {
      // Execute based on mission type
      switch (this.mission.missionType) {
        case 'engage':
          await this.executeEngagementMission();
          break;
        case 'post':
          await this.executePostMission();
          break;
        case 'hybrid':
          await this.executeHybridMission();
          break;
        default:
          console.log('⚠️ Unknown mission type, defaulting to engagement');
          await this.executeEngagementMission();
      }
      
      // Update mission analytics
      await this.updateMissionMetrics();
      console.log(`✅ Paper Plane mission completed successfully!`);
      this.logger.logMission('success', `Mission "${this.mission.objective}" completed successfully`, this.mission._id.toString());
      
    } catch (error: any) {
      console.error(`❌ Mission failed: ${error.message}`);
      this.logger.logMission('error', `Mission "${this.mission.objective}" failed: ${error.message}`, this.mission._id.toString(), { error: error.stack });
    }
  }

  private async executeEngagementMission(): Promise<void> {
    console.log(`🎯 Executing engagement mission with ${this.mission.targetQueries.length} target queries`);
    
    // Intelligent query optimization: derive contextual queries if needed
    const optimizedQueries = await this.optimizeTargetQueries();
    
    // Enforce content quotas - minimum requirements
    const quotas = this.mission.contentQuotas || {
      postsPerRun: 1,
      repliesPerRun: 3,
      quotesPerRun: 1
    };
    
    console.log(`📊 Content quotas: ${quotas.repliesPerRun} replies, ${quotas.quotesPerRun} quotes minimum`);
    
    let totalReplies = 0;
    let totalQuotes = 0;
    const minReplies = quotas.repliesPerRun;
    const minQuotes = quotas.quotesPerRun;
    const maxEngagements = this.mission.maxEngagementsPerRun || 10;
    
    for (const query of optimizedQueries) {
      if (totalReplies >= minReplies && totalQuotes >= minQuotes) {
        console.log(`✅ Content quotas fulfilled: ${totalReplies}/${minReplies} replies, ${totalQuotes}/${minQuotes} quotes`);
        break;
      }
      
      try {
        const tweets = await this.searchTweets(query);
        const { replies, quotes } = await this.processEngagementsWithQuotas(
          tweets, 
          minReplies - totalReplies, 
          minQuotes - totalQuotes,
          maxEngagements
        );
        
        totalReplies += replies;
        totalQuotes += quotes;
        
        // Delay between queries to be respectful
        await this.delay(3000);
        
      } catch (error: any) {
        console.error(`❌ Failed to process query "${query}": ${error.message}`);
        if (error.message.includes('429')) {
          console.log(`⏰ Rate limited, stopping engagement mission`);
          break;
        }
      }
    }
    
    console.log(`📊 Total content generated: ${totalReplies} replies, ${totalQuotes} quotes`);
    
    // Ensure minimum post generation if enabled
    if (this.mission.contentTypes?.posts && quotas.postsPerRun > 0) {
      await this.generateMinimumPosts(quotas.postsPerRun);
    }
  }

  private async executePostMission(): Promise<void> {
    console.log(`📝 Executing post mission with ${this.mission.posts.length} queued posts`);
    
    // Check if posts are enabled in content type preferences
    if (this.mission.contentTypes && !this.mission.contentTypes.posts) {
      console.log(`📭 Posts disabled in mission content type preferences`);
      return;
    }
    
    if (!this.mission.posts || this.mission.posts.length === 0) {
      console.log(`📭 No posts queued for this mission`);
      return;
    }
    
    // Determine which post to publish based on frequency setting
    let postToPublish = null;
    
    switch (this.mission.postFrequency) {
      case 'once':
        postToPublish = this.mission.posts[0]; // First post
        break;
      case 'random':
        postToPublish = this.mission.posts[Math.floor(Math.random() * this.mission.posts.length)];
        break;
      case 'scheduled':
        const now = new Date();
        postToPublish = this.mission.posts.find((post: any) => 
          post.scheduledTime && new Date(post.scheduledTime) <= now
        );
        break;
    }
    
    if (postToPublish) {
      await this.publishPost(postToPublish);
    } else {
      console.log(`📅 No posts scheduled for this time`);
    }
  }

  private async executeHybridMission(): Promise<void> {
    console.log(`🔄 Executing hybrid mission (engagement + posting)`);
    
    // Execute both post and engagement with reduced intensity
    const originalMaxEngagements = this.mission.maxEngagementsPerRun;
    this.mission.maxEngagementsPerRun = Math.floor(originalMaxEngagements / 2);
    
    // Post first, then engage
    await this.executePostMission();
    await this.delay(5000);
    await this.executeEngagementMission();
    
    // Restore original setting
    this.mission.maxEngagementsPerRun = originalMaxEngagements;
  }

  /**
   * Optimize target queries for better semantic alignment with mission objective
   * Creates Nash equilibrium between tweet sourcing and engagement strategy
   */
  private async optimizeTargetQueries(): Promise<string[]> {
    const missionObjective = this.mission.description || this.mission.objective || '';
    const currentQueries = this.mission.targetQueries || [];
    
    // Check if current queries are semantically aligned with mission objective
    const alignmentScore = await this.assessQueryAlignment(missionObjective, currentQueries);
    
    console.log(`🔍 Query alignment score: ${alignmentScore}/100`);
    
    // If alignment is poor (< 40%), derive contextual queries from mission objective
    if (alignmentScore < 40) {
      console.log(`⚡ Deriving optimized queries from mission objective due to low alignment`);
      const optimizedQueries = await this.deriveContextualQueries(missionObjective);
      
      // Blend optimized queries with strategic keywords for balanced sourcing
      const strategicTerms = this.mission.strategicKeywords || [];
      const blendedQueries = [...optimizedQueries, ...strategicTerms.slice(0, 3)];
      
      console.log(`🎯 Using ${blendedQueries.length} optimized queries for Core Propulsion System`);
      return blendedQueries.slice(0, 8); // Limit to 8 queries for performance
    }
    
    return currentQueries;
  }

  /**
   * Assess semantic alignment between mission objective and target queries
   */
  private async assessQueryAlignment(objective: string, queries: string[]): Promise<number> {
    if (!objective || queries.length === 0) return 0;
    
    try {
      const prompt = `Rate the semantic alignment between this mission objective and target queries on a scale of 0-100:

Mission Objective: "${objective}"
Target Queries: ${queries.map(q => `"${q}"`).join(', ')}

Consider:
- Do the queries help find tweets relevant to the mission?
- Are they contextually appropriate for the objective?
- Would they source tweets the mission could meaningfully engage with?

Return only a number from 0-100.`;

      const result = await this.aiService.generateContent({
        prompt,
        userId: 'system',
        maxTokens: 50,
        temperature: 0.1
      });
      
      if (!result) return 50;
      
      const score = parseInt(result.content.match(/\d+/)?.[0] || '0');
      return Math.min(Math.max(score, 0), 100);
    } catch (error) {
      console.log(`❌ Alignment assessment failed: ${error}`);
      return 50; // Default to moderate alignment
    }
  }

  /**
   * Derive contextual search queries from mission objective
   */
  private async deriveContextualQueries(objective: string): Promise<string[]> {
    try {
      const prompt = `Given this mission objective, generate 5-6 contextual search queries that would help find relevant tweets to engage with:

Mission Objective: "${objective}"

Requirements:
- Queries should find tweets this mission could meaningfully engage with
- Focus on topics, keywords, and hashtags related to the objective
- Consider community discussions, technical topics, and industry conversations
- Avoid overly broad or unrelated terms

Return only the queries, one per line, without quotes or numbering.`;

      const result = await this.aiService.generateContent({
        prompt,
        userId: 'system',
        maxTokens: 200,
        temperature: 0.3
      });
      
      if (!result) {
        return this.mission.strategicKeywords || ['AI', 'crypto', 'blockchain'];
      }
      
      const queries = result.content.split('\n')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0 && !q.match(/^\d+\.?\s*/))
        .slice(0, 6);
      
      console.log(`🔄 Generated ${queries.length} contextual queries from mission objective`);
      return queries;
    } catch (error) {
      console.log(`❌ Query derivation failed: ${error}`);
      return this.mission.strategicKeywords || ['AI', 'crypto', 'blockchain'];
    }
  }

  private async searchTweets(query: string): Promise<Tweet[]> {
    if (!this.canMakeRequest('search')) {
      throw new Error('Search rate limit reached');
    }
    
    console.log(`🔍 Searching for: ${query}`);
    const searchQuery = `${query} -is:retweet lang:en`;
    
    const searchResults = await this.twitterClient.v2.search(searchQuery, {
      max_results: 10,
      'tweet.fields': ['public_metrics', 'author_id', 'created_at']
    });
    
    this.recordRequest('search');
    
    const tweets = searchResults.data?.data || [];
    console.log(`   📊 Found ${tweets.length} tweets`);
    
    // Filter tweets based on mission criteria (convert to our Tweet type)
    const convertedTweets: Tweet[] = tweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text || '',
      author_id: tweet.author_id || '',
      created_at: tweet.created_at || new Date().toISOString(),
      public_metrics: tweet.public_metrics || {
        like_count: 0,
        retweet_count: 0,
        reply_count: 0,
        quote_count: 0
      }
    }));
    
    return await this.filterTweets(convertedTweets);
  }

  private async filterTweets(tweets: Tweet[]): Promise<Tweet[]> {
    let filtered = tweets;
    
    // Filter out tweets with avoid keywords
    if (this.mission.avoidKeywords && this.mission.avoidKeywords.length > 0) {
      filtered = filtered.filter(tweet => {
        const text = tweet.text.toLowerCase();
        return !this.mission.avoidKeywords.some((keyword: string) => 
          text.includes(keyword.toLowerCase())
        );
      });
    }

    // AI-powered enhanced relevance check
    console.log(`🔍 Running enhanced relevance prescan on ${filtered.length} tweets...`);
    const relevantTweets: Tweet[] = [];
    
    for (const tweet of filtered) {
      try {
        const relevanceCheck = await this.aiService.checkTweetRelevanceEnhanced(
          tweet.text,
          this.mission.objective,
          this.mission.intentDescription,
          tweet.public_metrics,
          this.userApiKeys?.preferredProvider,
          this.userApiKeys?.keys
        );
        
        if (relevanceCheck.isRelevant && relevanceCheck.totalScore >= 35) {
          relevantTweets.push(tweet);
          console.log(`   ✅ Relevant (${relevanceCheck.totalScore}/100): Topic:${relevanceCheck.breakdown.topicRelevance} Engagement:${relevanceCheck.breakdown.engagementPotential} Community:${relevanceCheck.breakdown.communityFit} Timing:${relevanceCheck.breakdown.timingOptimization} - ${tweet.text.substring(0, 80)}...`);
        } else {
          console.log(`   ❌ Not relevant (${relevanceCheck.totalScore}/100): ${relevanceCheck.reason} - ${tweet.text.substring(0, 80)}...`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`⚠️ Relevance check failed for tweet, including by default:`, error);
        relevantTweets.push(tweet); // Include on error to avoid blocking all engagement
      }
    }
    
    // Sort by engagement score
    relevantTweets.sort((a, b) => {
      const aScore = (a.public_metrics?.like_count || 0) + 
                    (a.public_metrics?.retweet_count || 0) + 
                    (a.public_metrics?.reply_count || 0);
      const bScore = (b.public_metrics?.like_count || 0) + 
                    (b.public_metrics?.retweet_count || 0) + 
                    (b.public_metrics?.reply_count || 0);
      return bScore - aScore;
    });

    console.log(`   ✅ Filtered to ${relevantTweets.length} relevant tweets (from ${tweets.length} total)`);
    return relevantTweets;
  }

  /**
   * Calculate dynamic action probability based on context and human-like variance
   */
  private calculateDynamicProbability(baseAction: any, tweet: Tweet, engagementCount: number): number {
    let probability = baseAction.probability || 50;
    
    // Content quality multiplier (based on engagement metrics)
    const totalEngagement = (tweet.public_metrics?.like_count || 0) + 
                           (tweet.public_metrics?.retweet_count || 0) + 
                           (tweet.public_metrics?.reply_count || 0);
    
    const qualityMultiplier = Math.min(1.5, 1 + (totalEngagement / 1000)); // Up to 50% boost for high-engagement content
    
    // Fatigue factor - reduce probability as we engage more
    const fatigueMultiplier = Math.max(0.6, 1 - (engagementCount * 0.05)); // Gradual reduction
    
    // Time-based variance (simulate human energy levels)
    const hour = new Date().getHours();
    const timeMultiplier = (hour >= 9 && hour <= 17) ? 1.1 : 0.9; // More active during business hours
    
    // Human-like randomness (±15% variance)
    const randomVariance = 0.85 + (Math.random() * 0.3);
    
    // Action-specific adjustments
    let actionMultiplier = 1;
    switch (baseAction.type) {
      case 'like':
        actionMultiplier = 1.2; // Likes are most common
        break;
      case 'reply':
        actionMultiplier = totalEngagement > 10 ? 1.3 : 0.8; // Reply more to engaging content
        break;
      case 'retweet':
        actionMultiplier = totalEngagement > 50 ? 1.4 : 0.6; // Retweet high-engagement content
        break;
      case 'quote':
        actionMultiplier = totalEngagement > 20 ? 1.2 : 0.7; // Quote interesting content
        break;
    }
    
    // Apply personality modifiers if available
    let personalityMultiplier = 1;
    if (this.mission.personalityTraits) {
      const personalityModifiers = PersonalityService.applyPersonalityToEngagement(
        { like: 100, reply: 100, retweet: 100, quote: 100 },
        this.mission.personalityTraits
      );
      
      switch (baseAction.type) {
        case 'like':
          personalityMultiplier = personalityModifiers.like / 100;
          break;
        case 'reply':
          personalityMultiplier = personalityModifiers.reply / 100;
          break;
        case 'retweet':
          personalityMultiplier = personalityModifiers.retweet / 100;
          break;
        case 'quote':
          personalityMultiplier = personalityModifiers.quote / 100;
          break;
      }
    }
    
    const finalProbability = probability * qualityMultiplier * fatigueMultiplier * 
                           timeMultiplier * randomVariance * actionMultiplier * personalityMultiplier;
    
    return Math.max(5, Math.min(95, Math.round(finalProbability))); // Keep between 5-95%
  }


  private async executeAction(action: any, tweet: Tweet): Promise<boolean> {
    // Check if this content type is enabled in mission preferences
    if (this.mission.contentTypes) {
      if (action.type === 'reply' && !this.mission.contentTypes.replies) {
        return false;
      }
      if (action.type === 'quote' && !this.mission.contentTypes.quoteTweets) {
        return false;
      }
    }
    
    switch (action.type) {
      case 'like':
        return await this.likeTweet(tweet.id);
      case 'retweet':
        return await this.retweetTweet(tweet.id);
      case 'reply':
        return await this.replyToTweet(tweet, action.customContent);
      case 'quote':
        return await this.quoteTweet(tweet, action.customContent);
      case 'follow':
        return await this.followUser(tweet.author_id);
      default:
        console.log(`⚠️ Unknown action type: ${action.type}`);
        return false;
    }
  }

  private async likeTweet(tweetId: string): Promise<boolean> {
    if (!this.canMakeRequest('like')) return false;
    
    await this.twitterClient.v2.like('3396445275', tweetId);
    this.recordRequest('like');
    return true;
  }

  private async retweetTweet(tweetId: string): Promise<boolean> {
    if (!this.canMakeRequest('retweet')) return false;
    
    await this.twitterClient.v2.retweet('3396445275', tweetId);
    this.recordRequest('retweet');
    return true;
  }

  private async replyToTweet(tweet: Tweet, customContent?: string): Promise<boolean> {
    if (!this.canMakeRequest('reply')) return false;
    
    // Check if we've already replied to this tweet
    const existingReply = await GeneratedPost.findOne({
      originalTweetId: tweet.id,
      interactionType: 'reply',
      status: 'sent'
    });
    
    if (existingReply) {
      console.log(`⚠️ Already replied to tweet ${tweet.id}, skipping duplicate`);
      return false;
    }
    
    let replyText = customContent;
    
    if (!replyText) {
      // Generate AI reply with personality (no emojis/hashtags)
      const context: ReplyContext = {
        originalTweet: tweet,
        missionObjective: this.mission.objective,
        replyPrompts: this.mission.replyPrompts || [],
        personalityTraits: this.mission.personalityTraits,
        strategicKeywords: this.mission.strategicKeywords || []
      };
      
      const generatedReply = await this.replyService.generateReply(context);
      replyText = generatedReply || undefined;
    }
    
    if (!replyText) {
      console.log(`❌ Could not generate reply content`);
      return false;
    }
    
    try {
      const replyResponse = await this.twitterClient.v2.reply(replyText, tweet.id);
      this.recordRequest('reply');
      
      // Save the reply to the database
      try {
        const generatedPost = new GeneratedPost({
          userId: this.mission.userId,
          missionId: this.mission._id,
          content: `@${tweet.author_id} ${replyText}`, // Include the @ mention for context
          status: 'sent',
          xPostId: replyResponse.data?.id,
          originalTweetId: tweet.id, // Track which tweet we replied to
          interactionType: 'reply', // Track that this is a reply
          timestamp: new Date()
        });
        
        await generatedPost.save();
        console.log(`💾 Reply saved to database: ${generatedPost._id}`);
      } catch (saveError: any) {
        console.error(`❌ Failed to save reply to database: ${saveError.message}`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to post reply: ${error.message}`);
      
      // Save failed reply to database for tracking
      try {
        const generatedPost = new GeneratedPost({
          userId: this.mission.userId,
          missionId: this.mission._id,
          content: `@${tweet.author_id} ${replyText}`,
          status: 'failed',
          originalTweetId: tweet.id, // Track which tweet we tried to reply to
          interactionType: 'reply', // Track that this is a reply
          timestamp: new Date()
        });
        
        await generatedPost.save();
        console.log(`💾 Failed reply saved to database: ${generatedPost._id}`);
      } catch (saveError: any) {
        console.error(`❌ Failed to save failed reply to database: ${saveError.message}`);
      }
      
      return false;
    }
  }

  private async quoteTweet(tweet: Tweet, customContent?: string): Promise<boolean> {
    if (!this.canMakeRequest('post')) return false;
    
    // Check if we've already quote tweeted this tweet
    const existingQuote = await GeneratedPost.findOne({
      originalTweetId: tweet.id,
      interactionType: 'quote',
      status: 'sent'
    });
    
    if (existingQuote) {
      console.log(`⚠️ Already quote tweeted ${tweet.id}, skipping duplicate`);
      return false;
    }
    
    let quoteText = customContent;
    
    if (!quoteText) {
      const context: ReplyContext = {
        originalTweet: tweet,
        missionObjective: this.mission.objective,
        replyPrompts: this.mission.replyPrompts || [],
        personalityTraits: this.mission.personalityTraits,
        strategicKeywords: this.mission.strategicKeywords || []
      };
      
      const generatedQuote = await this.replyService.generateQuoteTweet(context);
      quoteText = generatedQuote || undefined;
    }
    
    if (!quoteText) return false;
    
    try {
      const quoteResponse = await this.twitterClient.v2.quote(quoteText, tweet.id);
      this.recordRequest('post');
      
      // Save the quote tweet to the database
      try {
        const generatedPost = new GeneratedPost({
          userId: this.mission.userId,
          missionId: this.mission._id,
          content: quoteText,
          status: 'sent',
          xPostId: quoteResponse.data?.id,
          originalTweetId: tweet.id, // Track which tweet we quoted
          interactionType: 'quote', // Track that this is a quote tweet
          timestamp: new Date()
        });
        
        await generatedPost.save();
        console.log(`💾 Quote tweet saved to database: ${generatedPost._id}`);
      } catch (saveError: any) {
        console.error(`❌ Failed to save quote tweet to database: ${saveError.message}`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to post quote tweet: ${error.message}`);
      
      // Save failed quote tweet to database for tracking
      try {
        const generatedPost = new GeneratedPost({
          userId: this.mission.userId,
          missionId: this.mission._id,
          content: quoteText,
          status: 'failed',
          originalTweetId: tweet.id, // Track which tweet we tried to quote
          interactionType: 'quote', // Track that this is a quote tweet
          timestamp: new Date()
        });
        
        await generatedPost.save();
        console.log(`💾 Failed quote tweet saved to database: ${generatedPost._id}`);
      } catch (saveError: any) {
        console.error(`❌ Failed to save failed quote tweet to database: ${saveError.message}`);
      }
      
      return false;
    }
  }

  private async followUser(userId: string): Promise<boolean> {
    try {
      await this.twitterClient.v2.follow('3396445275', userId);
      return true;
    } catch (error) {
      // Follow endpoint has different rate limits, handle gracefully
      return false;
    }
  }

  private async publishPost(post: any): Promise<boolean> {
    if (!this.canMakeRequest('post')) {
      console.log(`⏰ Post rate limit reached, skipping post`);
      return false;
    }
    
    try {
      console.log(`📤 Publishing post: "${post.content.substring(0, 50)}..."`);
      
      const tweetResponse = await this.twitterClient.v2.tweet(post.content);
      this.recordRequest('post');
      
      // Save the published post to the database
      try {
        const generatedPost = new GeneratedPost({
          userId: this.mission.userId,
          missionId: this.mission._id,
          content: post.content,
          status: 'sent',
          xPostId: tweetResponse.data?.id,
          timestamp: new Date()
        });
        
        await generatedPost.save();
        console.log(`💾 Post saved to database: ${generatedPost._id}`);
      } catch (saveError: any) {
        console.error(`❌ Failed to save post to database: ${saveError.message}`);
        // Don't fail the whole operation if database save fails
      }
      
      // Remove posted content from queue if it's a one-time post
      if (this.mission.postFrequency === 'once') {
        this.mission.posts = this.mission.posts.filter((p: any) => p !== post);
        await this.mission.save();
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to publish post: ${error.message}`);
      
      // Save failed post to database for tracking
      try {
        const generatedPost = new GeneratedPost({
          userId: this.mission.userId,
          missionId: this.mission._id,
          content: post.content,
          status: 'failed',
          timestamp: new Date()
        });
        
        await generatedPost.save();
        console.log(`💾 Failed post saved to database: ${generatedPost._id}`);
      } catch (saveError: any) {
        console.error(`❌ Failed to save failed post to database: ${saveError.message}`);
      }
      
      return false;
    }
  }

  private canMakeRequest(type: 'like' | 'search' | 'reply' | 'retweet' | 'post'): boolean {
    const now = Date.now();
    const windowKey = Math.floor(now / RATE_LIMITS.WINDOW_DURATION_MS).toString();
    
    let window = rateLimitWindows.get(windowKey);
    if (!window) {
      window = { 
        startTime: now, 
        likesUsed: 0, 
        searchesUsed: 0,
        repliesUsed: 0,
        retweetsUsed: 0,
        postsUsed: 0
      };
      rateLimitWindows.set(windowKey, window);
    }
    
    const limits: Record<string, number> = {
      like: RATE_LIMITS.LIKES_PER_WINDOW,
      search: RATE_LIMITS.SEARCHES_PER_WINDOW,
      reply: RATE_LIMITS.REPLIES_PER_WINDOW,
      retweet: RATE_LIMITS.RETWEETS_PER_WINDOW,
      post: RATE_LIMITS.POSTS_PER_WINDOW
    };
    
    const used: Record<string, number> = {
      like: window.likesUsed,
      search: window.searchesUsed,
      reply: window.repliesUsed,
      retweet: window.retweetsUsed,
      post: window.postsUsed
    };
    
    return used[type] < limits[type];
  }

  private recordRequest(type: 'like' | 'search' | 'reply' | 'retweet' | 'post'): void {
    const now = Date.now();
    const windowKey = Math.floor(now / RATE_LIMITS.WINDOW_DURATION_MS).toString();
    
    let window = rateLimitWindows.get(windowKey);
    if (!window) {
      window = { 
        startTime: now, 
        likesUsed: 0, 
        searchesUsed: 0,
        repliesUsed: 0,
        retweetsUsed: 0,
        postsUsed: 0
      };
      rateLimitWindows.set(windowKey, window);
    }
    
    switch (type) {
      case 'like': window.likesUsed++; break;
      case 'search': window.searchesUsed++; break;
      case 'reply': window.repliesUsed++; break;
      case 'retweet': window.retweetsUsed++; break;
      case 'post': window.postsUsed++; break;
    }
  }

  private async processEngagementsWithQuotas(
    tweets: Tweet[], 
    minReplies: number, 
    minQuotes: number, 
    maxEngagements: number
  ): Promise<{ replies: number; quotes: number }> {
    let replyCount = 0;
    let quoteCount = 0;
    let engagementCount = 0;
    
    let enabledActions = this.mission.actions?.filter((action: any) => action.enabled) || [];
    
    // Prioritize reply and quote actions to meet quotas
    const replyActions = enabledActions.filter((a: any) => a.type === 'reply');
    const quoteActions = enabledActions.filter((a: any) => a.type === 'quote');
    const otherActions = enabledActions.filter((a: any) => a.type !== 'reply' && a.type !== 'quote');
    
    for (const tweet of tweets) {
      if (engagementCount >= maxEngagements) break;
      if (replyCount >= minReplies && quoteCount >= minQuotes) break;
      
      // Analyze thread intelligence first
      let threadContext = null;
      try {
        threadContext = await this.threadIntelligence.analyzeConversationThread(tweet.id);
        
        if (threadContext.riskLevel === 'high' && (!this.mission.riskTolerance || this.mission.riskTolerance === 'low')) {
          continue;
        }
        
        if (threadContext.suggestedApproach === 'avoid') {
          continue;
        }
      } catch (error) {
        // Continue with basic engagement if thread analysis fails
      }
      
      // Prioritize replies if below quota - FORCE fulfillment
      if (replyCount < minReplies && replyActions.length > 0) {
        const replyAction = replyActions[0];
        const probability = this.calculateDynamicProbability(replyAction, tweet, engagementCount);
        
        // Force reply generation if below minimum quota
        const shouldForceReply = replyCount < minReplies;
        const shouldGenerateReply = shouldForceReply || (Math.random() * 100 < probability);
        
        if (shouldGenerateReply) {
          const success = await this.executeAction(replyAction, tweet);
          if (success) {
            replyCount++;
            engagementCount++;
            const logMessage = `Reply generated (${replyCount}/${minReplies} quota) - ${shouldForceReply ? 'FORCED' : 'ORGANIC'}`;
            console.log(`✅ ${logMessage}`);
            this.logger.logQuota('success', logMessage, this.mission._id.toString(), {
              type: 'reply',
              current: replyCount,
              target: minReplies,
              forced: shouldForceReply,
              tweetId: tweet.id
            });
            await this.delay(2000);
          } else if (shouldForceReply) {
            const logMessage = `Failed to generate required reply (${replyCount}/${minReplies}) - retrying with next tweet`;
            console.log(`⚠️ ${logMessage}`);
            this.logger.logQuota('warning', logMessage, this.mission._id.toString(), {
              type: 'reply',
              current: replyCount,
              target: minReplies,
              tweetId: tweet.id
            });
          }
        }
      }
      
      // Prioritize quotes if below quota - FORCE fulfillment
      if (quoteCount < minQuotes && quoteActions.length > 0) {
        const quoteAction = quoteActions[0];
        const probability = this.calculateDynamicProbability(quoteAction, tweet, engagementCount);
        
        // Force quote generation if below minimum quota
        const shouldForceQuote = quoteCount < minQuotes;
        const shouldGenerateQuote = shouldForceQuote || (Math.random() * 100 < probability);
        
        if (shouldGenerateQuote) {
          const success = await this.executeAction(quoteAction, tweet);
          if (success) {
            quoteCount++;
            engagementCount++;
            const logMessage = `Quote tweet generated (${quoteCount}/${minQuotes} quota) - ${shouldForceQuote ? 'FORCED' : 'ORGANIC'}`;
            console.log(`✅ ${logMessage}`);
            this.logger.logQuota('success', logMessage, this.mission._id.toString(), {
              type: 'quote',
              current: quoteCount,
              target: minQuotes,
              forced: shouldForceQuote,
              tweetId: tweet.id
            });
            await this.delay(2000);
          } else if (shouldForceQuote) {
            const logMessage = `Failed to generate required quote (${quoteCount}/${minQuotes}) - retrying with next tweet`;
            console.log(`⚠️ ${logMessage}`);
            this.logger.logQuota('warning', logMessage, this.mission._id.toString(), {
              type: 'quote',
              current: quoteCount,
              target: minQuotes,
              tweetId: tweet.id
            });
          }
        }
      }
      
      // Fill remaining capacity with other actions
      if (engagementCount < maxEngagements && otherActions.length > 0) {
        for (const action of otherActions) {
          const probability = this.calculateDynamicProbability(action, tweet, engagementCount);
          
          if (Math.random() * 100 < probability) {
            const success = await this.executeAction(action, tweet);
            if (success) {
              engagementCount++;
              console.log(`✅ ${action.type} executed`);
              await this.delay(2000);
              break; // One action per tweet
            }
          }
        }
      }
      
      await this.delay(1000);
    }
    
    // CRITICAL: Ensure minimum quotas are met - retry mechanism
    if (replyCount < minReplies || quoteCount < minQuotes) {
      console.log(`⚠️ Quotas not met: ${replyCount}/${minReplies} replies, ${quoteCount}/${minQuotes} quotes`);
      console.log(`🔄 Attempting additional searches to fulfill quotas...`);
      
      // Try additional searches if we haven't met quotas
      for (const query of this.mission.targetQueries) {
        if (replyCount >= minReplies && quoteCount >= minQuotes) break;
        
        try {
          const additionalTweets = await this.searchTweets(query);
          // Process only what we need
          for (const tweet of additionalTweets.slice(0, 10)) {
            if (replyCount >= minReplies && quoteCount >= minQuotes) break;
            
            // Skip thread analysis for quota fulfillment - prioritize completion
            if (replyCount < minReplies && replyActions.length > 0) {
              const success = await this.executeAction(replyActions[0], tweet);
              if (success) {
                replyCount++;
                console.log(`✅ Additional reply generated (${replyCount}/${minReplies})`);
                await this.delay(2000);
              }
            }
            
            if (quoteCount < minQuotes && quoteActions.length > 0) {
              const success = await this.executeAction(quoteActions[0], tweet);
              if (success) {
                quoteCount++;
                console.log(`✅ Additional quote generated (${quoteCount}/${minQuotes})`);
                await this.delay(2000);
              }
            }
          }
        } catch (error: any) {
          console.log(`⚠️ Additional search failed for quota fulfillment: ${error.message}`);
        }
      }
    }
    
    console.log(`📊 Final quota results: ${replyCount}/${minReplies} replies, ${quoteCount}/${minQuotes} quotes`);
    
    this.logger.logQuota('info', `Final quota results: ${replyCount}/${minReplies} replies, ${quoteCount}/${minQuotes} quotes`, this.mission._id.toString(), {
      finalResults: {
        replies: { achieved: replyCount, target: minReplies, success: replyCount >= minReplies },
        quotes: { achieved: quoteCount, target: minQuotes, success: quoteCount >= minQuotes }
      }
    });
    
    return { replies: replyCount, quotes: quoteCount };
  }

  private async generateMinimumPosts(minPosts: number): Promise<void> {
    console.log(`📝 Generating ${minPosts} minimum posts for mission`);
    
    try {
      
      for (let i = 0; i < minPosts; i++) {
        const prompt = `Create an engaging social media post about: ${this.mission.objective}. 
        Focus on providing value and driving engagement through thought-provoking content.
        CRITICAL: NO emojis, NO hashtags, professional tone only. Use plain text.`;
        
        const request = {
          prompt,
          userId: this.mission.userId.toString(),
          missionObjective: this.mission.objective,
          targetQueries: this.mission.targetQueries,
          strategicKeywords: this.mission.strategicKeywords || [],
          maxTokens: 150,
          temperature: 0.7
        };
        
        let attempts = 0;
        let uniqueContent = null;
        
        // Try up to 3 times to generate unique content
        while (attempts < 3 && !uniqueContent) {
          const aiRequest = {
            ...request,
            prompt: attempts > 0 ? `${prompt} Generate a different variation with fresh perspective.` : prompt,
            provider: this.userApiKeys?.preferredProvider,
            userApiKeys: this.userApiKeys?.keys
          };
          
          const response = await this.aiService.generateContent(aiRequest);
          
          if (response?.content) {
            console.log(`✅ Generated content using ${response.provider} (${response.model})`);
            
            // Check if this content has been posted before
            const isDuplicate = await this.checkContentDuplicate(response.content);
            if (!isDuplicate) {
              uniqueContent = response.content;
            } else {
              console.log(`⚠️ Duplicate content detected, generating new variation (attempt ${attempts + 1})`);
            }
          }
          attempts++;
        }
        
        if (uniqueContent) {
          // Post the generated content
          const tweetResponse = await this.twitterClient.v2.tweet(uniqueContent);
          console.log(`✅ Generated post ${i + 1}/${minPosts}: "${uniqueContent.substring(0, 50)}..."`);
          
          // Save to database for duplicate tracking
          await this.saveGeneratedPost(uniqueContent, 'post', tweetResponse.data?.id);
          
          // Record the action
          this.recordRequest('post');
          
          // Delay between posts
          if (i < minPosts - 1) {
            await this.delay(5000);
          }
        } else {
          console.log(`❌ Failed to generate unique post ${i + 1}/${minPosts} after ${attempts} attempts`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error generating minimum posts: ${error.message}`);
    }
  }

  private async updateMissionMetrics(): Promise<void> {
    this.mission.lastRun = new Date();
    // Update success metrics would be tracked during execution
    await this.mission.save();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize user API keys for AI providers
   */
  private async initializeUserApiKeys(): Promise<void> {
    try {
      const userKeys = await UserApiKeys.findOne({ userId: this.mission.userId });
      if (userKeys) {
        // Get decrypted keys manually since the method might not be available
        const keys: any = {};
        if (userKeys.apiKeys?.openai?.active) {
          keys.openai = userKeys.getApiKey('openai');
        }
        if (userKeys.apiKeys?.xai?.active) {
          keys.xai = userKeys.getApiKey('xai');
        }
        
        this.userApiKeys = {
          keys,
          preferredProvider: userKeys.preferredProvider
        };
        console.log(`🔑 Loaded user API keys for mission: ${Object.keys(keys).join(', ')}`);
      } else {
        console.log('🔑 No user API keys found, using system keys');
      }
    } catch (error: any) {
      console.error('❌ Failed to load user API keys:', error.message);
      this.userApiKeys = null;
    }
  }

  /**
   * Check if content has been posted before to prevent duplicates
   */
  private async checkContentDuplicate(content: string): Promise<boolean> {
    try {
      // Check exact matches first
      const exactMatch = await GeneratedPost.findOne({
        userId: this.mission.userId,
        content: content,
        status: 'sent'
      });
      
      if (exactMatch) {
        return true;
      }
      
      // Check for similar content (80% similarity)
      const recentPosts = await GeneratedPost.find({
        userId: this.mission.userId,
        status: 'sent',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).select('content');
      
      for (const post of recentPosts) {
        const similarity = this.calculateTextSimilarity(content, post.content);
        if (similarity > 0.8) {
          console.log(`Content similarity detected: ${(similarity * 100).toFixed(1)}% with previous post`);
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      console.error(`Error checking content duplicate: ${error.message}`);
      return false; // Allow posting if check fails
    }
  }

  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Save generated post to database for tracking
   */
  private async saveGeneratedPost(content: string, type: string, xPostId?: string): Promise<void> {
    try {
      const generatedPost = new GeneratedPost({
        userId: this.mission.userId,
        missionId: this.mission._id,
        content: content,
        status: 'sent',
        xPostId: xPostId,
        interactionType: type,
        timestamp: new Date()
      });
      
      await generatedPost.save();
      console.log(`💾 Saved generated ${type} to database for duplicate tracking`);
    } catch (error: any) {
      console.error(`❌ Failed to save generated post: ${error.message}`);
    }
  }
}

// Start mission endpoint  
router.post('/start/:missionId', authenticate, async (req: any, res) => {
  try {
    const mission: any = await Mission.findById(req.params.missionId);
    if (!mission) return res.status(404).json({ message: 'Mission not found' });

    // Check if mission already running
    if (activeCronJobs.has(mission._id.toString())) {
      return res.status(400).json({ message: 'Mission is already running' });
    }

    const twitterClient = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_KEY_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
    });

    console.log(`🛩️  Starting mission: ${mission.objective}`);

    const executeMission = async () => {
      const pilot = new PaperPlanePilot(twitterClient, mission);
      await pilot.executeMission();
    };
    
    const cronJob = cron.schedule(mission.repeatSchedule, executeMission, {
      scheduled: true,
      timezone: "America/New_York"
    });
    
    activeCronJobs.set(mission._id.toString(), cronJob);
    
    // Update mission status
    mission.active = true;
    await mission.save();
    
    console.log(`📅 Paper Plane scheduled: ${mission.repeatSchedule} (EDT)`);
    
    res.json({ 
      message: 'Mission started successfully', 
      mission,
      missionType: mission.missionType,
      actionsEnabled: mission.actions?.filter((a: any) => a.enabled).map((a: any) => a.type) || [],
      nextExecution: 'As per schedule',
      timezone: 'America/New_York'
    });
    
  } catch (error: any) {
    console.error('Failed to start mission:', error.message);
    res.status(500).json({ message: 'Failed to start mission' });
  }
});

// Stop mission endpoint
router.post('/stop/:missionId', authenticate, async (req: any, res) => {
  try {
    const mission: any = await Mission.findById(req.params.missionId);
    if (!mission) return res.status(404).json({ message: 'Mission not found' });

    const missionId = mission._id.toString();
    
    // Check if we have an active cron job for this mission
    if (activeCronJobs.has(missionId)) {
      const cronJob = activeCronJobs.get(missionId);
      cronJob.stop();
      // Note: node-cron doesn't have destroy method, just stop is sufficient
      activeCronJobs.delete(missionId);
      
      console.log(`🛑 Mission stopped from active cron job: ${mission.objective}`);
    } else {
      // Mission might be active in database but not in memory (e.g., after service restart)
      // Just update the database status regardless
      console.log(`🛑 Mission stop requested (not in active jobs): ${mission.objective}`);
    }
    
    // Always update mission status to inactive
    mission.active = false;
    await mission.save();
    
    console.log(`� Mission status updated to inactive: ${mission.objective}`);
    
    res.json({ 
      message: 'Mission stopped successfully', 
      mission,
      note: activeCronJobs.has(missionId) ? 'Stopped active cron job' : 'Updated mission status (was not actively running)'
    });
    
  } catch (error: any) {
    console.error('Failed to stop mission:', error.message);
    res.status(500).json({ message: 'Failed to stop mission' });
  }
});

// Enhanced emergency start endpoint
router.post('/emergency-start/:missionId', async (req: any, res) => {
  try {
    const mission: any = await Mission.findById(req.params.missionId);
    if (!mission) return res.status(404).json({ message: 'Mission not found' });

    const twitterClient = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_KEY_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
    });

    console.log(`🛩️  Emergency deployment: ${mission.objective}`);

    const executeMission = async () => {
      const pilot = new PaperPlanePilot(twitterClient, mission);
      await pilot.executeMission();
    };
    
    const cronJob = cron.schedule(mission.repeatSchedule, executeMission, {
      scheduled: true,
      timezone: "America/New_York"
    });
    
    activeCronJobs.set(mission._id.toString(), cronJob);
    
    console.log(`📅 Paper Plane scheduled: ${mission.repeatSchedule} (EDT)`);
    
    res.json({ 
      message: 'Paper Plane deployed and mission scheduled', 
      mission,
      missionType: mission.missionType,
      actionsEnabled: mission.actions?.filter((a: any) => a.enabled).map((a: any) => a.type) || [],
      nextExecution: 'As per schedule',
      timezone: 'America/New_York'
    });
    
  } catch (error: any) {
    console.error('Emergency deployment failed:', error.message);
    res.status(500).json({ message: 'Failed to deploy Paper Plane' });
  }
});

// Add rate limit status endpoint
router.get('/rate-limits', (req, res) => {
  const now = Date.now();
  const windowKey = Math.floor(now / RATE_LIMITS.WINDOW_DURATION_MS).toString();
  const window = rateLimitWindows.get(windowKey);
  
  const status = {
    currentWindow: windowKey,
    windowStartTime: window?.startTime || now,
    timeUntilReset: RATE_LIMITS.WINDOW_DURATION_MS - (now % RATE_LIMITS.WINDOW_DURATION_MS),
    usage: {
      likes: { used: window?.likesUsed || 0, limit: RATE_LIMITS.LIKES_PER_WINDOW },
      searches: { used: window?.searchesUsed || 0, limit: RATE_LIMITS.SEARCHES_PER_WINDOW },
      replies: { used: window?.repliesUsed || 0, limit: RATE_LIMITS.REPLIES_PER_WINDOW },
      retweets: { used: window?.retweetsUsed || 0, limit: RATE_LIMITS.RETWEETS_PER_WINDOW },
      posts: { used: window?.postsUsed || 0, limit: RATE_LIMITS.POSTS_PER_WINDOW }
    }
  };
  
  res.json(status);
});

export default router;
