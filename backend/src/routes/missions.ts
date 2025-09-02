import express from 'express';
import Mission from '../models/Mission';
import { authenticate, requireActiveSubscription } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, async (req: any, res) => {
  const missions = await Mission.find({ userId: req.user._id });
  res.json(missions);
});

router.post('/', authenticate, requireActiveSubscription, async (req: any, res) => {
  const mission = new Mission({ ...req.body, userId: req.user._id });
  await mission.save();
  res.json(mission);
});

router.put('/:id', authenticate, async (req: any, res) => {
  const mission = await Mission.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  res.json(mission);
});

router.delete('/:id', authenticate, async (req: any, res) => {
  await Mission.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Mission deleted' });
});

export default router;
