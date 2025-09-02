import { TwitterApi } from 'twitter-api-v2';
import User, { IUser } from '../models/User';
import logger from '../utils/logger';

class PlatformTwitterService {
  private twitterClient: TwitterApi;

  constructor() {
    // Use OAuth 1.0a credentials for platform operations with twitter-api-v2
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      throw new Error('Twitter OAuth 1.0a credentials are required for platform operations');
    }

    // Initialize twitter-api-v2 client with OAuth 1.0a credentials
    this.twitterClient = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });
    
    logger.info('PlatformTwitterService initialized with fresh OAuth 1.0a credentials using twitter-api-v2');
  }

  /**
   * Get user's followers using platform credentials
   */
  async getUserFollowers(username: string, maxResults: number = 100): Promise<any[]> {
    try {
      logger.info(`Fetching followers for @${username} using platform credentials`);

      // Get user ID first using twitter-api-v2 syntax
      const userResponse = await this.twitterClient.v2.userByUsername(username);
      
      if (!userResponse.data) {
        throw new Error(`User @${username} not found`);
      }

      const userId = userResponse.data.id;

      // Get followers using twitter-api-v2 syntax
      const followersResponse = await this.twitterClient.v2.followers(userId, {
        max_results: Math.min(maxResults, 1000), // Twitter API limit
        'user.fields': ['profile_image_url', 'public_metrics', 'verified', 'description']
      });

      if (!followersResponse.data) {
        return [];
      }

      logger.info(`Successfully fetched ${followersResponse.data.length} followers for @${username}`);
      
      return followersResponse.data.map((follower: any) => ({
        id: follower.id,
        username: follower.username,
        name: follower.name,
        profileImageUrl: follower.profile_image_url,
        verified: follower.verified || false,
        description: follower.description || '',
        followersCount: follower.public_metrics?.followers_count || 0,
        followingCount: follower.public_metrics?.following_count || 0
      }));

    } catch (error: any) {
      logger.error(`Error fetching followers for @${username}:`, {
        error: error.message,
        code: error.code,
        data: error.data
      });
      throw error;
    }
  }

  /**
   * Get user's following list using platform credentials
   */
  async getUserFollowing(username: string, maxResults: number = 100): Promise<any[]> {
    try {
      logger.info(`Fetching following for @${username} using platform credentials`);

      // Get user ID first using twitter-api-v2 syntax
      const userResponse = await this.twitterClient.v2.userByUsername(username);
      
      if (!userResponse.data) {
        throw new Error(`User @${username} not found`);
      }

      const userId = userResponse.data.id;

      // Get following using twitter-api-v2 syntax
      const followingResponse = await this.twitterClient.v2.following(userId, {
        max_results: Math.min(maxResults, 1000), // Twitter API limit
        'user.fields': ['profile_image_url', 'public_metrics', 'verified', 'description']
      });

      if (!followingResponse.data) {
        return [];
      }

      logger.info(`Successfully fetched ${followingResponse.data.length} following for @${username}`);
      
      return followingResponse.data.map((user: any) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        profileImageUrl: user.profile_image_url,
        verified: user.verified || false,
        description: user.description || '',
        followersCount: user.public_metrics?.followers_count || 0,
        followingCount: user.public_metrics?.following_count || 0
      }));

    } catch (error: any) {
      logger.error(`Error fetching following for @${username}:`, {
        error: error.message,
        code: error.code,
        data: error.data
      });
      throw error;
    }
  }

  /**
   * Get user's recent tweets using platform credentials
   */
  async getUserTweets(username: string, maxResults: number = 100): Promise<any[]> {
    try {
      logger.info(`Fetching tweets for @${username} using platform credentials`);

      // Get user ID first using twitter-api-v2 syntax
      const userResponse = await this.twitterClient.v2.userByUsername(username);
      
      if (!userResponse.data) {
        throw new Error(`User @${username} not found`);
      }

      const userId = userResponse.data.id;

      // Get tweets using twitter-api-v2 syntax
      const tweetsResponse = await this.twitterClient.v2.userTimeline(userId, {
        max_results: Math.min(maxResults, 100), // Twitter API limit for timeline
        'tweet.fields': ['created_at', 'public_metrics', 'context_annotations', 'lang'],
        exclude: ['retweets', 'replies'] // Only original tweets
      });

      if (!tweetsResponse.data || !Array.isArray(tweetsResponse.data)) {
        return [];
      }

      logger.info(`Successfully fetched ${tweetsResponse.data.length} tweets for @${username}`);
      
      return tweetsResponse.data.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        retweetCount: tweet.public_metrics?.retweet_count || 0,
        likeCount: tweet.public_metrics?.like_count || 0,
        replyCount: tweet.public_metrics?.reply_count || 0,
        quoteCount: tweet.public_metrics?.quote_count || 0,
        lang: tweet.lang
      }));

    } catch (error: any) {
      logger.error(`Error fetching tweets for @${username}:`, {
        error: error.message,
        code: error.code,
        data: error.data
      });
      throw error;
    }
  }

  /**
   * Update user's social metrics using platform credentials
   */
  async updateUserMetrics(username: string): Promise<any> {
    try {
      logger.info(`Updating metrics for @${username} using platform credentials`);

      const userResponse = await this.twitterClient.v2.userByUsername(username, {
        'user.fields': ['public_metrics', 'verified', 'description']
      });

      if (!userResponse.data || !userResponse.data.public_metrics) {
        throw new Error(`Could not fetch metrics for @${username}`);
      }

      const metrics = userResponse.data.public_metrics;
      
      // Update user in database
      await User.findOneAndUpdate(
        { xUsername: username },
        {
          'socialMetrics.followersCount': metrics.followers_count,
          'socialMetrics.followingCount': metrics.following_count,
          'socialMetrics.tweetsCount': metrics.tweet_count,
          'socialMetrics.lastUpdated': new Date(),
          'xAccountId': userResponse.data.id,
          'verified': userResponse.data.verified || false
        }
      );

      logger.info(`Updated metrics for @${username}:`, {
        followers: metrics.followers_count,
        following: metrics.following_count,
        tweets: metrics.tweet_count
      });

      return {
        username,
        accountId: userResponse.data.id,
        metrics: {
          followersCount: metrics.followers_count,
          followingCount: metrics.following_count,
          tweetsCount: metrics.tweet_count,
          lastUpdated: new Date()
        },
        verified: userResponse.data.verified || false
      };

    } catch (error: any) {
      logger.error(`Error updating metrics for @${username}:`, {
        error: error.message,
        code: error.code,
        data: error.data
      });
      throw error;
    }
  }

  /**
   * Test the platform Twitter API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple API call using twitter-api-v2 syntax
      const response = await this.twitterClient.v2.userByUsername('twitter');
      return !!response.data;
    } catch (error: any) {
      logger.error('Platform Twitter API connection test failed:', error);
      return false;
    }
  }
}

export default new PlatformTwitterService();
