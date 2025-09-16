import dotenv from 'dotenv';
dotenv.config({ path: '/home/apex_user/hologami/paper-planes/backend/.env.production' });

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '/home/apex_user/hologami/paper-planes/backend/src/models/User.js';

console.log('🔐 Creating test user and generating JWT token...\n');

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/paper-planes');
    console.log('✅ Connected to MongoDB');

    // Check if test user exists
    let user = await User.findOne({ xUsername: '_cottoisaiah' });
    
    if (!user) {
      // Create test user with your X credentials
      user = new User({
        email: 'test@paperplanes.dev',
        password: 'testpassword123',
        xAccountId: '3396445275',
        xUsername: '_cottoisaiah',
        xApiKeys: {
          apiKey: process.env.TWITTER_API_KEY,
          apiKeySecret: process.env.TWITTER_API_SECRET,
          bearerToken: process.env.TWITTER_BEARER_TOKEN,
          accessToken: process.env.TWITTER_ACCESS_TOKEN,
          accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
          appId: '31063859'
        },
        hasOwnApiKeys: true,
        subscriptionStatus: 'active',
        isAdmin: true,
        socialMetrics: {
          followersCount: 653,
          followingCount: 312,
          tweetsCount: 23342,
          lastUpdated: new Date()
        }
      });

      await user.save();
      console.log('✅ Test user created:', user.xUsername);
    } else {
      console.log('✅ Test user already exists:', user.xUsername);
    }

    // Generate JWT token
    const token = jwt.sign(
      { _id: user._id, id: user._id }, 
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ JWT Token generated');
    console.log('📋 Copy this token for API calls:');
    console.log(token);

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

    return { user, token };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
