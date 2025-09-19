import mongoose, { Schema, Document } from 'mongoose';

export interface IGeneratedPost extends Document {
  userId: mongoose.Types.ObjectId;
  missionId: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
  status: 'draft' | 'sent' | 'failed';
  xPostId?: string;
  originalTweetId?: string; // Track which tweet we replied to
  interactionType?: 'reply' | 'quote' | 'retweet' | 'like' | 'post'; // Track interaction type
  createdAt: Date;
  updatedAt: Date;
}

const generatedPostSchema = new Schema<IGeneratedPost>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['draft', 'sent', 'failed'], default: 'draft' },
  xPostId: { type: String },
  originalTweetId: { type: String }, // Track which tweet we replied to
  interactionType: { type: String, enum: ['reply', 'quote', 'retweet', 'like', 'post'] }, // Track interaction type
}, { timestamps: true });

export default mongoose.model<IGeneratedPost>('GeneratedPost', generatedPostSchema);
