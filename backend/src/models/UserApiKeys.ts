import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IUserApiKeys extends Document {
  userId: mongoose.Types.ObjectId;
  apiKeys: {
    openai?: {
      encrypted: string;
      active: boolean;
      lastUsed?: Date;
      usageCount: number;
    };
    xai?: {
      encrypted: string;
      active: boolean;
      lastUsed?: Date;
      usageCount: number;
    };
  };
  preferredProvider?: 'openai' | 'xai';
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  encryptApiKey(apiKey: string): string;
  decryptApiKey(encryptedApiKey: string): string;
  setApiKey(provider: 'openai' | 'xai', apiKey: string): void;
  getApiKey(provider: 'openai' | 'xai'): string | null;
  updateUsage(provider: 'openai' | 'xai'): void;
  deactivateApiKey(provider: 'openai' | 'xai'): void;
  getDecryptedKeys(): { openai?: string; xai?: string };
}

const userApiKeysSchema = new Schema<IUserApiKeys>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  apiKeys: {
    openai: {
      encrypted: { type: String },
      active: { type: Boolean, default: true },
      lastUsed: { type: Date },
      usageCount: { type: Number, default: 0 }
    },
    xai: {
      encrypted: { type: String },
      active: { type: Boolean, default: true },
      lastUsed: { type: Date },
      usageCount: { type: Number, default: 0 }
    }
  },
  
  preferredProvider: { 
    type: String, 
    enum: ['openai', 'xai'],
    default: 'openai'
  }
}, { timestamps: true });

// Encryption/Decryption methods
userApiKeysSchema.methods.encryptApiKey = function(apiKey: string): string {
  const algorithm = 'aes-256-gcm';
  const secretKey = process.env.API_KEY_ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
  const key = crypto.createHash('sha256').update(secretKey).digest();
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

userApiKeysSchema.methods.decryptApiKey = function(encryptedApiKey: string): string {
  const algorithm = 'aes-256-gcm';
  const secretKey = process.env.API_KEY_ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
  const key = crypto.createHash('sha256').update(secretKey).digest();
  
  const parts = encryptedApiKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipher(algorithm, key);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

userApiKeysSchema.methods.setApiKey = function(provider: 'openai' | 'xai', apiKey: string) {
  if (!this.apiKeys) {
    this.apiKeys = {};
  }
  
  this.apiKeys[provider] = {
    encrypted: this.encryptApiKey(apiKey),
    active: true,
    lastUsed: null,
    usageCount: 0
  };
};

userApiKeysSchema.methods.getApiKey = function(provider: 'openai' | 'xai'): string | null {
  const providerData = this.apiKeys?.[provider];
  if (!providerData || !providerData.active) {
    return null;
  }
  
  try {
    return this.decryptApiKey(providerData.encrypted);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
};

userApiKeysSchema.methods.updateUsage = function(provider: 'openai' | 'xai') {
  if (this.apiKeys?.[provider]) {
    this.apiKeys[provider].lastUsed = new Date();
    this.apiKeys[provider].usageCount += 1;
  }
};

userApiKeysSchema.methods.deactivateApiKey = function(provider: 'openai' | 'xai') {
  if (this.apiKeys?.[provider]) {
    this.apiKeys[provider].active = false;
  }
};

userApiKeysSchema.methods.getDecryptedKeys = function(): { openai?: string; xai?: string } {
  const keys: { openai?: string; xai?: string } = {};
  
  if (this.apiKeys?.openai?.active) {
    keys.openai = this.getApiKey('openai');
  }
  
  if (this.apiKeys?.xai?.active) {
    keys.xai = this.getApiKey('xai');
  }
  
  return keys;
};

export default mongoose.model<IUserApiKeys>('UserApiKeys', userApiKeysSchema);