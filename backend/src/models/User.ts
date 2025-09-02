import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email?: string;
  password?: string;
  xAccountId: string;
  xUsername: string;
  xApiKeys: {
    apiKey: string;
    apiKeySecret: string;
    bearerToken: string;
    accessToken: string;
    accessTokenSecret: string;
    appId: string;
    refreshToken?: string;
  };
  botSettings: {
    active: boolean;
    defaultSchedule: string;
  };
  socialMetrics: {
    followersCount: number;
    followingCount: number;
    tweetsCount: number;
    lastUpdated: Date;
  };
  isAdmin: boolean;
  hasOwnApiKeys: boolean;
  subscriptionId?: string;
  subscriptionStatus: 'active' | 'inactive' | 'canceled';
  createdAt: Date;
  updatedAt: Date;
  comparePassword?(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: { type: String },
  password: { type: String },
  xAccountId: { type: String, required: true, unique: true },
  xUsername: { type: String, required: true },
  xApiKeys: {
    apiKey: { type: String, default: 'enZG8W7QYwKzOIDwmkfMjvCwU' },
    apiKeySecret: { type: String, default: 'h20ku5nScAvts0vHweLJguVZrodhEc3OeU6bD4CEEE8OUUs7Rc' },
    bearerToken: { type: String, default: 'AAAAAAAAAAAAAAAAAAAAADP%2F2QEAAAAAxWD467GAyr3sh%2BPuQUvWmYy3XU4%3D1HOktYHLp8DAvjw17XYJiuejTGzJVPneUQXYfA6HuhmilAsc6N' },
    accessToken: { type: String, default: '3396445275-y6j9lHNV5p0SARbGr5gQAtIT1LZNfsvk8DBN7Er' },
    accessTokenSecret: { type: String, default: 'jh2hPjxZm7WuEKuEDuHgNzUFYcsTVlmOV6bjBh2oMYK9D' },
    appId: { type: String, default: '31063859' },
    refreshToken: { type: String },
  },
  botSettings: {
    active: { type: Boolean, default: false },
    defaultSchedule: { type: String, default: '0 * * * *' },
  },
  socialMetrics: {
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    tweetsCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  isAdmin: { type: Boolean, default: false },
  hasOwnApiKeys: { type: Boolean, default: false },
  subscriptionId: { type: String },
  subscriptionStatus: { type: String, enum: ['active', 'inactive', 'canceled'], default: 'inactive' },
}, { timestamps: true });

// Hash password before saving (if using password)
userSchema.pre('save', async function(next) {
  if (this.password && !this.isModified('password')) return next();
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
