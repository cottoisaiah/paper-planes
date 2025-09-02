import { Container, Typography, Grid, Paper, Box, useTheme, useMediaQuery, Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Analytics, Psychology, TrendingUp, AutoAwesome, PostAdd, People } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface EngagementSummary {
  totalFollowers: number;
  followerGrowth30d: number;
  followerGrowth7d: number;
  totalEngagement30d: number;
  avgEngagementRate: number;
  totalPosts30d: number;
  avgPostsPerDay: number;
}

interface SocialMetrics {
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  lastUpdated: string;
}

const Dashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetrics | null>(null);
  const [, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const [summaryResponse, metricsResponse] = await Promise.all([
        axios.get('/api/analytics/summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/analytics/social-metrics', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setSummary(summaryResponse.data.data);
      setSocialMetrics(metricsResponse.data.data?.metrics);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSummary();
    }
  }, [user]);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, px: { xs: 1, md: 3 } }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom sx={{ color: '#ffffff' }}>
          Please log in to access the dashboard
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, px: { xs: 1, md: 3 } }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        component="h1" 
        gutterBottom 
        sx={{ 
          color: '#ffffff',
          textAlign: { xs: 'center', md: 'left' },
          mb: { xs: 2, md: 3 }
        }}
      >
        Welcome back, @{user.xUsername || user.email}
      </Typography>
      
      {/* Quick Stats */}
      {summary && (
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: { xs: 2, md: 3 }, 
              backgroundColor: '#111111', 
              border: '1px solid #333',
              borderRadius: { xs: 2, md: 1 },
              textAlign: 'center'
            }}>
              <People sx={{ color: '#1DA1F2', fontSize: { xs: 24, md: 32 }, mb: 1 }} />
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ color: '#ffffff', fontWeight: 'bold' }}
              >
                {socialMetrics?.followersCount?.toLocaleString() || summary?.totalFollowers?.toLocaleString() || 'N/A'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8899a6' }}>
                Followers
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: (summary?.followerGrowth7d || 0) >= 0 ? '#4CAF50' : '#f44336',
                  display: 'block'
                }}
              >
                {summary.followerGrowth7d >= 0 ? '+' : ''}{summary.followerGrowth7d} (7d)
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: { xs: 2, md: 3 }, 
              backgroundColor: '#111111', 
              border: '1px solid #333',
              borderRadius: { xs: 2, md: 1 },
              textAlign: 'center'
            }}>
              <TrendingUp sx={{ color: '#4CAF50', fontSize: { xs: 24, md: 32 }, mb: 1 }} />
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ color: '#ffffff', fontWeight: 'bold' }}
              >
                {summary.totalEngagement30d.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8899a6' }}>
                30d Engagement
              </Typography>
              <Typography variant="caption" sx={{ color: '#4CAF50', display: 'block' }}>
                {summary.avgEngagementRate}% rate
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: { xs: 2, md: 3 }, 
              backgroundColor: '#111111', 
              border: '1px solid #333',
              borderRadius: { xs: 2, md: 1 },
              textAlign: 'center'
            }}>
              <PostAdd sx={{ color: '#FF6B35', fontSize: { xs: 24, md: 32 }, mb: 1 }} />
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ color: '#ffffff', fontWeight: 'bold' }}
              >
                {summary.totalPosts30d}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8899a6' }}>
                Posts (30d)
              </Typography>
              <Typography variant="caption" sx={{ color: '#FF6B35', display: 'block' }}>
                {summary.avgPostsPerDay}/day
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: { xs: 2, md: 3 }, 
              backgroundColor: '#111111', 
              border: '1px solid #333',
              borderRadius: { xs: 2, md: 1 },
              textAlign: 'center'
            }}>
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                gutterBottom
                sx={{ color: '#ffffff' }}
              >
                Subscription
              </Typography>
              <Typography 
                variant={isMobile ? "body1" : "h6"} 
                sx={{ 
                  color: user.isAdmin ? '#4CAF50' : '#FFC107',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  fontWeight: 'bold'
                }}
              >
                {user.isAdmin ? 'Admin' : user.subscriptionStatus || 'Inactive'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Quick Actions */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ 
            p: { xs: 2, md: 3 }, 
            backgroundColor: '#111111', 
            border: '1px solid #333',
            borderRadius: { xs: 2, md: 1 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Analytics sx={{ color: '#1DA1F2', fontSize: 32, mr: 2 }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>
                  Analytics Dashboard
                </Typography>
                <Typography variant="body2" sx={{ color: '#8899a6' }}>
                  View detailed engagement metrics and trends
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/analytics')}
              sx={{ 
                backgroundColor: '#1DA1F2',
                '&:hover': { backgroundColor: '#1991DB' }
              }}
            >
              View Analytics
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Paper sx={{ 
            p: { xs: 2, md: 3 }, 
            backgroundColor: '#111111', 
            border: '1px solid #333',
            borderRadius: { xs: 2, md: 1 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Psychology sx={{ color: '#9C27B0', fontSize: 32, mr: 2 }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>
                  AI Content Generation
                </Typography>
                <Typography variant="body2" sx={{ color: '#8899a6' }}>
                  Generate tweets with Grok-4 AI
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/content-generation')}
              sx={{ 
                backgroundColor: '#9C27B0',
                '&:hover': { backgroundColor: '#7B1FA2' }
              }}
            >
              Generate Content
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Traditional Dashboard Cards */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ 
            p: { xs: 2, md: 3 }, 
            backgroundColor: '#111111', 
            border: '1px solid #333',
            borderRadius: { xs: 2, md: 1 },
            textAlign: 'center'
          }}>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              gutterBottom
              sx={{ color: '#ffffff' }}
            >
              Active Missions
            </Typography>
            <Typography 
              variant={isMobile ? "h4" : "h3"} 
              sx={{ 
                color: '#1DA1F2',
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              0
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ 
            p: { xs: 2, md: 3 }, 
            backgroundColor: '#111111', 
            border: '1px solid #333',
            borderRadius: { xs: 2, md: 1 },
            textAlign: 'center'
          }}>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              gutterBottom
              sx={{ color: '#ffffff' }}
            >
              Posts Generated
            </Typography>
            <Typography 
              variant={isMobile ? "h4" : "h3"} 
              sx={{ 
                color: '#1DA1F2',
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              {summary ? summary.totalPosts30d : 0}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ 
            p: { xs: 2, md: 3 }, 
            backgroundColor: '#111111', 
            border: '1px solid #333',
            borderRadius: { xs: 2, md: 1 },
            textAlign: 'center'
          }}>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              gutterBottom
              sx={{ color: '#ffffff' }}
            >
              AI Generations
            </Typography>
            <Typography 
              variant={isMobile ? "h4" : "h3"} 
              sx={{ 
                color: '#9C27B0',
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              <AutoAwesome sx={{ fontSize: 'inherit', mr: 1 }} />
              {summary ? Math.ceil(summary.totalPosts30d * 0.8) : 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: { xs: 3, md: 4 } }}>
        <Paper sx={{ 
          p: { xs: 2, md: 3 }, 
          backgroundColor: '#111111', 
          border: '1px solid #333',
          borderRadius: { xs: 2, md: 1 }
        }}>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            gutterBottom
            sx={{ color: '#ffffff' }}
          >
            Getting Started
          </Typography>
          <Typography 
            sx={{ 
              color: '#8899a6',
              fontSize: { xs: '0.9rem', md: '1rem' },
              mb: 2
            }}
          >
            Start leveraging AI-powered analytics and content generation for your Twitter automation.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Analytics />}
                onClick={() => navigate('/analytics')}
                sx={{
                  borderColor: '#1DA1F2',
                  color: '#1DA1F2',
                  '&:hover': { backgroundColor: '#1DA1F210' }
                }}
              >
                View Analytics
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Psychology />}
                onClick={() => navigate('/content-generation')}
                sx={{
                  borderColor: '#9C27B0',
                  color: '#9C27B0',
                  '&:hover': { backgroundColor: '#9C27B010' }
                }}
              >
                Generate Content
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard;
