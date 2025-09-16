import { TwitterApi } from 'twitter-api-v2';
import EngagementData, { IEngagementData } from '../models/EngagementData';
import User, { IUser } from '../models/User';
import GeneratedPost from '../models/GeneratedPost';
import logger from '../utils/logger';

export class AnalyticsService {
  
  /**
   * Get followers list for a user
   */
  async getFollowersList(userId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error('User not found for followers fetch', { userId });
        return [];
      }

      const twitterClient = new TwitterApi({
        appKey: user.xApiKeys.apiKey,
        appSecret: user.xApiKeys.apiKeySecret,
        accessToken: user.xApiKeys.accessToken,
        accessSecret: user.xApiKeys.accessTokenSecret,
      });

      // Get user's followers
      const followers = await twitterClient.v2.followers(user.xAccountId, {
        max_results: Math.min(maxResults, 1000), // Twitter API limit
        'user.fields': ['public_metrics', 'created_at', 'description', 'location', 'verified', 'profile_image_url']
      });

      const followersList = [];
      if (followers.data && Array.isArray(followers.data)) {
        for (const follower of followers.data) {
          followersList.push({
            id: follower.id,
            username: follower.username,
            name: follower.name,
            description: follower.description || '',
            location: follower.location || '',
            verified: follower.verified || false,
            profileImageUrl: follower.profile_image_url || '',
            publicMetrics: follower.public_metrics || {},
            createdAt: follower.created_at || null,
          });
        }
      }

      logger.info('Followers list fetched successfully', { userId, count: followersList.length });
      return followersList;

    } catch (error: any) {
      logger.error('Error fetching followers list', { 
        userId, 
        error: error.message,
        code: error.code,
        data: error.data 
      });
      
      // Return empty array but log the specific error for debugging
      if (error.code === 401) {
        logger.error('Twitter API authentication failed - check API keys and permissions');
      } else if (error.code === 429) {
        logger.error('Twitter API rate limit exceeded');
      }
      
      return [];
    }
  }

  /**
   * Collect engagement data for a user
   */
  async collectEngagementData(userId: string): Promise<IEngagementData | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error('User not found for analytics collection', { userId });
        return null;
      }

      // Validate required Twitter API data
      if (!user.xApiKeys || !user.xApiKeys.apiKey || !user.xApiKeys.apiKeySecret || 
          !user.xApiKeys.accessToken || !user.xApiKeys.accessTokenSecret) {
        logger.error('User missing required Twitter API keys', { userId, username: user.xUsername });
        return null;
      }

      if (!user.xAccountId) {
        logger.error('User missing xAccountId', { userId, username: user.xUsername });
        return null;
      }

      logger.info('Initializing Twitter client for analytics collection', { 
        userId, 
        username: user.xUsername,
        accountId: user.xAccountId 
      });

      const twitterClient = new TwitterApi({
        appKey: user.xApiKeys.apiKey,
        appSecret: user.xApiKeys.apiKeySecret,
        accessToken: user.xApiKeys.accessToken,
        accessSecret: user.xApiKeys.accessTokenSecret,
      });

      // Get user's Twitter profile data
      logger.info('Fetching user profile data from Twitter API', { userId });
      const userProfile = await twitterClient.v2.me({
        'user.fields': ['public_metrics', 'created_at']
      });

      // Get recent tweets for engagement calculation
      logger.info('Fetching user timeline for engagement calculation', { userId });
      const tweets = await twitterClient.v2.userTimeline(user.xAccountId, {
        max_results: 100,
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        exclude: ['retweets', 'replies']
      });

      // Calculate today's posts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPosts = await GeneratedPost.countDocuments({
        userId,
        createdAt: { $gte: today }
      });

      // Get yesterday's follower count for growth calculation
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayData = await EngagementData.findOne({
        userId,
        date: yesterday
      });

      const currentFollowers = userProfile.data.public_metrics?.followers_count || 0;
      const previousFollowers = yesterdayData?.metrics.followers || currentFollowers;
      const followerGrowth = currentFollowers - previousFollowers;

      // Calculate total engagement from recent tweets
      let totalEngagement = 0;
      let totalImpressions = 0;
      
      if (tweets.data && Array.isArray(tweets.data)) {
        for (const tweet of tweets.data) {
          const metrics = tweet.public_metrics;
          if (metrics) {
            totalEngagement += (metrics.like_count || 0) + 
                             (metrics.retweet_count || 0) + 
                             (metrics.reply_count || 0) + 
                             (metrics.quote_count || 0);
            totalImpressions += metrics.impression_count || 0;
          }
        }
      }

      const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

      logger.info('Calculated engagement metrics', { 
        userId, 
        currentFollowers,
        followerGrowth,
        totalEngagement,
        engagementRate,
        todayPosts 
      });

      // Create or update today's engagement data
      const engagementData = await EngagementData.findOneAndUpdate(
        { userId, date: today },
        {
          userId,
          xAccountId: user.xAccountId,
          date: today,
          metrics: {
            followers: currentFollowers,
            following: userProfile.data.public_metrics?.following_count || 0,
            tweets: userProfile.data.public_metrics?.tweet_count || 0,
            likes: userProfile.data.public_metrics?.like_count || 0,
            retweets: 0, // Not available in user metrics
            replies: 0, // Not available in user metrics
            impressions: totalImpressions,
            profileViews: 0, // Not available in free tier
            mentions: 0, // Would need separate API call
          },
          dailyPosts: todayPosts,
          totalEngagement,
          engagementRate,
          followerGrowth,
          unfollows: followerGrowth < 0 ? Math.abs(followerGrowth) : 0,
        },
        { upsert: true, new: true }
      );

      logger.info('Analytics data collected successfully', { userId, date: today, dataId: engagementData._id });
      return engagementData;

    } catch (error: any) {
      logger.error('Error collecting engagement data', { 
        userId, 
        error: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack 
      });
      
      // Provide more specific error information
      if (error.code === 401) {
        logger.error('Twitter API authentication failed - invalid credentials', { userId });
      } else if (error.code === 403) {
        logger.error('Twitter API access forbidden - check permissions or suspended account', { userId });
      } else if (error.code === 429) {
        logger.error('Twitter API rate limit exceeded', { userId });
      } else if (error.code === 'ENOTFOUND') {
        logger.error('Network error - unable to reach Twitter API', { userId });
      }
      
      return null;
    }
  }

  /**
   * Get analytics data for a date range
   */
  async getAnalyticsData(userId: string, days: number = 30): Promise<IEngagementData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const data = await EngagementData.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      return data;
    } catch (error: any) {
      logger.error('Error fetching analytics data', { userId, error: error.message });
      return [];
    }
  }

  /**
   * Get engagement summary for dashboard
   */
  async getEngagementSummary(userId: string): Promise<any> {
    try {
      const last30Days = await this.getAnalyticsData(userId, 30);
      const last7Days = await this.getAnalyticsData(userId, 7);

      if (last30Days.length === 0) {
        return {
          totalFollowers: 0,
          followerGrowth30d: 0,
          followerGrowth7d: 0,
          totalEngagement30d: 0,
          avgEngagementRate: 0,
          totalPosts30d: 0,
          avgPostsPerDay: 0,
        };
      }

      const latest = last30Days[last30Days.length - 1];
      const oldest = last30Days[0];

      const totalEngagement30d = last30Days.reduce((sum, day) => sum + day.totalEngagement, 0);
      const totalPosts30d = last30Days.reduce((sum, day) => sum + day.dailyPosts, 0);
      const avgEngagementRate = last30Days.reduce((sum, day) => sum + day.engagementRate, 0) / last30Days.length;

      const followerGrowth30d = latest.metrics.followers - oldest.metrics.followers;
      const followerGrowth7d = last7Days.length > 0 ? 
        latest.metrics.followers - last7Days[0].metrics.followers : 0;

      return {
        totalFollowers: latest.metrics.followers,
        followerGrowth30d,
        followerGrowth7d,
        totalEngagement30d,
        avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
        totalPosts30d,
        avgPostsPerDay: Number((totalPosts30d / 30).toFixed(1)),
      };
    } catch (error: any) {
      logger.error('Error getting engagement summary', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Schedule daily analytics collection for all active users
   */
  async collectAllUsersAnalytics(): Promise<void> {
    try {
      const activeUsers = await User.find({ 
        'botSettings.active': true,
        subscriptionStatus: 'active'
      });

      logger.info(`Starting analytics collection for ${activeUsers.length} active users`);

      for (const user of activeUsers) {
        await this.collectEngagementData(user._id.toString());
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.info('Completed analytics collection for all active users');
    } catch (error: any) {
      logger.error('Error in bulk analytics collection', { error: error.message });
    }
  }
}

export default new AnalyticsService();
