import mongoose, { Schema, Document } from 'mongoose';

export interface IContextFunnel extends Document {
  userId: mongoose.Types.ObjectId;
  data: string; // JSON string or text
  type: 'text' | 'json' | 'file';
  filename?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contextFunnelSchema = new Schema<IContextFunnel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  data: { type: String, required: true },
  type: { type: String, enum: ['text', 'json', 'file'], default: 'text' },
  filename: { type: String },
}, { timestamps: true });

export default mongoose.model<IContextFunnel>('ContextFunnel', contextFunnelSchema);
