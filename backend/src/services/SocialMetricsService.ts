import { TwitterApi } from 'twitter-api-v2';
import User, { IUser } from '../models/User';
import logger from '../utils/logger';

class SocialMetricsService {
  /**
   * Update user's social metrics from Twitter API
   */
  async updateUserMetrics(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize Twitter client with user's API keys
      const twitterClient = new TwitterApi({
        appKey: user.xApiKeys.apiKey,
        appSecret: user.xApiKeys.apiKeySecret,
        accessToken: user.xApiKeys.accessToken,
        accessSecret: user.xApiKeys.accessTokenSecret,
      });

      // Get user information from Twitter
      const twitterUser = await twitterClient.v2.userByUsername(user.xUsername, {
        'user.fields': ['public_metrics']
      });

      if (twitterUser.data && twitterUser.data.public_metrics) {
        const metrics = twitterUser.data.public_metrics;
        
        // Update user's social metrics
        await User.findByIdAndUpdate(userId, {
          'socialMetrics.followersCount': metrics.followers_count,
          'socialMetrics.followingCount': metrics.following_count,
          'socialMetrics.tweetsCount': metrics.tweet_count,
          'socialMetrics.lastUpdated': new Date()
        });

        logger.info(`Updated social metrics for user ${user.xUsername}:`, {
          followers: metrics.followers_count,
          following: metrics.following_count,
          tweets: metrics.tweet_count
        });
      }
    } catch (error: any) {
      logger.error('Error updating user metrics:', error);
      throw error;
    }
  }

  /**
   * Get user's current social metrics
   */
  async getUserMetrics(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).select('socialMetrics xUsername');
      if (!user) {
        throw new Error('User not found');
      }

      return {
        username: user.xUsername,
        metrics: user.socialMetrics
      };
    } catch (error: any) {
      logger.error('Error getting user metrics:', error);
      throw error;
    }
  }

  /**
   * Refresh metrics if they're older than 1 hour
   */
  async refreshMetricsIfNeeded(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return;
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (!user.socialMetrics.lastUpdated || user.socialMetrics.lastUpdated < oneHourAgo) {
        await this.updateUserMetrics(userId);
      }
    } catch (error: any) {
      logger.error('Error refreshing metrics:', error);
      // Don't throw - this is a background operation
    }
  }
}

export default new SocialMetricsService();
