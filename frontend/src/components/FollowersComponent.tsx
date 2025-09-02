import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Avatar,
  Card,
  CardContent,
  IconButton,
  Chip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Tooltip,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Verified,
  LocationOn,
  Person,
  Search,
  Refresh,
  FilterList
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';

interface Follower {
  id: string;
  username: string;
  name: string;
  description: string;
  location: string;
  verified: boolean;
  profileImageUrl: string;
  publicMetrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  createdAt: string;
}

const FollowersComponent = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'followers' | 'recent' | 'name'>('followers');
  const [showVerified, setShowVerified] = useState(false);

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/followers/100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFollowers();
    }
  }, [user]);

  const filteredAndSortedFollowers = React.useMemo(() => {
    let filtered = followers.filter(follower => {
      const matchesSearch = follower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           follower.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVerified = !showVerified || follower.verified;
      return matchesSearch && matchesVerified;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'followers':
          return (b.publicMetrics?.followers_count || 0) - (a.publicMetrics?.followers_count || 0);
        case 'recent':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [followers, searchTerm, sortBy, showVerified]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" sx={{ color: '#ffffff' }}>
          Please log in to view followers
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        mb: 3,
        gap: 2
      }}>
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          sx={{ 
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Person />
          Followers ({followers.length})
        </Typography>
        
        <Tooltip title="Refresh followers list">
          <IconButton 
            onClick={fetchFollowers}
            disabled={loading}
            sx={{ 
              color: '#1DA1F2',
              alignSelf: isMobile ? 'flex-end' : 'center'
            }}
          >
            {loading ? <CircularProgress size={24} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Paper sx={{ 
        p: 2, 
        mb: 3, 
        backgroundColor: '#111111', 
        border: '1px solid #333' 
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              placeholder="Search followers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#8899a6' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#1DA1F2' },
                  '&.Mui-focused fieldset': { borderColor: '#1DA1F2' },
                },
              }}
            />
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Button
              variant={sortBy === 'followers' ? 'contained' : 'outlined'}
              size={isMobile ? "small" : "medium"}
              fullWidth
              onClick={() => setSortBy('followers')}
              sx={{
                borderColor: '#1DA1F2',
                color: sortBy === 'followers' ? '#ffffff' : '#1DA1F2',
                backgroundColor: sortBy === 'followers' ? '#1DA1F2' : 'transparent',
                fontSize: isSmall ? '0.7rem' : '0.8rem',
              }}
            >
              Top
            </Button>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Button
              variant={sortBy === 'recent' ? 'contained' : 'outlined'}
              size={isMobile ? "small" : "medium"}
              fullWidth
              onClick={() => setSortBy('recent')}
              sx={{
                borderColor: '#1DA1F2',
                color: sortBy === 'recent' ? '#ffffff' : '#1DA1F2',
                backgroundColor: sortBy === 'recent' ? '#1DA1F2' : 'transparent',
                fontSize: isSmall ? '0.7rem' : '0.8rem',
              }}
            >
              Recent
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterList sx={{ color: '#8899a6', fontSize: 20 }} />
              <Chip
                label="Verified Only"
                variant={showVerified ? 'filled' : 'outlined'}
                onClick={() => setShowVerified(!showVerified)}
                icon={<Verified />}
                size={isMobile ? "small" : "medium"}
                sx={{
                  borderColor: '#1DA1F2',
                  color: showVerified ? '#ffffff' : '#1DA1F2',
                  backgroundColor: showVerified ? '#1DA1F2' : 'transparent',
                  '& .MuiChip-icon': {
                    color: showVerified ? '#ffffff' : '#1DA1F2'
                  }
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Followers Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={isMobile ? 1.5 : 2}>
          {filteredAndSortedFollowers.map((follower) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={follower.id}>
              <Card sx={{ 
                backgroundColor: '#111111', 
                border: '1px solid #333',
                height: '100%',
                transition: 'transform 0.2s, border-color 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: '#1DA1F2'
                }
              }}>
                <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                  {/* Profile Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                    <Avatar
                      src={follower.profileImageUrl}
                      alt={follower.name}
                      sx={{ 
                        width: isMobile ? 40 : 48, 
                        height: isMobile ? 40 : 48, 
                        mr: 1.5,
                        border: '2px solid #333'
                      }}
                    >
                      {follower.name.charAt(0).toUpperCase()}
                    </Avatar>
                    
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography 
                          variant={isMobile ? "subtitle2" : "subtitle1"}
                          sx={{ 
                            color: '#ffffff', 
                            fontWeight: 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flexGrow: 1
                          }}
                        >
                          {follower.name}
                        </Typography>
                        {follower.verified && (
                          <Verified sx={{ color: '#1DA1F2', fontSize: 16 }} />
                        )}
                      </Box>
                      
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#8899a6',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        @{follower.username}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  {follower.description && (
                    <Typography 
                      variant={isMobile ? "caption" : "body2"}
                      sx={{ 
                        color: '#ffffff', 
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.3,
                        minHeight: isMobile ? '26px' : '32px'
                      }}
                    >
                      {follower.description}
                    </Typography>
                  )}

                  {/* Location */}
                  {follower.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <LocationOn sx={{ color: '#8899a6', fontSize: 16, mr: 0.5 }} />
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#8899a6',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {follower.location}
                      </Typography>
                    </Box>
                  )}

                  {/* Metrics */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography 
                        variant={isMobile ? "caption" : "body2"}
                        sx={{ color: '#ffffff', fontWeight: 'bold', display: 'block' }}
                      >
                        {formatNumber(follower.publicMetrics?.followers_count || 0)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8899a6' }}>
                        Followers
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography 
                        variant={isMobile ? "caption" : "body2"}
                        sx={{ color: '#ffffff', fontWeight: 'bold', display: 'block' }}
                      >
                        {formatNumber(follower.publicMetrics?.following_count || 0)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8899a6' }}>
                        Following
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography 
                        variant={isMobile ? "caption" : "body2"}
                        sx={{ color: '#ffffff', fontWeight: 'bold', display: 'block' }}
                      >
                        {formatNumber(follower.publicMetrics?.tweet_count || 0)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8899a6' }}>
                        Tweets
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {filteredAndSortedFollowers.length === 0 && !loading && (
        <Paper sx={{ 
          p: 4, 
          textAlign: 'center', 
          backgroundColor: '#111111', 
          border: '1px solid #333' 
        }}>
          <Person sx={{ fontSize: 64, color: '#333', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#8899a6', mb: 1 }}>
            {searchTerm || showVerified ? 'No followers match your filters' : 'No followers found'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {searchTerm || showVerified ? 'Try adjusting your search or filter criteria' : 'Your followers will appear here once loaded'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default FollowersComponent;
