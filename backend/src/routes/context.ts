import express from 'express';
import ContextFunnel from '../models/ContextFunnel';
import { authenticate, requireActiveSubscription } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, async (req: any, res) => {
  const context = await ContextFunnel.find({ userId: req.user._id });
  res.json(context);
});

router.post('/', authenticate, requireActiveSubscription, async (req: any, res) => {
  const context = new ContextFunnel({ ...req.body, userId: req.user._id });
  await context.save();
  res.json(context);
});

router.put('/:id', authenticate, requireActiveSubscription, async (req: any, res) => {
  const context = await ContextFunnel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  res.json(context);
});

router.delete('/:id', authenticate, async (req: any, res) => {
  await ContextFunnel.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Context item deleted' });
});

export default router;
