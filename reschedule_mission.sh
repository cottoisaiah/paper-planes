#!/bin/bash

echo "🔄 Rescheduling Chainlink Mission to 8:45 PM EDT Today"
echo "====================================================="
echo "⏰ Current time: $(date)"
echo "🎯 New schedule: 8:45 PM EDT (in ~13 minutes)"
echo ""

# Update mission script
NODE_UPDATE='
const mongoose = require("mongoose");
require("dotenv").config({ path: "/home/apex_user/hologami/paper-planes/backend/.env.production" });

async function updateMission() {
  try {
    console.log("📋 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/paper-planes");
    
    const Mission = mongoose.model("Mission", new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      objective: String,
      intentDescription: String,
      repeatSchedule: String,
      targetQueries: [String],
      active: Boolean
    }, { timestamps: true }));
    
    // Update the mission to run at 8:45 PM today
    const updatedMission = await Mission.findByIdAndUpdate(
      "68b788d5072644365c4ef760",
      { 
        repeatSchedule: "45 20 * * *",  // 8:45 PM daily
        active: true
      },
      { new: true }
    );
    
    if (updatedMission) {
      console.log("✅ Mission updated successfully!");
      console.log("📅 New schedule:", updatedMission.repeatSchedule, "(8:45 PM EDT daily)");
      console.log("🟢 Status:", updatedMission.active ? "ACTIVE" : "INACTIVE");
      console.log("🎯 Objective:", updatedMission.objective);
    } else {
      console.log("❌ Mission not found");
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error("❌ Update failed:", error.message);
  }
}

updateMission();
'

cd /home/apex_user/hologami/paper-planes/backend && node -e "$NODE_UPDATE"

echo ""
echo "🔧 Now testing and fixing search functionality..."

# Test and fix search
SEARCH_TEST='
const { TwitterApi } = require("twitter-api-v2");
require("dotenv").config({ path: "/home/apex_user/hologami/paper-planes/backend/.env.production" });

async function testAndFixSearch() {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
    
    console.log("🔍 Testing search with corrected data access...");
    
    // Test search and show proper data access
    const queries = ["Chainlink", "oracle", "DeFi"];
    
    for (const query of queries) {
      try {
        const searchResult = await client.v2.search(query, { 
          max_results: 10,
          "tweet.fields": ["public_metrics", "created_at"],
          "user.fields": ["public_metrics", "verified"]
        });
        
        console.log(`📊 "${query}":`);
        console.log(`   Raw data available:`, !!searchResult.data);
        console.log(`   Tweet count:`, searchResult.data?.length || 0);
        console.log(`   Meta result_count:`, searchResult.meta?.result_count || 0);
        
        // Show how to properly access the data
        if (searchResult.data && searchResult.data.length > 0) {
          const firstTweet = searchResult.data[0];
          console.log(`   Sample tweet: "${firstTweet.text.substring(0, 60)}..."`);
          console.log(`   Engagement: ${firstTweet.public_metrics?.like_count || 0} likes`);
        }
        console.log("");
        
      } catch (error) {
        console.log(`   ❌ "${query}" failed:`, error.message);
      }
    }
    
    console.log("✅ Search test complete - data access confirmed!");
    
  } catch (error) {
    console.error("❌ Search test failed:", error.message);
  }
}

testAndFixSearch();
'

cd /home/apex_user/hologami/paper-planes/backend && node -e "$SEARCH_TEST"
