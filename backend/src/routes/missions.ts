import express from 'express';
import Mission from '../models/Mission';
import { authenticate, requireActiveSubscription } from '../middleware/auth';

const router = express.Router();

// Helper function to generate actions based on content types
function generateActionsFromContentTypes(contentTypes: any) {
  const actions = [];
  
  if (contentTypes?.replies) {
    actions.push({
      type: 'reply',
      enabled: true,
      probability: 70
    });
  }
  
  if (contentTypes?.quoteTweets) {
    actions.push({
      type: 'quote',
      enabled: true,
      probability: 60
    });
  }
  
  // Always include basic engagement actions
  actions.push(
    {
      type: 'like',
      enabled: true,
      probability: 80
    },
    {
      type: 'retweet',
      enabled: true,
      probability: 50
    }
  );
  
  return actions;
}

router.get('/', authenticate, async (req: any, res) => {
  const missions = await Mission.find({ userId: req.user._id });
  res.json(missions);
});

router.post('/', authenticate, requireActiveSubscription, async (req: any, res) => {
  const missionData = { ...req.body, userId: req.user._id };
  
  // Generate actions based on content types if contentTypes are provided
  if (missionData.contentTypes && !missionData.actions) {
    missionData.actions = generateActionsFromContentTypes(missionData.contentTypes);
  }
  
  const mission = new Mission(missionData);
  await mission.save();
  res.json(mission);
});

router.put('/:id', authenticate, async (req: any, res) => {
  const updateData = req.body;
  
  // Generate actions based on content types if contentTypes are being updated
  if (updateData.contentTypes) {
    updateData.actions = generateActionsFromContentTypes(updateData.contentTypes);
  }
  
  const mission = await Mission.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updateData,
    { new: true }
  );
  res.json(mission);
});

router.delete('/:id', authenticate, async (req: any, res) => {
  await Mission.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Mission deleted' });
});

export default router;
