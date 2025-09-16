require('dotenv').config();
const mongoose = require('mongoose');

async function updateMissionSchedule() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const Mission = mongoose.model('Mission', {
            title: String,
            description: String,
            keywords: [String],
            userId: String,
            repeatSchedule: String,
            lastRun: Date,
            isActive: Boolean
        });
        
        // Update to run at 21:07 (2 minutes from now)
        const mission = await Mission.findByIdAndUpdate(
            '68b788d5072644365c4ef760',
            { repeatSchedule: '7 21 * * *' },
            { new: true }
        );
        
        console.log('✅ Mission updated successfully');
        console.log(`📅 New schedule: ${mission.repeatSchedule} (21:07 EDT)`);
        console.log('⏰ Will execute in about 2 minutes for testing');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

updateMissionSchedule();
