import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';
import { toast } from 'react-toastify';

interface User {
  _id: string;
  xUsername: string;
  xAccountId: string;
  isAdmin: boolean;
  hasOwnApiKeys: boolean;
  subscriptionStatus: string;
  createdAt: string;
  xApiKeys: {
    apiKey: string;
    apiKeySecret: string;
    accessToken: string;
    accessTokenSecret: string;
  };
}

interface Stats {
  userCount: number;
  missionCount: number;
  postCount: number;
}

const AdminPanel = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ userCount: 0, missionCount: 0, postCount: 0 });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialog, setEditDialog] = useState(false);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers();
      fetchStats();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch stats');
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 4) return '****';
    return '***' + key.slice(-4);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/users/${selectedUser._id}`, selectedUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User updated successfully');
      setEditDialog(false);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  if (!user?.isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Access Denied
        </Typography>
        <Typography>You don't have permission to access this page.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#ffffff' }}>
        Admin Dashboard
      </Typography>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom>
              Total Users
            </Typography>
            <Typography variant="h3" sx={{ color: '#1DA1F2' }}>
              {stats.userCount}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom>
              Total Missions
            </Typography>
            <Typography variant="h3" sx={{ color: '#1DA1F2' }}>
              {stats.missionCount}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom>
              Total Posts
            </Typography>
            <Typography variant="h3" sx={{ color: '#1DA1F2' }}>
              {stats.postCount}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Paper sx={{ backgroundColor: '#111111', border: '1px solid #333' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom>
            User Management
          </Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Account ID</TableCell>
                <TableCell>Subscription</TableCell>
                <TableCell>Own API Keys</TableCell>
                <TableCell>API Key (Last 4)</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>@{user.xUsername}</TableCell>
                  <TableCell>{user.xAccountId}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.subscriptionStatus} 
                      color={user.subscriptionStatus === 'active' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.hasOwnApiKeys ? 'Yes' : 'No'} 
                      color={user.hasOwnApiKeys ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{maskApiKey(user.xApiKeys?.apiKey)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.isAdmin ? 'Admin' : 'User'} 
                      color={user.isAdmin ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => handleEditUser(user)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog 
        open={editDialog} 
        onClose={() => setEditDialog(false)}
        PaperProps={{
          sx: { backgroundColor: '#111111', border: '1px solid #333' }
        }}
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Username"
                value={selectedUser.xUsername}
                disabled
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Subscription Status</InputLabel>
                <Select
                  value={selectedUser.subscriptionStatus}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    subscriptionStatus: e.target.value
                  })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="canceled">Canceled</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Admin Status</InputLabel>
                <Select
                  value={selectedUser.isAdmin}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    isAdmin: e.target.value as boolean
                  })}
                >
                  <MenuItem value="false">User</MenuItem>
                  <MenuItem value="true">Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;
