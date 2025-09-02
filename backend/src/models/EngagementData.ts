import mongoose, { Schema, Document } from 'mongoose';

export interface IEngagementData extends Document {
  userId: mongoose.Types.ObjectId;
  xAccountId: string;
  date: Date;
  metrics: {
    followers: number;
    following: number;
    tweets: number;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    profileViews: number;
    mentions: number;
  };
  dailyPosts: number;
  totalEngagement: number;
  engagementRate: number;
  followerGrowth: number;
  unfollows: number;
  createdAt: Date;
  updatedAt: Date;
}

const engagementDataSchema = new Schema<IEngagementData>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  xAccountId: { type: String, required: true },
  date: { type: Date, required: true },
  metrics: {
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    tweets: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    mentions: { type: Number, default: 0 },
  },
  dailyPosts: { type: Number, default: 0 },
  totalEngagement: { type: Number, default: 0 },
  engagementRate: { type: Number, default: 0 },
  followerGrowth: { type: Number, default: 0 },
  unfollows: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index for efficient queries
engagementDataSchema.index({ userId: 1, date: 1 }, { unique: true });
engagementDataSchema.index({ xAccountId: 1, date: 1 });

export default mongoose.model<IEngagementData>('EngagementData', engagementDataSchema);
