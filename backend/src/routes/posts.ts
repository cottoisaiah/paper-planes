import express from 'express';
import GeneratedPost from '../models/GeneratedPost';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get all posts for the authenticated user with filtering and pagination
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { status, missionId, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query filter
    const filter: any = { userId };
    if (status) filter.status = status;
    if (missionId) filter.missionId = missionId;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get posts with mission details
    const posts = await GeneratedPost.find(filter)
      .populate('missionId', 'objective missionType')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);
    
    // Get total count for pagination
    const totalCount = await GeneratedPost.countDocuments(filter);
    
    // Get summary stats
    const stats = await GeneratedPost.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCounts = stats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
    
    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasMore: skip + posts.length < totalCount
      },
      stats: {
        total: totalCount,
        sent: statusCounts.sent || 0,
        failed: statusCounts.failed || 0,
        draft: statusCounts.draft || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
router.post('/', authenticate, async (req: any, res) => {
  try {
    const post = new GeneratedPost({ ...req.body, userId: req.user.id });
    await post.save();
    await post.populate('missionId', 'objective missionType');
    res.json(post);
  } catch (error: any) {
    console.error('Error creating post:', error.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update a post
router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const post = await GeneratedPost.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    ).populate('missionId', 'objective missionType');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error: any) {
    console.error('Error updating post:', error.message);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const post = await GeneratedPost.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting post:', error.message);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get posts by mission
router.get('/mission/:missionId', authenticate, async (req: any, res) => {
  try {
    const { missionId } = req.params;
    const posts = await GeneratedPost.find({ 
      userId: req.user.id, 
      missionId 
    })
    .populate('missionId', 'objective missionType')
    .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error: any) {
    console.error('Error fetching mission posts:', error.message);
    res.status(500).json({ error: 'Failed to fetch mission posts' });
  }
});

export default router;
