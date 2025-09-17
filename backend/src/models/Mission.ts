import mongoose, { Schema, Document } from 'mongoose';

export interface IMissionAction {
  type: 'like' | 'retweet' | 'reply' | 'quote' | 'follow';
  enabled: boolean;
  probability: number; // 0-100, chance this action will be taken
  customContent?: string; // For replies/quotes
}

export interface IMissionPost {
  content: string;
  mediaUrls?: string[];
  scheduledTime?: Date; // If set, posts at specific time instead of random
}

export interface IMission extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Mission Identity
  objective: string;
  intentDescription: string;
  missionType: 'engage' | 'post' | 'hybrid'; // New: defines mission behavior
  
  // Content Type Preferences
  contentTypes: {
    posts: boolean;
    replies: boolean;
    quoteTweets: boolean;
  };
  
  // Scheduling
  repeatSchedule: string; // cron string
  active: boolean;
  
  // Engagement Settings (for 'engage' and 'hybrid' missions)
  targetQueries: string[]; // keywords, users, hashtags
  actions: IMissionAction[]; // Configurable actions pilots can take
  maxEngagementsPerRun: number; // Limit engagements per execution
  
  // Content Creation (for 'post' and 'hybrid' missions)
  posts: IMissionPost[]; // Queue of posts to publish
  postFrequency: 'once' | 'random' | 'scheduled'; // How often to post
  
  // Advanced Pilot Controls
  targetUserTypes: string[]; // 'verified', 'influencer', 'developer', etc.
  avoidKeywords: string[]; // Words/phrases to avoid in targeted content
  replyPrompts: string[]; // AI prompts for generating replies
  
  // Analytics & Learning
  lastRun: Date;
  successMetrics: {
    likes: number;
    retweets: number;
    replies: number;
    follows: number;
    posts: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const missionActionSchema = new Schema<IMissionAction>({
  type: { type: String, enum: ['like', 'retweet', 'reply', 'quote', 'follow'], required: true },
  enabled: { type: Boolean, default: true },
  probability: { type: Number, min: 0, max: 100, default: 50 },
  customContent: { type: String }
});

const missionPostSchema = new Schema<IMissionPost>({
  content: { type: String, required: true, maxlength: 280 },
  mediaUrls: [{ type: String }],
  scheduledTime: { type: Date }
});

const missionSchema = new Schema<IMission>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Mission Identity
  objective: { type: String, required: true },
  intentDescription: { type: String, required: true },
  missionType: { type: String, enum: ['engage', 'post', 'hybrid'], default: 'engage' },
  
  // Content Type Preferences
  contentTypes: {
    posts: { type: Boolean, default: true },
    replies: { type: Boolean, default: true },
    quoteTweets: { type: Boolean, default: true }
  },
  
  // Scheduling
  repeatSchedule: { type: String, required: true },
  active: { type: Boolean, default: false },
  
  // Engagement Settings
  targetQueries: [{ type: String }],
  actions: [missionActionSchema],
  maxEngagementsPerRun: { type: Number, default: 10 },
  
  // Content Creation
  posts: [missionPostSchema],
  postFrequency: { type: String, enum: ['once', 'random', 'scheduled'], default: 'once' },
  
  // Advanced Controls
  targetUserTypes: [{ type: String }],
  avoidKeywords: [{ type: String }],
  replyPrompts: [{ type: String }],
  
  // Analytics
  lastRun: { type: Date },
  successMetrics: {
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    follows: { type: Number, default: 0 },
    posts: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model<IMission>('Mission', missionSchema);
