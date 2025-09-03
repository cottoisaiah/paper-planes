import express from 'express';
import cron from 'node-cron';
import Mission from '../models/Mission';
import { TwitterApi } from 'twitter-api-v2';
import { authenticate, requireActiveSubscription } from '../middleware/auth';

const router = express.Router();

// Store active cron jobs
const activeCronJobs = new Map();

// Rate limit tracking for Twitter API
interface RateLimitWindow {
  startTime: number;
  likesUsed: number;
  searchesUsed: number;
}

const rateLimitWindows = new Map<string, RateLimitWindow>();

// Twitter API Rate Limits (per 15-minute window)
const RATE_LIMITS = {
  LIKES_PER_WINDOW: 300,      // POST /2/users/:id/likes
  SEARCHES_PER_WINDOW: 450,   // GET /2/tweets/search/recent (Basic plan)
  WINDOW_DURATION_MS: 15 * 60 * 1000, // 15 minutes
};

// Check if we can make a request within rate limits
function canMakeRequest(type: 'like' | 'search', count: number = 1): boolean {
  const now = Date.now();
  const windowKey = Math.floor(now / RATE_LIMITS.WINDOW_DURATION_MS).toString();
  
  let window = rateLimitWindows.get(windowKey);
  if (!window) {
    window = { startTime: now, likesUsed: 0, searchesUsed: 0 };
    rateLimitWindows.set(windowKey, window);
  }
  
  // Clean up old windows (older than 1 hour)
  for (const [key, oldWindow] of rateLimitWindows.entries()) {
    if (now - oldWindow.startTime > 4 * RATE_LIMITS.WINDOW_DURATION_MS) {
      rateLimitWindows.delete(key);
    }
  }
  
  const limit = type === 'like' ? RATE_LIMITS.LIKES_PER_WINDOW : RATE_LIMITS.SEARCHES_PER_WINDOW;
  const used = type === 'like' ? window.likesUsed : window.searchesUsed;
  
  return (used + count) <= limit;
}

// Record API usage
function recordApiUsage(type: 'like' | 'search', count: number = 1): void {
  const now = Date.now();
  const windowKey = Math.floor(now / RATE_LIMITS.WINDOW_DURATION_MS).toString();
  
  let window = rateLimitWindows.get(windowKey);
  if (!window) {
    window = { startTime: now, likesUsed: 0, searchesUsed: 0 };
    rateLimitWindows.set(windowKey, window);
  }
  
  if (type === 'like') {
    window.likesUsed += count;
  } else {
    window.searchesUsed += count;
  }
  
  console.log(`📊 Rate limit usage - ${type}s: ${type === 'like' ? window.likesUsed : window.searchesUsed}/${type === 'like' ? RATE_LIMITS.LIKES_PER_WINDOW : RATE_LIMITS.SEARCHES_PER_WINDOW} in current 15min window`);
}

// Get time until next window resets
function getTimeUntilReset(): number {
  const now = Date.now();
  const currentWindowStart = Math.floor(now / RATE_LIMITS.WINDOW_DURATION_MS) * RATE_LIMITS.WINDOW_DURATION_MS;
  const nextWindowStart = currentWindowStart + RATE_LIMITS.WINDOW_DURATION_MS;
  return nextWindowStart - now;
}

// Temporary endpoint to start mission without auth for urgent deployment
router.post('/emergency-start/:missionId', async (req: any, res) => {
  try {
    const mission: any = await Mission.findById(req.params.missionId);
    if (!mission) return res.status(404).json({ message: 'Mission not found' });

    // Create Twitter client for the mission
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    console.log(`🚀 Emergency starting mission: ${mission.objective}`);

    // Define the mission execution function
    const executeMission = async () => {
      console.log(`🤖 Executing mission: ${mission.objective}`);
      
      // Check rate limits before starting
      if (!canMakeRequest('search', mission.targetQueries.length)) {
        const resetTime = Math.ceil(getTimeUntilReset() / 1000 / 60);
        console.log(`⏰ Search rate limit would be exceeded. Skipping execution. Next window resets in ${resetTime} minutes.`);
        return;
      }
      
      const maxLikes = Math.min(mission.targetQueries.length * 3, RATE_LIMITS.LIKES_PER_WINDOW);
      if (!canMakeRequest('like', maxLikes)) {
        const resetTime = Math.ceil(getTimeUntilReset() / 1000 / 60);
        console.log(`⏰ Like rate limit would be exceeded. Skipping execution. Next window resets in ${resetTime} minutes.`);
        return;
      }
      
      console.log(`✅ Rate limit check passed. Proceeding with mission.`);
      
      try {
        for (const keyword of mission.targetQueries) {
          if (!keyword || keyword.trim() === '') continue;
          
          // Check search rate limit before each search
          if (!canMakeRequest('search', 1)) {
            console.log(`⏰ Search rate limit reached. Stopping mission early.`);
            break;
          }
          
          const query = `${keyword} -is:retweet lang:en`;
          console.log(`🔍 Searching for: ${query}`);
          
          try {
            const searchResults = await twitterClient.v2.search(query, { 
              max_results: 10,
              'tweet.fields': ['public_metrics', 'author_id', 'created_at']
            });
            
            // Record the search API usage
            recordApiUsage('search', 1);
            
            // Access the actual tweet data correctly
            const tweets = searchResults.data?.data || [];
            
            console.log(`   📊 Meta result count: ${searchResults.meta?.result_count || 0}`);
            console.log(`   📋 Accessible tweets: ${tweets.length}`);
          
            if (tweets && Array.isArray(tweets) && tweets.length > 0) {
              // Sort by engagement (likes + retweets + replies + quotes)
              const sortedTweets = tweets.sort((a, b) => {
                const aEngagement = (a.public_metrics?.like_count || 0) + 
                                  (a.public_metrics?.retweet_count || 0) + 
                                  (a.public_metrics?.reply_count || 0) + 
                                  (a.public_metrics?.quote_count || 0);
                const bEngagement = (b.public_metrics?.like_count || 0) + 
                                  (b.public_metrics?.retweet_count || 0) + 
                                  (b.public_metrics?.reply_count || 0) + 
                                  (b.public_metrics?.quote_count || 0);
                return bEngagement - aEngagement;
              });

              // Engage with top tweets (with strict rate limit handling)
              let successfulLikes = 0;
              let rateLimitHit = false;
              
              for (let i = 0; i < Math.min(3, sortedTweets.length) && !rateLimitHit; i++) {
                const tweet = sortedTweets[i];
                
                // Check like rate limit before each like
                if (!canMakeRequest('like', 1)) {
                  console.log(`   ⏰ Like rate limit reached. Stopping engagement for this keyword.`);
                  rateLimitHit = true;
                  break;
                }
                
                try {
                  await twitterClient.v2.like('3396445275', tweet.id);  // Use hardcoded user ID
                  
                  // Record the like API usage
                  recordApiUsage('like', 1);
                  successfulLikes++;
                  console.log(`   ❤️ Liked tweet: ${tweet.id} (${successfulLikes}/3)`);
                  
                  // Longer delay between actions to respect rate limits
                  await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (engageError: any) {
                  if (engageError.message.includes('429')) {
                    console.log(`   ⏰ API returned 429. Rate limit reached after ${successfulLikes} likes.`);
                    rateLimitHit = true;
                  } else {
                    console.error(`   ❌ Failed to engage with tweet ${tweet.id}: ${engageError.message}`);
                  }
                }
              }
              
              if (rateLimitHit) {
                console.log(`   🛑 Stopping all engagement due to rate limits. Will retry in next scheduled execution.`);
                break; // Exit the keyword loop entirely
              }
            } else {
              console.log(`   ⚠️ No tweets found for keyword: ${keyword}`);
            }
            
          } catch (searchError: any) {
            console.error(`   ❌ Search failed for "${keyword}": ${searchError.message}`);
            if (searchError.message.includes('429')) {
              console.log(`   ⏰ Search rate limit hit. Stopping mission.`);
              break;
            }
          }
          
          // Rate limiting delay between searches
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Update last run
        mission.lastRun = new Date();
        await mission.save();
        console.log(`✅ Mission completed successfully`);
      } catch (missionError: any) {
        console.error(`❌ Mission execution failed: ${missionError.message}`);
      }
    };
    
    // Schedule the mission
    const cronJob = cron.schedule(mission.repeatSchedule, executeMission, {
      scheduled: true,
      timezone: "America/New_York"
    });
    
    // Store the cron job for potential cleanup
    activeCronJobs.set(mission._id.toString(), cronJob);
    
    console.log(`📅 Mission scheduled: ${mission.repeatSchedule} (EDT)`);
    
    res.json({ 
      message: 'Emergency mission started and scheduled', 
      mission,
      nextExecution: 'Daily at 9:00 PM EDT',
      timezone: 'America/New_York'
    });
    
  } catch (error: any) {
    console.error('Emergency start mission error:', error.message);
    res.status(500).json({ message: 'Failed to start mission' });
  }
});

router.post('/start/:missionId', authenticate, requireActiveSubscription, async (req: any, res) => {
  try {
    const mission = await Mission.findOne({ _id: req.params.missionId, userId: req.user._id });
    if (!mission) return res.status(404).json({ message: 'Mission not found' });
    
    mission.active = true;
    await mission.save();
    
    // Create Twitter client for the mission
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });
    
    // Define the mission execution function
    const executeMission = async () => {
      try {
        console.log(`🚀 Executing mission: ${mission.objective}`);
        
        // Search for relevant content using target queries
        for (const query of mission.targetQueries) {
          try {
            console.log(`🔍 Searching for: ${query}`);
            const searchResults = await twitterClient.v2.search(query, { 
              max_results: 10,
              'tweet.fields': ['public_metrics', 'author_id', 'created_at']
            });
            
            // Access the actual tweet data correctly
            const tweets = searchResults.data?.data || [];
            
            console.log(`   📊 Meta result count: ${searchResults.meta?.result_count || 0}`);
            console.log(`   📋 Accessible tweets: ${tweets.length}`);
            
            if (tweets && Array.isArray(tweets) && tweets.length > 0) {
              console.log(`   ✅ Found ${tweets.length} tweets for "${query}"`);
              
              // Engage with top tweets (like and potentially retweet)
              for (const tweet of tweets.slice(0, 3)) { // Limit to top 3 per query
                try {
                  // Like the tweet
                  await twitterClient.v2.like(req.user._id, tweet.id);
                  console.log(`   ❤️  Liked tweet: ${tweet.text.substring(0, 50)}...`);
                  
                  // Retweet high-engagement content
                  if (tweet.public_metrics && tweet.public_metrics.like_count > 10) {
                    await twitterClient.v2.retweet(req.user._id, tweet.id);
                    console.log(`   🔄 Retweeted high-engagement content`);
                  }
                  
                  // Rate limiting - wait between actions
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                } catch (engageError: any) {
                  console.log(`   ❌ Engagement failed: ${engageError.message}`);
                }
              }
            } else {
              console.log(`   📭 No accessible tweets found for "${query}" (Meta shows ${searchResults.meta?.result_count || 0} results)`);
            }
            
            // Rate limiting between queries
            await new Promise(resolve => setTimeout(resolve, 5000));
            
          } catch (searchError: any) {
            console.log(`   ❌ Search failed for "${query}": ${searchError.message}`);
          }
        }
        
        console.log(`✅ Mission "${mission.objective}" completed`);
        
      } catch (missionError: any) {
        console.error(`❌ Mission execution failed: ${missionError.message}`);
      }
    };
    
    // Schedule the mission
    const cronJob = cron.schedule(mission.repeatSchedule, executeMission, {
      scheduled: true,
      timezone: "America/New_York"
    });
    
    // Store the cron job for potential cleanup
    activeCronJobs.set(mission._id.toString(), cronJob);
    
    console.log(`📅 Mission scheduled: ${mission.repeatSchedule} (EDT)`);
    
    res.json({ 
      message: 'Bot started and scheduled', 
      mission,
      nextExecution: 'Daily at 8:15 PM EDT',
      timezone: 'America/New_York'
    });
    
  } catch (error: any) {
    console.error('Start mission error:', error.message);
    res.status(500).json({ message: 'Failed to start mission' });
  }
});

router.post('/stop/:missionId', authenticate, async (req: any, res) => {
  try {
    const mission = await Mission.findOne({ _id: req.params.missionId, userId: req.user._id });
    if (!mission) return res.status(404).json({ message: 'Mission not found' });
    
    mission.active = false;
    await mission.save();
    
    // Stop the cron job if it exists
    const cronJob = activeCronJobs.get(mission._id.toString());
    if (cronJob) {
      cronJob.destroy();
      activeCronJobs.delete(mission._id.toString());
      console.log(`🛑 Stopped mission: ${mission.objective}`);
    }
    
    res.json({ message: 'Bot stopped', mission });
    
  } catch (error: any) {
    console.error('Stop mission error:', error.message);
    res.status(500).json({ message: 'Failed to stop mission' });
  }
});

// Manual trigger endpoint for immediate testing
router.post('/trigger/:missionId', authenticate, async (req: any, res) => {
  try {
    const mission = await Mission.findOne({ _id: req.params.missionId, userId: req.user._id });
    if (!mission) return res.status(404).json({ message: 'Mission not found' });
    
    console.log(`🧪 Manual trigger for mission: ${mission.objective}`);
    
    // Create Twitter client for the mission
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });
    
    // Execute mission immediately
    const executeMission = async () => {
      try {
        console.log(`🚀 Executing mission: ${mission.objective}`);
        
        // Search for relevant content using target queries (test with first 2 queries)
        for (const query of mission.targetQueries.slice(0, 2)) {
          try {
            console.log(`🔍 Searching for: ${query}`);
            const searchResults = await twitterClient.v2.search(query, { 
              max_results: 10,
              'tweet.fields': ['public_metrics', 'author_id', 'created_at']
            });
            
            // Access the actual tweet data correctly
            const tweets = searchResults.data?.data || [];
            
            console.log(`   📊 Meta result count: ${searchResults.meta?.result_count || 0}`);
            console.log(`   📋 Accessible tweets: ${tweets.length}`);
            
            if (tweets && Array.isArray(tweets) && tweets.length > 0) {
              console.log(`   ✅ Found ${tweets.length} tweets for "${query}"`);
              
              // For testing, just log what we would do (don't actually engage yet)
              for (const tweet of tweets.slice(0, 2)) {
                console.log(`   📄 Tweet: "${tweet.text?.substring(0, 80) || 'No text'}..."`);
                console.log(`   💓 Likes: ${tweet.public_metrics?.like_count || 0}, RTs: ${tweet.public_metrics?.retweet_count || 0}`);
              }
              
            } else {
              console.log(`   📭 No accessible tweets found for "${query}" (Meta shows ${searchResults.meta?.result_count || 0} results)`);
            }
            
            // Rate limiting between queries
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (searchError: any) {
            console.log(`   ❌ Search failed for "${query}": ${searchError.message}`);
          }
        }
        
        console.log(`✅ Mission test completed`);
        
      } catch (missionError: any) {
        console.error(`❌ Mission execution failed: ${missionError.message}`);
      }
    };
    
    // Execute immediately
    executeMission();
    
    res.json({ 
      message: 'Mission triggered manually for testing', 
      mission,
      note: 'Check server logs for execution details'
    });
    
  } catch (error: any) {
    console.error('Trigger mission error:', error.message);
    res.status(500).json({ message: 'Failed to trigger mission' });
  }
});

// Rate limit status endpoint
router.get('/rate-limit-status', async (req: any, res) => {
  try {
    const now = Date.now();
    const windowKey = Math.floor(now / RATE_LIMITS.WINDOW_DURATION_MS).toString();
    const window = rateLimitWindows.get(windowKey) || { startTime: now, likesUsed: 0, searchesUsed: 0 };
    
    const timeUntilReset = getTimeUntilReset();
    const minutesUntilReset = Math.ceil(timeUntilReset / 1000 / 60);
    
    res.json({
      currentWindow: {
        likes: {
          used: window.likesUsed,
          limit: RATE_LIMITS.LIKES_PER_WINDOW,
          remaining: RATE_LIMITS.LIKES_PER_WINDOW - window.likesUsed,
          percentage: Math.round((window.likesUsed / RATE_LIMITS.LIKES_PER_WINDOW) * 100)
        },
        searches: {
          used: window.searchesUsed,
          limit: RATE_LIMITS.SEARCHES_PER_WINDOW,
          remaining: RATE_LIMITS.SEARCHES_PER_WINDOW - window.searchesUsed,
          percentage: Math.round((window.searchesUsed / RATE_LIMITS.SEARCHES_PER_WINDOW) * 100)
        }
      },
      resetInfo: {
        minutesUntilReset,
        resetTime: new Date(now + timeUntilReset).toISOString()
      },
      canExecuteMission: canMakeRequest('search', 10) && canMakeRequest('like', 30)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get rate limit status', error: error.message });
  }
});

export default router;
