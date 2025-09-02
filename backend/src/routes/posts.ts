import express from 'express';
import GeneratedPost from '../models/GeneratedPost';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, async (req: any, res) => {
  const posts = await GeneratedPost.find({ userId: req.user._id }).populate('missionId');
  res.json(posts);
});

router.post('/', authenticate, async (req: any, res) => {
  const post = new GeneratedPost({ ...req.body, userId: req.user._id });
  await post.save();
  res.json(post);
});

router.put('/:id', authenticate, async (req: any, res) => {
  const post = await GeneratedPost.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  res.json(post);
});

router.delete('/:id', authenticate, async (req: any, res) => {
  await GeneratedPost.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Post deleted' });
});

export default router;
