import { TwitterApi } from 'twitter-api-v2';
import logger from '../utils/logger';

interface BasicAnalytics {
  userMetrics: {
    followersCount: number;
    followingCount: number;
    tweetsCount: number;
    verified: boolean;
    lastUpdated: Date;
  };
  recentActivity: {
    tweets: number;
    engagement: string;
    topTweet?: any;
  };
  limitations: string[];
}

class BasicPlanAnalytics {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });
  }

  /**
   * Get comprehensive analytics using only Basic plan endpoints
   */
  async getAnalytics(username: string): Promise<BasicAnalytics> {
    try {
      // Get user data with public metrics (works on Basic plan)
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': ['created_at', 'description', 'public_metrics', 'verified', 'profile_image_url']
      });

      if (!user.data) {
        throw new Error('User not found');
      }

      // Get recent tweets (works on Basic plan)
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: 10,
        'tweet.fields': ['created_at', 'public_metrics', 'context_annotations', 'referenced_tweets']
      });

      // Calculate engagement insights from available data
      const tweetData = tweets.data?.data || [];
      const totalEngagement = tweetData.reduce((sum: number, tweet: any) => {
        const metrics = tweet.public_metrics;
        return sum + (metrics?.like_count || 0) + (metrics?.retweet_count || 0) + (metrics?.reply_count || 0);
      }, 0);

      // Find top performing tweet
      const topTweet = tweetData.reduce((best: any, current: any) => {
        const currentScore = (current.public_metrics?.like_count || 0) + 
                           (current.public_metrics?.retweet_count || 0) * 2 +
                           (current.public_metrics?.reply_count || 0);
        const bestScore = best ? ((best.public_metrics?.like_count || 0) + 
                                (best.public_metrics?.retweet_count || 0) * 2 +
                                (best.public_metrics?.reply_count || 0)) : 0;
        return currentScore > bestScore ? current : best;
      }, null);

      return {
        userMetrics: {
          followersCount: user.data.public_metrics?.followers_count || 0,
          followingCount: user.data.public_metrics?.following_count || 0,
          tweetsCount: user.data.public_metrics?.tweet_count || 0,
          verified: user.data.verified || false,
          lastUpdated: new Date()
        },
        recentActivity: {
          tweets: tweetData.length,
          engagement: totalEngagement > 0 ? `${totalEngagement} total interactions` : 'Limited recent activity',
          topTweet: topTweet ? {
            text: topTweet.text?.substring(0, 100) + '...',
            likes: topTweet.public_metrics?.like_count || 0,
            retweets: topTweet.public_metrics?.retweet_count || 0,
            replies: topTweet.public_metrics?.reply_count || 0
          } : undefined
        },
        limitations: [
          'Follower/Following lists require API upgrade',
          'Advanced demographics require API upgrade', 
          'Real-time follower tracking requires API upgrade',
          'Historical growth data requires API upgrade',
          'Competitor analysis requires API upgrade'
        ]
      };

    } catch (error: any) {
      logger.error('Basic plan analytics error:', { error: error.message });
      throw new Error(`Analytics fetch failed: ${error.message}`);
    }
  }

  /**
   * Get search insights using Basic plan search endpoint
   */
  async getSearchInsights(username: string, query?: string): Promise<any> {
    try {
      const searchQuery = query || `from:${username}`;
      const results = await this.client.v2.search(searchQuery, {
        max_results: 20,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id']
      });

      const tweets = results.data?.data || [];
      const totalEngagement = tweets.reduce((sum: number, tweet: any) => {
        const metrics = tweet.public_metrics;
        return sum + (metrics?.like_count || 0) + (metrics?.retweet_count || 0);
      }, 0);

      return {
        searchResults: tweets.length,
        totalEngagement,
        averageEngagement: tweets.length > 0 ? Math.round(totalEngagement / tweets.length) : 0,
        note: 'Search limited to Basic plan quotas'
      };

    } catch (error: any) {
      logger.error('Search insights error:', { error: error.message });
      return {
        error: 'Search insights temporarily unavailable',
        reason: error.message
      };
    }
  }
}

export default new BasicPlanAnalytics();
