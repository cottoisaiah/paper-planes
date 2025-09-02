import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  TrendingUp,
  People,
  PostAdd,
  Analytics as AnalyticsIcon,
  Refresh,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import FollowersComponent from '../components/FollowersComponent';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  date: string;
  metrics: {
    followers: number;
    following: number;
    tweets: number;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  };
  dailyPosts: number;
  totalEngagement: number;
  engagementRate: number;
  followerGrowth: number;
  unfollows: number;
}

interface EngagementSummary {
  totalFollowers: number;
  followerGrowth30d: number;
  followerGrowth7d: number;
  totalEngagement30d: number;
  avgEngagementRate: number;
  totalPosts30d: number;
  avgPostsPerDay: number;
}

const Analytics = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeRange, setTimeRange] = useState(30);
  const [showFollowers, setShowFollowers] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [dataResponse, summaryResponse] = await Promise.all([
        axios.get(`/api/analytics/data/${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/analytics/summary', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setAnalyticsData(dataResponse.data.data || []);
      setSummary(summaryResponse.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const collectAnalytics = async () => {
    try {
      setCollecting(true);
      const token = localStorage.getItem('token');
      
      await axios.post('/api/analytics/collect', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh data after collection
      await fetchAnalyticsData();
    } catch (error) {
      console.error('Error collecting analytics:', error);
    } finally {
      setCollecting(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, timeRange]);

  const createChartData = (label: string, dataKey: keyof AnalyticsData['metrics'] | 'dailyPosts' | 'totalEngagement' | 'followerGrowth', color: string) => {
    const data = analyticsData.map(item => {
      if (dataKey === 'dailyPosts' || dataKey === 'totalEngagement' || dataKey === 'followerGrowth') {
        return item[dataKey];
      }
      return item.metrics[dataKey as keyof AnalyticsData['metrics']];
    });

    return {
      labels: analyticsData.map(item => new Date(item.date).toLocaleDateString()),
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: `${color}20`,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: color,
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: color,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ffffff',
          font: {
            size: isMobile ? 11 : 14,
          },
          usePointStyle: true,
          padding: isMobile ? 15 : 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#333333',
        borderWidth: 1,
        titleFont: {
          size: isMobile ? 12 : 14,
        },
        bodyFont: {
          size: isMobile ? 11 : 13,
        },
        padding: isMobile ? 8 : 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#8899a6',
          font: {
            size: isMobile ? 9 : 12,
          },
          maxTicksLimit: isMobile ? 6 : 10,
        },
        grid: {
          color: 'rgba(136, 153, 166, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#8899a6',
          font: {
            size: isMobile ? 9 : 12,
          },
          maxTicksLimit: isMobile ? 5 : 8,
        },
        grid: {
          color: 'rgba(136, 153, 166, 0.1)',
        },
      },
    },
    elements: {
      point: {
        radius: isMobile ? 2 : 4,
        hoverRadius: isMobile ? 4 : 6,
      },
      line: {
        tension: 0.4,
      },
    },
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" sx={{ color: '#ffffff' }}>
          Please log in to view analytics
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, px: { xs: 1, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          sx={{ 
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
          }}
        >
          <AnalyticsIcon />
          Analytics Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Collect Latest Data">
            <IconButton 
              onClick={collectAnalytics}
              disabled={collecting}
              sx={{ color: '#1DA1F2' }}
            >
              {collecting ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
          
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? 'contained' : 'outlined'}
              size={isMobile ? "small" : "medium"}
              onClick={() => setTimeRange(days)}
              sx={{
                borderColor: '#1DA1F2',
                color: timeRange === days ? '#ffffff' : '#1DA1F2',
                backgroundColor: timeRange === days ? '#1DA1F2' : 'transparent',
                fontSize: isSmall ? '0.7rem' : '0.8rem',
                minWidth: isSmall ? '35px' : '50px',
                px: isSmall ? 1 : 2
              }}
            >
              {days}d
            </Button>
          ))}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 4 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #333',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, md: 2 } }}>
                    <People sx={{ color: '#1DA1F2', fontSize: { xs: 20, sm: 24, md: 32 }, mb: 1 }} />
                    <Typography variant={isSmall ? "h6" : isMobile ? "h5" : "h4"} sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {summary.totalFollowers.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8899a6', display: 'block' }}>
                      Total Followers
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: summary.followerGrowth7d >= 0 ? '#4CAF50' : '#f44336',
                        display: 'block',
                        fontWeight: 'bold'
                      }}
                    >
                      {summary.followerGrowth7d >= 0 ? '+' : ''}{summary.followerGrowth7d} (7d)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #333',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, md: 2 } }}>
                    <TrendingUp sx={{ color: '#4CAF50', fontSize: { xs: 20, sm: 24, md: 32 }, mb: 1 }} />
                    <Typography variant={isSmall ? "h6" : isMobile ? "h5" : "h4"} sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {summary.totalEngagement30d.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8899a6', display: 'block' }}>
                      30d Engagement
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#4CAF50', display: 'block', fontWeight: 'bold' }}>
                      {summary.avgEngagementRate}% avg rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #333',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, md: 2 } }}>
                    <PostAdd sx={{ color: '#FF6B35', fontSize: { xs: 20, sm: 24, md: 32 }, mb: 1 }} />
                    <Typography variant={isSmall ? "h6" : isMobile ? "h5" : "h4"} sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {summary.totalPosts30d}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8899a6', display: 'block' }}>
                      Posts (30d)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#FF6B35', display: 'block', fontWeight: 'bold' }}>
                      {summary.avgPostsPerDay}/day avg
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #333',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}>
                  <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, md: 2 } }}>
                    <AnalyticsIcon sx={{ color: '#9C27B0', fontSize: { xs: 20, sm: 24, md: 32 }, mb: 1 }} />
                    <Typography variant={isSmall ? "h6" : isMobile ? "h5" : "h4"} sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {summary.followerGrowth30d >= 0 ? '+' : ''}{summary.followerGrowth30d}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8899a6', display: 'block' }}>
                      Growth (30d)
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: summary.followerGrowth30d >= 0 ? '#4CAF50' : '#f44336',
                        display: 'block',
                        fontWeight: 'bold'
                      }}
                    >
                      {((summary.followerGrowth30d / summary.totalFollowers) * 100).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Followers Section */}
          <Paper sx={{ 
            backgroundColor: '#111111', 
            border: '1px solid #333', 
            mb: 3,
            overflow: 'hidden'
          }}>
            <Box 
              sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: showFollowers ? '1px solid #333' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setShowFollowers(!showFollowers)}
            >
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ 
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <People />
                Your Followers
              </Typography>
              
              <IconButton sx={{ color: '#1DA1F2' }}>
                {showFollowers ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={showFollowers}>
              <Box sx={{ p: { xs: 1, md: 2 } }}>
                <FollowersComponent />
              </Box>
            </Collapse>
          </Paper>

          {/* Chart Tabs */}
          <Paper sx={{ backgroundColor: '#111111', border: '1px solid #333', mb: 3 }}>
            <Tabs
              value={selectedTab}
              onChange={(_, newValue) => setSelectedTab(newValue)}
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons="auto"
              sx={{
                borderBottom: '1px solid #333',
                '& .MuiTab-root': {
                  color: '#8899a6',
                  fontSize: isSmall ? '0.7rem' : isMobile ? '0.8rem' : '1rem',
                  minWidth: isSmall ? 80 : isMobile ? 100 : 160,
                  minHeight: isMobile ? 40 : 48,
                },
                '& .Mui-selected': {
                  color: '#1DA1F2 !important',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1DA1F2',
                },
              }}
            >
              <Tab label="Engagement" />
              <Tab label="Followers" />
              <Tab label="Posts" />
              <Tab label="Growth" />
            </Tabs>

            <Box sx={{ p: 2, height: isMobile ? 250 : 400 }}>
              {analyticsData.length > 0 ? (
                <>
                  {selectedTab === 0 && (
                    <Line 
                      data={createChartData('Total Engagement', 'totalEngagement', '#4CAF50')} 
                      options={chartOptions} 
                    />
                  )}
                  {selectedTab === 1 && (
                    <Line 
                      data={createChartData('Followers', 'followers', '#1DA1F2')} 
                      options={chartOptions} 
                    />
                  )}
                  {selectedTab === 2 && (
                    <Line 
                      data={createChartData('Daily Posts', 'dailyPosts', '#FF6B35')} 
                      options={chartOptions} 
                    />
                  )}
                  {selectedTab === 3 && (
                    <Line 
                      data={createChartData('Follower Growth', 'followerGrowth', '#9C27B0')} 
                      options={chartOptions} 
                    />
                  )}
                </>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <AnalyticsIcon sx={{ fontSize: { xs: 48, md: 64 }, color: '#333', mb: 2 }} />
                  <Typography variant={isMobile ? "body1" : "h6"} sx={{ color: '#8899a6', mb: 1, textAlign: 'center' }}>
                    No Analytics Data Yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', mb: 2, px: 2 }}>
                    Click the refresh button to collect your first analytics snapshot
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={collectAnalytics}
                    disabled={collecting}
                    size={isMobile ? "small" : "medium"}
                    sx={{ backgroundColor: '#1DA1F2' }}
                  >
                    {collecting ? 'Collecting...' : 'Collect Analytics'}
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default Analytics;
