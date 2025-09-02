import express from 'express';
import User from '../models/User';
import Mission from '../models/Mission';
import GeneratedPost from '../models/GeneratedPost';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(user);
});

router.get('/missions', authenticate, requireAdmin, async (req, res) => {
  const missions = await Mission.find({}).populate('userId');
  res.json(missions);
});

router.get('/posts', authenticate, requireAdmin, async (req, res) => {
  const posts = await GeneratedPost.find({}).populate('userId missionId');
  res.json(posts);
});

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  const userCount = await User.countDocuments();
  const missionCount = await Mission.countDocuments();
  const postCount = await GeneratedPost.countDocuments();
  res.json({ userCount, missionCount, postCount });
});

// Get all admins
router.get('/admins', authenticate, requireAdmin, async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true }).select('xUsername email isAdmin createdAt');
    res.json({ success: true, admins });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
});

// Add new admin
router.post('/admins', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    
    const user = await User.findOne({ xUsername: username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.isAdmin) {
      return res.status(400).json({ success: false, message: 'User is already an admin' });
    }
    
    user.isAdmin = true;
    user.subscriptionStatus = 'active'; // Give admins active subscription
    await user.save();
    
    res.json({ 
      success: true, 
      message: `${username} has been granted admin privileges`,
      admin: {
        id: user._id,
        xUsername: user.xUsername,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add admin' });
  }
});

// Remove admin privileges
router.delete('/admins/:id', authenticate, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    // Don't allow users to remove their own admin privileges
    if (currentUser._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'Cannot remove your own admin privileges' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.isAdmin) {
      return res.status(400).json({ success: false, message: 'User is not an admin' });
    }
    
    user.isAdmin = false;
    // Don't automatically change subscription status when removing admin
    await user.save();
    
    res.json({ 
      success: true, 
      message: `Admin privileges removed from ${user.xUsername}` 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to remove admin' });
  }
});

export default router;
