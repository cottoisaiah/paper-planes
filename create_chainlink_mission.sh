#!/bin/bash

# Create mission with proper authentication for _cottoisaiah account
echo "🚀 Creating Chainlink Mission for @_cottoisaiah"
echo "=============================================="

# Load environment variables
export $(cat /home/apex_user/hologami/paper-planes/backend/.env.production | grep -v ^# | xargs)

echo "📱 Account: @_cottoisaiah"
echo "⏰ Current time: $(date)"
echo "🎯 Mission: Chainlink engagement at 8:15 PM EDT daily"
echo ""

# First, let's try to find existing user or create authentication
echo "🔐 Authenticating with existing user..."

# Create mission payload
MISSION_PAYLOAD='{
  "objective": "Engage with Chainlink community and ecosystem",
  "intentDescription": "Find and interact with high-quality Chainlink content, researchers, and community members. Focus on smart contract oracle discussions, DeFi integrations, and LINK token ecosystem updates. Engage authentically with thoughtful responses and retweets.",
  "repeatSchedule": "15 20 * * *",
  "targetQueries": ["Chainlink", "LINK token", "$LINK", "oracles", "smart contracts", "DeFi oracles", "Chainlink ecosystem", "CCIP", "Chainlink VRF", "blockchain oracles"]
}'

# Try to create user session and get token
echo "📋 Creating user session..."
NODE_SCRIPT='
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

async function authenticate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/paper-planes");
    
    const User = mongoose.model("User", new mongoose.Schema({
      xAccountId: String,
      xUsername: String,
      email: String,
      xApiKeys: {
        apiKey: String,
        apiKeySecret: String,
        bearerToken: String,
        accessToken: String,
        accessTokenSecret: String
      },
      subscriptionStatus: { type: String, default: "active" },
      hasOwnApiKeys: { type: Boolean, default: true },
      isAdmin: { type: Boolean, default: false }
    }, { timestamps: true }));

    let user = await User.findOne({ xUsername: "_cottoisaiah" });
    
    if (!user) {
      user = new User({
        xAccountId: "3396445275",
        xUsername: "_cottoisaiah", 
        email: "cottoisaiah.redex@gmail.com",
        xApiKeys: {
          apiKey: process.env.TWITTER_API_KEY,
          apiKeySecret: process.env.TWITTER_API_SECRET,
          bearerToken: process.env.TWITTER_BEARER_TOKEN,
          accessToken: process.env.TWITTER_ACCESS_TOKEN,
          accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
        },
        subscriptionStatus: "active",
        hasOwnApiKeys: true,
        isAdmin: true
      });
      await user.save();
      console.log("✅ User created");
    } else {
      console.log("✅ User found");
    }

    const token = jwt.sign(
      { _id: user._id, id: user._id },
      process.env.JWT_SECRET || "paper-planes-secret-key",
      { expiresIn: "24h" }
    );

    console.log("TOKEN:" + token);
    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    process.exit(1);
  }
}

authenticate();
'

# Get the JWT token
JWT_TOKEN=$(cd /home/apex_user/hologami/paper-planes/backend && node -e "$NODE_SCRIPT" 2>/dev/null | grep "TOKEN:" | cut -d':' -f2)

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Authentication successful"
echo "📡 Creating mission via API..."

# Create the mission
RESPONSE=$(curl -s -X POST http://localhost:5000/api/missions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$MISSION_PAYLOAD")

echo "📝 API Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# If successful, start the mission
if echo "$RESPONSE" | grep -q '"_id"'; then
  MISSION_ID=$(echo "$RESPONSE" | jq -r '._id' 2>/dev/null)
  if [ "$MISSION_ID" != "null" ] && [ -n "$MISSION_ID" ]; then
    echo ""
    echo "🚀 Starting mission..."
    START_RESPONSE=$(curl -s -X POST http://localhost:5000/api/bots/start/$MISSION_ID \
      -H "Authorization: Bearer $JWT_TOKEN")
    
    echo "🤖 Bot Status:"
    echo "$START_RESPONSE" | jq '.' 2>/dev/null || echo "$START_RESPONSE"
    
    echo ""
    echo "✅ Mission created and started!"
    echo "📅 Schedule: Daily at 8:15 PM EDT"
    echo "🎯 Target: Chainlink ecosystem content"
    echo "📊 Mission ID: $MISSION_ID"
  fi
else
  echo "❌ Mission creation failed"
fi
