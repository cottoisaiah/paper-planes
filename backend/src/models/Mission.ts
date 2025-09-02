import mongoose, { Schema, Document } from 'mongoose';

export interface IMission extends Document {
  userId: mongoose.Types.ObjectId;
  objective: string;
  intentDescription: string;
  repeatSchedule: string; // cron string
  targetQueries: string[]; // keywords, users
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const missionSchema = new Schema<IMission>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  objective: { type: String, required: true },
  intentDescription: { type: String, required: true },
  repeatSchedule: { type: String, required: true },
  targetQueries: [{ type: String }],
  active: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IMission>('Mission', missionSchema);
