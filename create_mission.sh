#!/bin/bash

#!/bin/bash

# Enhanced Paper Plane Mission Creation Script
# Creates a comprehensive Chainlink engagement mission with full pilot control

echo "�️  Paper Planes - Enhanced Mission Control System"
echo "=================================================="

# Load environment variables
source /home/apex_user/hologami/paper-planes/backend/.env 2>/dev/null || echo "⚠️ No .env file found"

# Mission configuration
USER_ID="68b64a2c4669de4c738d64a0"
MISSION_ID="68b788d5072644365c4ef760"

echo "🎯 Creating enhanced Chainlink engagement mission..."

# Create the enhanced mission with MongoDB
node << 'EOF'
require('dotenv').config({ path: '/home/apex_user/hologami/paper-planes/backend/.env' });
const mongoose = require('mongoose');

async function createEnhancedMission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Enhanced mission configuration
    const enhancedMission = {
      _id: new mongoose.Types.ObjectId('68b788d5072644365c4ef760'),
      userId: new mongoose.Types.ObjectId('68b64a2c4669de4c738d64a0'),
      
      // Mission Identity
      objective: "Engage authentically with the Chainlink ecosystem and community",
      intentDescription: "Deploy intelligent engagement strategies across the Chainlink ecosystem. Focus on meaningful interactions with developers, researchers, and community members discussing oracle technology, DeFi integrations, and blockchain infrastructure.",
      missionType: "hybrid", // Can engage AND post
      
      // Scheduling
      repeatSchedule: "0 21 * * *", // Daily at 9 PM EDT
      active: false,
      
      // Enhanced Target Queries
      targetQueries: [
        "Chainlink",
        "LINK token", 
        "LINK crypto",
        "oracles blockchain",
        "smart contracts oracles",
        "DeFi infrastructure",
        "Chainlink ecosystem",
        "CCIP cross chain",
        "Chainlink VRF",
        "Web3 oracles",
        "decentralized oracles",
        "blockchain data feeds"
      ],
      
      // Pilot Action Configuration
      actions: [
        {
          type: "like",
          enabled: true,
          probability: 80, // 80% chance to like quality content
          customContent: null
        },
        {
          type: "retweet", 
          enabled: true,
          probability: 30, // 30% chance to retweet exceptional content
          customContent: null
        },
        {
          type: "reply",
          enabled: true,
          probability: 40, // 40% chance to reply with thoughtful response
          customContent: null // Will use AI generation
        },
        {
          type: "quote",
          enabled: true,
          probability: 20, // 20% chance to quote tweet with commentary
          customContent: null // Will use AI generation
        },
        {
          type: "follow",
          enabled: false, // Disabled for now - can be enabled by pilot
          probability: 10,
          customContent: null
        }
      ],
      
      maxEngagementsPerRun: 15, // Increased engagement capacity
      
      // Content Creation Queue
      posts: [
        {
          content: "The oracle problem in blockchain continues to evolve. Excited to see how decentralized data feeds are enabling new DeFi innovations. 🔗⛓️ #Chainlink #DeFi #Web3",
          mediaUrls: [],
          scheduledTime: null
        },
        {
          content: "Smart contracts are only as reliable as their data sources. Oracle networks like Chainlink are the critical infrastructure powering the next generation of dApps. 🚀",
          mediaUrls: [],
          scheduledTime: null
        },
        {
          content: "Cross-chain interoperability is becoming essential for DeFi. CCIP enabling secure asset and data transfer across different blockchains. The future is multi-chain! 🌐",
          mediaUrls: [],
          scheduledTime: null
        }
      ],
      
      postFrequency: "random", // Will randomly select from post queue
      
      // Advanced Pilot Controls
      targetUserTypes: ["developer", "researcher", "protocol", "influencer"],
      avoidKeywords: ["scam", "pump", "moon", "get rich", "guaranteed"], // Avoid low-quality content
      
      // AI Reply Prompts for Personality
      replyPrompts: [
        "Respond as a knowledgeable blockchain developer interested in oracle technology and infrastructure",
        "Share insights about decentralized systems and data reliability in Web3",
        "Ask thoughtful follow-up questions about technical implementations",
        "Provide constructive feedback on DeFi protocol designs and oracle integrations",
        "Express genuine curiosity about new developments in cross-chain technology"
      ],
      
      // Success Tracking
      successMetrics: {
        likes: 0,
        retweets: 0, 
        replies: 0,
        follows: 0,
        posts: 0
      },
      
      lastRun: null
    };

    // Upsert the enhanced mission
    const result = await mongoose.connection.db.collection('missions').replaceOne(
      { _id: enhancedMission._id },
      enhancedMission,
      { upsert: true }
    );

    if (result.upsertedId || result.modifiedCount > 0) {
      console.log('✅ Enhanced Chainlink mission created successfully!');
      console.log('📋 Mission Type: Hybrid (Engagement + Content Creation)');
      console.log('🎯 Target Queries:', enhancedMission.targetQueries.length);
      console.log('⚙️  Enabled Actions:', enhancedMission.actions.filter(a => a.enabled).map(a => a.type).join(', '));
      console.log('📝 Queued Posts:', enhancedMission.posts.length);
      console.log('🎮 Full pilot control activated!');
    } else {
      console.log('❌ Failed to create/update mission');
    }

  } catch (error) {
    console.error('❌ Error creating enhanced mission:', error.message);
  } finally {
    process.exit(0);
  }
}

createEnhancedMission();
EOF

echo ""
echo "�️  Enhanced Paper Plane Mission Summary:"
echo "----------------------------------------"
echo "✅ Mission Type: Hybrid (Engagement + Posting)"
echo "✅ Smart Actions: Like, Retweet, Reply, Quote Tweet"
echo "✅ AI-Powered Responses: Intelligent reply generation"
echo "✅ Content Queue: 3 high-quality posts ready"
echo "✅ Rate Limiting: Strict 15-minute window compliance"
echo "✅ Pilot Controls: Full customization available"
echo ""
echo "🎮 Mission Control Options:"
echo "   • Adjust action probabilities"
echo "   • Add/remove target keywords"
echo "   • Schedule specific posts"
echo "   • Customize AI reply prompts"
echo "   • Set engagement limits"
echo ""
echo "🚀 Ready for deployment!"
echo "   Use: curl -X POST http://localhost:5000/api/bots/emergency-start/68b788d5072644365c4ef760"

# First, let's create a test user token (for demo purposes)
#!/bin/bash

# Create a Paper Plane mission via API for Chainlink engagement
# Scheduled to run at 8:15 PM EDT (4 minutes from now)

echo "🚀 Creating Paper Plane Mission for Chainlink Engagement"
echo "======================================================="

# Mission details based on your screenshot
MISSION_DATA='{
  "objective": "Engage with Chainlink community and ecosystem",
  "intentDescription": "Find and interact with high-quality Chainlink content, researchers, and community members. Focus on smart contract oracle discussions, DeFi integrations, and LINK token ecosystem updates. Engage authentically with thoughtful responses and retweets.",
  "repeatSchedule": "15 20 * * *",
  "targetQueries": ["Chainlink", "LINK token", "$LINK", "oracles", "smart contracts", "DeFi oracles", "Chainlink ecosystem", "CCIP", "Chainlink VRF", "blockchain oracles"]
}'

echo "Mission scheduled for: 8:15 PM EDT (in 4 minutes)"
echo "Target queries: Chainlink ecosystem content"
echo ""

# First, we need to get an auth token
echo "📋 Note: You'll need to:"
echo "1. Login to your Paper Planes account first"
echo "2. Get your JWT token from localStorage"
echo "3. Replace YOUR_JWT_TOKEN below with your actual token"
echo ""

echo "🔗 API Call to create mission:"
echo "curl -X POST http://localhost:5000/api/missions "
echo "  -H 'Content-Type: application/json' "
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' "
echo "  -d '$MISSION_DATA'"

echo ""
echo "📅 Cron schedule explanation:"
echo "  '15 20 * * *' = Every day at 8:15 PM"
echo "  ┌─────────── minute (0-59)"
echo "  │ ┌───────── hour (0-23)"
echo "  │ │ ┌─────── day of month (1-31)"
echo "  │ │ │ ┌───── month (1-12)"
echo "  │ │ │ │ ┌─── day of week (0-7)"
echo "  │ │ │ │ │"
echo "  15 20 * * *"

echo ""
echo "✅ System timezone updated to EDT"
echo "⏰ Current time: $(date)"
echo "🎯 Mission will execute at 8:15 PM EDT daily"

curl -X POST http://localhost:5000/api/missions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-for-demo" \
  -d "$MISSION_DATA" \
  --silent --show-error || echo ""

echo ""
echo "✅ Mission creation attempted!"
echo "Note: This would normally require proper authentication."
echo "The mission is scheduled to run daily at 8:15pm (00:15 UTC)"
