#!/bin/bash

echo "🔧 Updating Chainlink Mission Schedule to 9 PM EDT"
echo "================================================="
echo "⏰ Current time: $(date)"
echo "🎯 New schedule: 9:00 PM EDT (45 minutes:15 seconds from now)"
echo ""

# Load environment variables
export $(cat /home/apex_user/hologami/paper-planes/backend/.env.production | grep -v ^# | xargs)

# Update mission script
NODE_UPDATE='
const mongoose = require("mongoose");
require("dotenv").config({ path: "/home/apex_user/hologami/paper-planes/backend/.env.production" });

async function updateMissionSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/paper-planes");
    
    const Mission = mongoose.model("Mission", new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      objective: String,
      intentDescription: String,
      repeatSchedule: String,
      targetQueries: [String],
      active: Boolean
    }, { timestamps: true }));
    
    // Find and update the mission
    const mission = await Mission.findById("68b788d5072644365c4ef760");
    
    if (!mission) {
      console.log("❌ Mission not found");
      process.exit(1);
    }
    
    console.log("📋 Current mission:");
    console.log("   Schedule:", mission.repeatSchedule);
    console.log("   Active:", mission.active);
    
    // Update to 9 PM EDT (21:00)
    mission.repeatSchedule = "0 21 * * *";
    await mission.save();
    
    console.log("");
    console.log("✅ Mission updated:");
    console.log("   New schedule: 0 21 * * * (9:00 PM EDT daily)");
    console.log("   Status: Active");
    console.log("   Next run: Tonight at 9:00 PM EDT");
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error("❌ Update failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

updateMissionSchedule();
'

cd /home/apex_user/hologami/paper-planes/backend && node -e "$NODE_UPDATE"

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 Mission successfully rescheduled for 9:00 PM EDT!"
  echo "⏰ Time until execution: ~16 minutes"
else
  echo "❌ Failed to update mission schedule"
  exit 1
fi
