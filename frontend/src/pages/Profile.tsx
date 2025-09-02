import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';
import { toast } from 'react-toastify';

interface UserProfile {
  xUsername: string;
  xAccountId: string;
  isAdmin: boolean;
  hasOwnApiKeys: boolean;
  subscriptionStatus: string;
  xApiKeys: {
    apiKey: string;
    apiKeySecret: string;
    bearerToken: string;
    accessToken: string;
    accessTokenSecret: string;
    appId: string;
  };
}

const Profile = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [apiKeys, setApiKeys] = useState({
    apiKey: '',
    apiKeySecret: '',
    bearerToken: '',
    accessToken: '',
    accessTokenSecret: '',
    appId: ''
  });
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error) {
      toast.error('Failed to fetch profile');
    }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 4) return '****';
    return '***' + key.slice(-4);
  };

  const handleUpdateApiKeys = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/auth/api-keys', apiKeys, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('API keys updated successfully');
      setShowApiDialog(false);
      fetchProfile();
    } catch (error) {
      toast.error('Failed to update API keys');
    } finally {
      setLoading(false);
    }
  };

  const fetchTwitterAccountId = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/fetch-account-id', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Account ID: ${response.data.accountId}`);
    } catch (error) {
      toast.error('Failed to fetch account ID');
    }
  };

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Loading profile...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#ffffff' }}>
        Profile Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                Twitter Username
              </Typography>
              <Typography variant="h6">
                @{profile.xUsername}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                Account ID
              </Typography>
              <Typography variant="h6">
                {profile.xAccountId}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                Account Type
              </Typography>
              <Chip 
                label={profile.isAdmin ? 'Admin' : 'User'} 
                color={profile.isAdmin ? 'error' : 'default'}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                Subscription Status
              </Typography>
              <Chip 
                label={profile.subscriptionStatus} 
                color={profile.subscriptionStatus === 'active' ? 'success' : 'warning'}
              />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom>
              API Configuration
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                Using Own API Keys
              </Typography>
              <Chip 
                label={profile.hasOwnApiKeys ? 'Yes' : 'No'} 
                color={profile.hasOwnApiKeys ? 'success' : 'default'}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                API Key (Last 4 digits)
              </Typography>
              <Typography variant="body1">
                {maskKey(profile.xApiKeys.apiKey)}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8899a6' }}>
                Access Token (Last 4 digits)
              </Typography>
              <Typography variant="body1">
                {maskKey(profile.xApiKeys.accessToken)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                variant="outlined" 
                onClick={() => setShowApiDialog(true)}
                size="small"
              >
                Update API Keys
              </Button>
              <Button 
                variant="outlined" 
                onClick={fetchTwitterAccountId}
                size="small"
              >
                Fetch Account ID
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* API Keys Dialog */}
      <Dialog 
        open={showApiDialog} 
        onClose={() => setShowApiDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#111111', border: '1px solid #333' }
        }}
      >
        <DialogTitle>Update Twitter API Keys</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#8899a6' }}>
            Enter your Twitter API v2 credentials. These will be encrypted and stored securely.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="API Key"
                value={apiKeys.apiKey}
                onChange={(e) => setApiKeys({ ...apiKeys, apiKey: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="API Key Secret"
                type="password"
                value={apiKeys.apiKeySecret}
                onChange={(e) => setApiKeys({ ...apiKeys, apiKeySecret: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bearer Token"
                value={apiKeys.bearerToken}
                onChange={(e) => setApiKeys({ ...apiKeys, bearerToken: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Access Token"
                value={apiKeys.accessToken}
                onChange={(e) => setApiKeys({ ...apiKeys, accessToken: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Access Token Secret"
                type="password"
                value={apiKeys.accessTokenSecret}
                onChange={(e) => setApiKeys({ ...apiKeys, accessTokenSecret: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApiDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateApiKeys} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Keys'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
