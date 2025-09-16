import express from 'express';
import cron from 'node-cron';
import Mission from '../models/Mission';
import { TwitterApi } from 'twitter-api-v2';
import { authenticate, requireActiveSubscription } from '../middleware/auth';
import AIReplyService, { Tweet, ReplyContext } from '../services/AIReplyService';

const router = express.Router();

// Store active cron jobs
const activeCronJobs = new Map();

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
  
  constructor(twitterClient: TwitterApi, mission: any) {
    this.twitterClient = twitterClient;
    this.mission = mission;
  }

  async executeMission(): Promise<void> {
    console.log(`🛩️  Paper Plane "${this.mission.objective}" taking off!`);
    console.log(`📋 Mission Type: ${this.mission.missionType}`);
    
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
      
    } catch (error: any) {
      console.error(`❌ Mission failed: ${error.message}`);
    }
  }

  private async executeEngagementMission(): Promise<void> {
    console.log(`🎯 Executing engagement mission with ${this.mission.targetQueries.length} target queries`);
    
    let totalEngagements = 0;
    const maxEngagements = this.mission.maxEngagementsPerRun || 10;
    
    for (const query of this.mission.targetQueries) {
      if (totalEngagements >= maxEngagements) {
        console.log(`🛑 Reached max engagements (${maxEngagements}), stopping`);
        break;
      }
      
      try {
        const tweets = await this.searchTweets(query);
        const engagements = await this.processEngagements(tweets, maxEngagements - totalEngagements);
        totalEngagements += engagements;
        
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
    
    console.log(`📊 Total engagements completed: ${totalEngagements}`);
  }

  private async executePostMission(): Promise<void> {
    console.log(`📝 Executing post mission with ${this.mission.posts.length} queued posts`);
    
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
      public_metrics: tweet.public_metrics || {
        like_count: 0,
        retweet_count: 0,
        reply_count: 0,
        quote_count: 0
      }
    }));
    
    return this.filterTweets(convertedTweets);
  }

  private filterTweets(tweets: Tweet[]): Tweet[] {
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
    
    // Sort by engagement score
    filtered.sort((a, b) => {
      const aScore = (a.public_metrics?.like_count || 0) + 
                    (a.public_metrics?.retweet_count || 0) + 
                    (a.public_metrics?.reply_count || 0);
      const bScore = (b.public_metrics?.like_count || 0) + 
                    (b.public_metrics?.retweet_count || 0) + 
                    (b.public_metrics?.reply_count || 0);
      return bScore - aScore;
    });
    
    console.log(`   ✅ Filtered to ${filtered.length} quality tweets`);
    return filtered;
  }

  private async processEngagements(tweets: Tweet[], maxEngagements: number): Promise<number> {
    let engagementCount = 0;
    const enabledActions = this.mission.actions?.filter((action: any) => action.enabled) || [];
    
    if (enabledActions.length === 0) {
      console.log(`⚠️ No actions enabled for this mission`);
      return 0;
    }
    
    for (const tweet of tweets) {
      if (engagementCount >= maxEngagements) break;
      
      // Process each enabled action based on probability
      for (const action of enabledActions) {
        const shouldExecute = Math.random() * 100 < action.probability;
        
        if (!shouldExecute) continue;
        
        try {
          const success = await this.executeAction(action, tweet);
          if (success) {
            engagementCount++;
            console.log(`   ✅ ${action.type} executed on tweet ${tweet.id}`);
            
            // Delay between actions to be respectful
            await this.delay(2000);
          }
        } catch (error: any) {
          console.error(`   ❌ ${action.type} failed: ${error.message}`);
          if (error.message.includes('429')) {
            console.log(`⏰ Rate limited on ${action.type}, stopping engagements`);
            return engagementCount;
          }
        }
        
        // Limit one action per tweet to avoid spam
        break;
      }
    }
    
    return engagementCount;
  }

  private async executeAction(action: any, tweet: Tweet): Promise<boolean> {
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
    
    let replyText = customContent;
    
    if (!replyText) {
      // Generate AI reply
      const context: ReplyContext = {
        originalTweet: tweet,
        missionObjective: this.mission.objective,
        replyPrompts: this.mission.replyPrompts || []
      };
      
      const generatedReply = await AIReplyService.generateReply(context);
      replyText = generatedReply || undefined;
    }
    
    if (!replyText) {
      console.log(`❌ Could not generate reply content`);
      return false;
    }
    
    await this.twitterClient.v2.reply(replyText, tweet.id);
    this.recordRequest('reply');
    return true;
  }

  private async quoteTweet(tweet: Tweet, customContent?: string): Promise<boolean> {
    if (!this.canMakeRequest('post')) return false;
    
    let quoteText = customContent;
    
    if (!quoteText) {
      const context: ReplyContext = {
        originalTweet: tweet,
        missionObjective: this.mission.objective,
        replyPrompts: this.mission.replyPrompts || []
      };
      
      const generatedQuote = await AIReplyService.generateQuoteTweet(context);
      quoteText = generatedQuote || undefined;
    }
    
    if (!quoteText) return false;
    
    await this.twitterClient.v2.quote(quoteText, tweet.id);
    this.recordRequest('post');
    return true;
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
      
      await this.twitterClient.v2.tweet(post.content);
      this.recordRequest('post');
      
      // Remove posted content from queue if it's a one-time post
      if (this.mission.postFrequency === 'once') {
        this.mission.posts = this.mission.posts.filter((p: any) => p !== post);
        await this.mission.save();
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to publish post: ${error.message}`);
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

  private async updateMissionMetrics(): Promise<void> {
    this.mission.lastRun = new Date();
    // Update success metrics would be tracked during execution
    await this.mission.save();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
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
    
    if (activeCronJobs.has(missionId)) {
      const cronJob = activeCronJobs.get(missionId);
      cronJob.stop();
      cronJob.destroy();
      activeCronJobs.delete(missionId);
      
      // Update mission status
      mission.active = false;
      await mission.save();
      
      console.log(`🛑 Mission stopped: ${mission.objective}`);
      
      res.json({ message: 'Mission stopped successfully', mission });
    } else {
      res.status(400).json({ message: 'Mission is not currently running' });
    }
    
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
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
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
