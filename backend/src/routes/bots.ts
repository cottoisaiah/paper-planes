import express from 'express';
import cron from 'node-cron';
import Mission from '../models/Mission';
import { authenticate, requireActiveSubscription } from '../middleware/auth';

const router = express.Router();

router.post('/start/:missionId', authenticate, requireActiveSubscription, async (req: any, res) => {
  const mission = await Mission.findOne({ _id: req.params.missionId, userId: req.user._id });
  if (!mission) return res.status(404).json({ message: 'Mission not found' });
  
  mission.active = true;
  await mission.save();
  
  // Schedule the mission
  cron.schedule(mission.repeatSchedule, () => {
    // Bot logic would go here
    console.log(`Running mission: ${mission.objective}`);
  });
  
  res.json({ message: 'Bot started', mission });
});

router.post('/stop/:missionId', authenticate, async (req: any, res) => {
  const mission = await Mission.findOne({ _id: req.params.missionId, userId: req.user._id });
  if (!mission) return res.status(404).json({ message: 'Mission not found' });
  
  mission.active = false;
  await mission.save();
  
  res.json({ message: 'Bot stopped', mission });
});

export default router;
