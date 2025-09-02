import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Paper,
  Box,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface ContextItem {
  _id: string;
  data: string;
  type: 'text' | 'json' | 'file';
  filename?: string;
  createdAt: string;
}

const Context = () => {
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    data: '',
    type: 'text' as 'text' | 'json' | 'file',
    filename: ''
  });

  useEffect(() => {
    fetchContextItems();
  }, []);

  const fetchContextItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/context', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContextItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch context items');
    }
  };

  const handleCreateItem = () => {
    setSelectedItem(null);
    setFormData({
      data: '',
      type: 'text',
      filename: ''
    });
    setDialogOpen(true);
  };

  const handleEditItem = (item: ContextItem) => {
    setSelectedItem(item);
    setFormData({
      data: item.data,
      type: item.type,
      filename: item.filename || ''
    });
    setDialogOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (selectedItem) {
        await axios.put(`/api/context/${selectedItem._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Context item updated successfully');
      } else {
        await axios.post('/api/context', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Context item created successfully');
      }

      setDialogOpen(false);
      fetchContextItems();
    } catch (error) {
      toast.error('Failed to save context item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this context item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/context/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Context item deleted successfully');
      fetchContextItems();
    } catch (error) {
      toast.error('Failed to delete context item');
    }
  };

  const filteredItems = contextItems.filter(item =>
    item.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.filename && item.filename.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const truncateData = (data: string, maxLength: number = 150) => {
    return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'json': return '#4CAF50';
      case 'file': return '#FF9800';
      default: return '#2196F3';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ color: '#ffffff' }}>
          Context Funnel
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateItem}
          sx={{ backgroundColor: '#1DA1F2' }}
        >
          Add Context
        </Button>
      </Box>

      <Typography variant="body1" sx={{ mb: 3, color: '#8899a6' }}>
        Upload and manage context data to enhance your bot's responses. This data will be used 
        to generate more relevant and informed posts.
      </Typography>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#111111', border: '1px solid #333' }}>
        <TextField
          fullWidth
          placeholder="Search context items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: '#8899a6' }} />
          }}
        />
      </Paper>

      {/* Context Items Grid */}
      <Grid container spacing={3}>
        {filteredItems.map((item) => (
          <Grid item xs={12} md={6} lg={4} key={item._id}>
            <Card sx={{ backgroundColor: '#111111', border: '1px solid #333', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography 
                    variant="h6" 
                    component="div"
                    sx={{ 
                      color: getTypeColor(item.type),
                      textTransform: 'uppercase',
                      fontSize: '0.875rem'
                    }}
                  >
                    {item.type}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8899a6' }}>
                    {formatDate(item.createdAt)}
                  </Typography>
                </Box>
                
                {item.filename && (
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {item.filename}
                  </Typography>
                )}
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#ffffff',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {truncateData(item.data)}
                </Typography>
              </CardContent>
              
              <CardActions>
                <IconButton
                  size="small"
                  onClick={() => handleEditItem(item)}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteItem(item._id)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredItems.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#111111', border: '1px solid #333' }}>
          <Typography variant="h6" sx={{ color: '#8899a6' }}>
            {searchTerm ? 'No context items match your search' : 'No context items yet'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#8899a6', mt: 1 }}>
            {searchTerm ? 'Try a different search term' : 'Add some context data to get started'}
          </Typography>
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#111111', border: '1px solid #333' }
        }}
      >
        <DialogTitle>
          {selectedItem ? 'Edit Context Item' : 'Add Context Item'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="file">File</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Filename (optional)"
                value={formData.filename}
                onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Content"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                placeholder="Enter your context data here..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {selectedItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Context;
