import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import { Visibility, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface GeneratedPost {
  _id: string;
  content: string;
  timestamp: string;
  status: 'draft' | 'sent' | 'failed';
  xPostId?: string;
  missionId: {
    _id: string;
    objective: string;
  };
}

const Posts = () => {
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<GeneratedPost | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/posts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to fetch posts');
    }
  };

  const handleViewPost = (post: GeneratedPost) => {
    setSelectedPost(post);
    setViewDialog(true);
  };

  const handleEditPost = (post: GeneratedPost) => {
    setSelectedPost(post);
    setEditContent(post.content);
    setEditDialog(true);
  };

  const handleUpdatePost = async () => {
    if (!selectedPost) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/posts/${selectedPost._id}`, 
        { content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Post updated successfully');
      setEditDialog(false);
      fetchPosts();
    } catch (error) {
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'error';
      default: return 'warning';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#ffffff' }}>
        Generated Posts
      </Typography>

      <Paper sx={{ backgroundColor: '#111111', border: '1px solid #333' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Content</TableCell>
                <TableCell>Mission</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Post ID</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post._id}>
                  <TableCell sx={{ maxWidth: 250 }}>
                    <Typography variant="body2">
                      {truncateContent(post.content)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {post.missionId?.objective || 'Unknown Mission'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={post.status}
                      color={getStatusColor(post.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(post.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {post.xPostId ? (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {post.xPostId}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#8899a6' }}>
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewPost(post)}
                      >
                        <Visibility />
                      </IconButton>
                      {post.status === 'draft' && (
                        <IconButton
                          size="small"
                          onClick={() => handleEditPost(post)}
                        >
                          <Edit />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePost(post._id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Post Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#111111', border: '1px solid #333' }
        }}
      >
        <DialogTitle>Post Details</DialogTitle>
        <DialogContent>
          {selectedPost && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Content
              </Typography>
              <Paper sx={{ p: 2, mb: 2, backgroundColor: '#1a1a1a' }}>
                <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedPost.content}
                </Typography>
              </Paper>
              
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                <strong>Mission:</strong> {selectedPost.missionId?.objective || 'Unknown'}<br/>
                <strong>Status:</strong> {selectedPost.status}<br/>
                <strong>Created:</strong> {formatDate(selectedPost.timestamp)}<br/>
                {selectedPost.xPostId && (
                  <>
                    <strong>X Post ID:</strong> {selectedPost.xPostId}
                  </>
                )}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#111111', border: '1px solid #333' }
        }}
      >
        <DialogTitle>Edit Post</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Post Content"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdatePost} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Posts;
