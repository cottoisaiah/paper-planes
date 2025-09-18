import { TwitterApi } from 'twitter-api-v2';

export interface ConversationThread {
  rootTweetId: string;
  participantCount: number;
  messageCount: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'heated';
  topics: string[];
  engagementLevel: number;
  conversationStage: 'starting' | 'developing' | 'peak' | 'declining' | 'concluded';
  keyParticipants: TwitterUser[];
  contextualRelevance: number;
}

export interface TwitterUser {
  id: string;
  username: string;
  followerCount: number;
  influence: number;
  relationshipToMission: 'target' | 'ally' | 'neutral' | 'unknown';
}

export interface ThreadContext {
  thread: ConversationThread;
  optimalEntryPoint: string | null;
  suggestedApproach: 'supportive' | 'questioning' | 'informative' | 'humorous' | 'avoid';
  strategicValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedActions: string[];
}

export class ThreadIntelligenceService {
  private twitterClient: TwitterApi;

  constructor(twitterClient: TwitterApi) {
    this.twitterClient = twitterClient;
  }

  /**
   * Analyze conversation thread for strategic engagement opportunities
   */
  async analyzeConversationThread(tweetId: string): Promise<ThreadContext> {
    try {
      const thread = await this.mapConversationThread(tweetId);
      const strategicValue = this.calculateStrategicValue(thread);
      const optimalEntry = this.findOptimalEntryPoint(thread);
      const approach = this.determineBestApproach(thread);
      const riskLevel = this.assessRiskLevel(thread);
      
      return {
        thread,
        optimalEntryPoint: optimalEntry,
        suggestedApproach: approach,
        strategicValue,
        riskLevel,
        recommendedActions: this.generateRecommendedActions(thread, approach, riskLevel)
      };
    } catch (error) {
      console.error('Error analyzing conversation thread:', error);
      throw error;
    }
  }

  /**
   * Map out the complete conversation structure
   */
  private async mapConversationThread(tweetId: string): Promise<ConversationThread> {
    try {
      // Get the conversation thread
      const conversation = await this.twitterClient.v2.search({
        query: `conversation_id:${tweetId}`,
        max_results: 100,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'context_annotations', 'conversation_id'],
        'user.fields': ['public_metrics', 'verified'],
        expansions: ['author_id']
      });

      if (!conversation.data) {
        throw new Error('No conversation data found');
      }

      const tweets = conversation.data.data || [];
      const users = conversation.data.includes?.users || [];

      // Analyze participants
      const participantMap = new Map();
      users.forEach(user => {
        participantMap.set(user.id, {
          id: user.id,
          username: user.username,
          followerCount: user.public_metrics?.followers_count || 0,
          influence: this.calculateUserInfluence(user),
          relationshipToMission: 'unknown' as const
        });
      });

      // Analyze conversation metrics
      const totalEngagement = tweets.reduce((sum, tweet) => 
        sum + (tweet.public_metrics?.like_count || 0) + 
              (tweet.public_metrics?.reply_count || 0) + 
              (tweet.public_metrics?.retweet_count || 0), 0
      );

      // Extract topics and sentiment
      const topics = this.extractConversationTopics(tweets);
      const sentiment = this.analyzeSentiment(tweets);
      const stage = this.determineConversationStage(tweets);

      return {
        rootTweetId: tweetId,
        participantCount: participantMap.size,
        messageCount: tweets.length,
        sentiment,
        topics,
        engagementLevel: totalEngagement,
        conversationStage: stage,
        keyParticipants: Array.from(participantMap.values()),
        contextualRelevance: this.calculateContextualRelevance(tweets, topics)
      };
    } catch (error) {
      console.error('Error mapping conversation thread:', error);
      throw error;
    }
  }

  /**
   * Calculate strategic value of participating in this thread
   */
  private calculateStrategicValue(thread: ConversationThread): number {
    let value = 0;

    // Engagement potential (0-30 points)
    value += Math.min(30, thread.engagementLevel / 10);

    // Participant quality (0-25 points)
    const highInfluenceUsers = thread.keyParticipants.filter(p => p.influence > 70).length;
    value += Math.min(25, highInfluenceUsers * 5);

    // Topic relevance (0-25 points)
    value += Math.min(25, thread.contextualRelevance);

    // Conversation stage bonus (0-20 points)
    const stageMultipliers = {
      'starting': 20,
      'developing': 15,
      'peak': 10,
      'declining': 5,
      'concluded': 0
    };
    value += stageMultipliers[thread.conversationStage];

    return Math.round(value);
  }

  /**
   * Find the optimal point to enter the conversation
   */
  private findOptimalEntryPoint(thread: ConversationThread): string | null {
    // For now, return the root tweet as entry point
    // In a more sophisticated implementation, we'd analyze each tweet
    // for optimal engagement opportunities
    if (thread.conversationStage === 'concluded') {
      return null;
    }
    
    return thread.rootTweetId;
  }

  /**
   * Determine the best approach for engaging with this thread
   */
  private determineBestApproach(thread: ConversationThread): 'supportive' | 'questioning' | 'informative' | 'humorous' | 'avoid' {
    // High-risk situations
    if (thread.sentiment === 'heated' && thread.participantCount > 10) {
      return 'avoid';
    }

    // Low engagement or concluded conversations
    if (thread.conversationStage === 'concluded' || thread.engagementLevel < 5) {
      return 'avoid';
    }

    // Positive, developing conversations
    if (thread.sentiment === 'positive' && thread.conversationStage === 'developing') {
      return 'supportive';
    }

    // Informational topics with good engagement
    if (thread.contextualRelevance > 70 && thread.engagementLevel > 20) {
      return 'informative';
    }

    // Neutral conversations that could benefit from engagement
    if (thread.sentiment === 'neutral' && thread.participantCount < 8) {
      return 'questioning';
    }

    // Light-hearted engagement for smaller groups
    if (thread.participantCount < 5 && thread.sentiment !== 'negative') {
      return 'humorous';
    }

    return 'supportive';
  }

  /**
   * Assess the risk level of engaging with this thread
   */
  private assessRiskLevel(thread: ConversationThread): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Sentiment risk
    if (thread.sentiment === 'heated') riskScore += 30;
    if (thread.sentiment === 'negative') riskScore += 15;

    // Participant risk
    if (thread.participantCount > 15) riskScore += 20;
    if (thread.participantCount > 25) riskScore += 15;

    // Engagement risk (viral/controversial content)
    if (thread.engagementLevel > 1000) riskScore += 25;

    // Topic risk (would need more sophisticated topic analysis)
    const riskyTopics = ['politics', 'religion', 'controversy'];
    const hasRiskyTopics = thread.topics.some(topic => 
      riskyTopics.some(risky => topic.toLowerCase().includes(risky))
    );
    if (hasRiskyTopics) riskScore += 20;

    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  }

  /**
   * Generate specific action recommendations
   */
  private generateRecommendedActions(
    thread: ConversationThread, 
    approach: string, 
    riskLevel: string
  ): string[] {
    const actions: string[] = [];

    if (approach === 'avoid') {
      actions.push('Skip this conversation');
      actions.push('Monitor for future opportunities');
      return actions;
    }

    // Entry timing
    if (thread.conversationStage === 'starting') {
      actions.push('Enter early for maximum visibility');
    } else if (thread.conversationStage === 'developing') {
      actions.push('Join the conversation now');
    }

    // Engagement style
    switch (approach) {
      case 'supportive':
        actions.push('Add supportive commentary');
        actions.push('Share relevant experience');
        break;
      case 'questioning':
        actions.push('Ask thoughtful follow-up questions');
        actions.push('Seek clarification on key points');
        break;
      case 'informative':
        actions.push('Provide valuable insights');
        actions.push('Share relevant resources');
        break;
      case 'humorous':
        actions.push('Add light humor if appropriate');
        actions.push('Use casual, friendly tone');
        break;
    }

    // Risk mitigation
    if (riskLevel === 'medium') {
      actions.push('Keep responses neutral and factual');
    } else if (riskLevel === 'high') {
      actions.push('Avoid controversial statements');
      actions.push('Monitor responses closely');
    }

    return actions;
  }

  // Helper methods for analysis
  private calculateUserInfluence(user: any): number {
    const followers = user.public_metrics?.followers_count || 0;
    const verified = user.verified ? 20 : 0;
    
    // Simple influence calculation (can be enhanced)
    let influence = Math.min(80, Math.log10(followers + 1) * 10) + verified;
    return Math.round(influence);
  }

  private extractConversationTopics(tweets: any[]): string[] {
    // Extract hashtags and key terms
    const topics = new Set<string>();
    
    tweets.forEach(tweet => {
      // Extract hashtags
      const hashtags = tweet.text.match(/#\w+/g) || [];
      hashtags.forEach((tag: string) => topics.add(tag.toLowerCase()));
      
      // Extract context annotations if available
      if (tweet.context_annotations) {
        tweet.context_annotations.forEach((annotation: any) => {
          if (annotation.entity?.name) {
            topics.add(annotation.entity.name.toLowerCase());
          }
        });
      }
    });
    
    return Array.from(topics).slice(0, 10); // Limit to top 10 topics
  }

  private analyzeSentiment(tweets: any[]): 'positive' | 'negative' | 'neutral' | 'heated' {
    // Simple sentiment analysis based on keywords and patterns
    const positiveWords = ['great', 'awesome', 'love', 'thanks', 'amazing', 'excellent'];
    const negativeWords = ['hate', 'terrible', 'awful', 'worst', 'stupid', 'bad'];
    const heatedWords = ['wrong', 'ridiculous', 'idiotic', 'disgusting', 'outraged'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    let heatedScore = 0;
    
    tweets.forEach(tweet => {
      const text = tweet.text.toLowerCase();
      
      positiveWords.forEach(word => {
        if (text.includes(word)) positiveScore++;
      });
      
      negativeWords.forEach(word => {
        if (text.includes(word)) negativeScore++;
      });
      
      heatedWords.forEach(word => {
        if (text.includes(word)) heatedScore++;
      });
    });
    
    if (heatedScore > 2) return 'heated';
    if (negativeScore > positiveScore) return 'negative';
    if (positiveScore > negativeScore) return 'positive';
    return 'neutral';
  }

  private determineConversationStage(tweets: any[]): 'starting' | 'developing' | 'peak' | 'declining' | 'concluded' {
    if (tweets.length === 0) return 'concluded';
    
    // Sort tweets by creation time
    const sortedTweets = tweets.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const now = Date.now();
    const lastTweetTime = new Date(sortedTweets[sortedTweets.length - 1].created_at).getTime();
    const timeSinceLastTweet = now - lastTweetTime;
    
    // More than 24 hours since last tweet
    if (timeSinceLastTweet > 24 * 60 * 60 * 1000) {
      return 'concluded';
    }
    
    // More than 6 hours since last tweet
    if (timeSinceLastTweet > 6 * 60 * 60 * 1000) {
      return 'declining';
    }
    
    // Analyze tweet frequency to determine stage
    if (tweets.length < 3) {
      return 'starting';
    } else if (tweets.length < 10) {
      return 'developing';
    } else {
      return 'peak';
    }
  }

  private calculateContextualRelevance(tweets: any[], topics: string[]): number {
    // This would be enhanced with mission-specific relevance scoring
    // For now, return a base relevance score
    let relevance = 50; // Base relevance
    
    // Boost for engagement
    const totalEngagement = tweets.reduce((sum, tweet) => 
      sum + (tweet.public_metrics?.like_count || 0) + 
            (tweet.public_metrics?.reply_count || 0), 0
    );
    
    relevance += Math.min(30, totalEngagement / 10);
    
    // Boost for topic count (more topics = more relevance)
    relevance += Math.min(20, topics.length * 2);
    
    return Math.round(Math.min(100, relevance));
  }
}

export default ThreadIntelligenceService;