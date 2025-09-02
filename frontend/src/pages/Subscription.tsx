import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert
} from '@mui/material';
import { Check } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';
import { toast } from 'react-toastify';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  interval: string;
  features: string[];
  recommended?: boolean;
}

interface PricingData {
  monthly: string;
  annual: string;
}

const Subscription = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch pricing and subscription status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Redirect to Twitter auth if no token
          window.location.href = '/api/twitter-auth/twitter';
          return;
        }

        const [pricingResponse, statusResponse] = await Promise.all([
          axios.get('/api/stripe/pricing', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/stripe/subscription-status', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setPricing(pricingResponse.data.pricing);
        setSubscriptionStatus(statusResponse.data);
      } catch (error: any) {
        console.error('Error fetching subscription data:', error);
        
        // If token is invalid, redirect to login
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/api/twitter-auth/twitter';
          return;
        }
        
        toast.error('Failed to load subscription information');
      } finally {
        setFetchingData(false);
      }
    };

    if (user) {
      fetchData();
    } else {
      // If no user in Redux state, check for token and redirect if needed
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/api/twitter-auth/twitter';
        return;
      }
    }
  }, [user]);

  // Get pricing plans based on fetched pricing data
  const getPricingPlans = (): PricingPlan[] => {
    if (!pricing) return [];

    if (user?.hasOwnApiKeys) {
      return [
        {
          id: pricing.monthly,
          name: 'Monthly (Own Keys)',
          price: '$20',
          interval: 'month',
          features: [
            'Use your own Twitter API keys',
            'Unlimited missions',
            'Advanced bot features',
            'AI content generation',
            'Analytics dashboard',
            'Priority support'
          ]
        },
        {
          id: pricing.annual,
          name: 'Annual (Own Keys)',
          price: '$225',
          interval: 'year',
          features: [
            'Use your own Twitter API keys',
            'Unlimited missions',
            'Advanced bot features',
            'AI content generation',
            'Analytics dashboard',
            'Priority support',
            'Save $15 per year'
          ],
          recommended: true
        }
      ];
    } else {
      return [
        {
          id: pricing.monthly,
          name: 'Monthly (Shared Keys)',
          price: '$100',
          interval: 'month',
          features: [
            'Use our Twitter API keys',
            'Limited concurrent missions',
            'Standard bot features',
            'AI content generation',
            'Analytics dashboard',
            'Email support'
          ]
        },
        {
          id: pricing.annual,
          name: 'Annual (Shared Keys)',
          price: '$1,000',
          interval: 'year',
          features: [
            'Use our Twitter API keys',
            'Limited concurrent missions',
            'Standard bot features',
            'AI content generation',
            'Analytics dashboard',
            'Email support',
            'Save $200 per year'
          ],
          recommended: true
        }
      ];
    }
  };

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/stripe/create-subscription', { priceId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.message || 'Failed to create subscription');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/stripe/cancel-subscription', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh subscription status
        const statusResponse = await axios.get('/api/stripe/subscription-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscriptionStatus(statusResponse.data);
      }
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  if (fetchingData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const pricingPlans = getPricingPlans();

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
        Choose Your Plan
      </Typography>
      
      {/* Current Subscription Status */}
      {subscriptionStatus?.subscription && (
        <Alert 
          severity={subscriptionStatus.status === 'active' ? 'success' : 'warning'}
          sx={{ mb: 3, backgroundColor: '#111111', border: '1px solid #333' }}
        >
          <Typography variant="body2" sx={{ color: '#ffffff' }}>
            Current subscription: {subscriptionStatus.status}
            {subscriptionStatus.subscription.cancel_at_period_end && 
              ' (will cancel at period end)'}
          </Typography>
          {subscriptionStatus.status === 'active' && !subscriptionStatus.subscription.cancel_at_period_end && (
            <Button 
              size="small" 
              onClick={handleCancelSubscription}
              sx={{ mt: 1, color: '#f44336' }}
            >
              Cancel Subscription
            </Button>
          )}
        </Alert>
      )}
      
      <Typography 
        variant="body1" 
        sx={{ 
          mb: { xs: 3, md: 4 }, 
          color: '#8899a6',
          textAlign: { xs: 'center', md: 'left' },
          fontSize: { xs: '0.9rem', md: '1rem' }
        }}
      >
        {user?.hasOwnApiKeys 
          ? 'Great! Since you have your own Twitter API keys, you get our discounted pricing.'
          : 'Our pricing includes access to Twitter API. Bring your own keys for discounted rates.'
        }
      </Typography>

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1 }}>
        {pricingPlans.map((plan) => (
          <Grid item xs={12} md={6} key={plan.id}>
            <Card 
              sx={{ 
                height: '100%',
                backgroundColor: '#111111', 
                border: plan.recommended ? '2px solid #1DA1F2' : '1px solid #333',
                position: 'relative',
                borderRadius: { xs: 2, md: 1 }
              }}
            >
              {plan.recommended && (
                <Chip
                  label="Recommended"
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    position: 'absolute',
                    top: { xs: 12, md: 16 },
                    right: { xs: 12, md: 16 }
                  }}
                />
              )}
              
              <CardContent sx={{ pb: 1, px: { xs: 2, md: 3 } }}>
                <Typography 
                  variant={isMobile ? "h6" : "h5"} 
                  component="h2" 
                  gutterBottom
                  sx={{ 
                    color: '#ffffff',
                    fontSize: { xs: '1.1rem', md: '1.5rem' }
                  }}
                >
                  {plan.name}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant={isMobile ? "h4" : "h3"} 
                    component="span" 
                    sx={{ 
                      color: '#1DA1F2',
                      fontSize: { xs: '1.8rem', md: '3rem' }
                    }}
                  >
                    {plan.price}
                  </Typography>
                  <Typography 
                    variant={isMobile ? "body1" : "h6"} 
                    component="span" 
                    sx={{ 
                      color: '#8899a6',
                      fontSize: { xs: '0.9rem', md: '1.25rem' }
                    }}
                  >
                    /{plan.interval}
                  </Typography>
                </Box>
                
                <List sx={{ py: 0 }}>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} sx={{ py: { xs: 0.25, md: 0.5 }, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: { xs: 28, md: 36 } }}>
                        <Check sx={{ 
                          color: '#1DA1F2', 
                          fontSize: { xs: 16, md: 20 } 
                        }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature}
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontSize: { xs: '0.8rem', md: '0.9rem' },
                            color: '#ffffff'
                          } 
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              
              <CardActions sx={{ p: { xs: 2, md: 2 }, pt: 0 }}>
                <Button
                  fullWidth
                  variant={plan.recommended ? 'contained' : 'outlined'}
                  size={isMobile ? "medium" : "large"}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id || subscriptionStatus?.status === 'active'}
                  sx={{
                    backgroundColor: plan.recommended ? '#1DA1F2' : 'transparent',
                    color: plan.recommended ? '#ffffff' : '#1DA1F2',
                    borderColor: '#1DA1F2',
                    py: { xs: 1, md: 1.5 },
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    '&:hover': {
                      backgroundColor: plan.recommended ? '#1991db' : 'rgba(29, 161, 242, 0.1)'
                    },
                    '&:disabled': {
                      backgroundColor: '#333',
                      color: '#666'
                    }
                  }}
                >
                  {loading === plan.id ? 'Processing...' : 
                   subscriptionStatus?.status === 'active' ? 'Active' : 'Subscribe'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Paper sx={{ 
        p: { xs: 2, md: 3 }, 
        mt: { xs: 3, md: 4 }, 
        backgroundColor: '#111111', 
        border: '1px solid #333',
        borderRadius: { xs: 2, md: 1 }
      }}>
        <Typography 
          variant={isMobile ? "subtitle1" : "h6"} 
          gutterBottom
          sx={{ color: '#ffffff' }}
        >
          Why the different pricing?
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#8899a6',
            fontSize: { xs: '0.8rem', md: '0.875rem' },
            lineHeight: { xs: 1.4, md: 1.6 }
          }}
        >
          Twitter API access costs $200/month. When you use our shared API keys, we cover this cost 
          and charge $100/month. If you bring your own API keys, you only pay $20/month for our 
          platform and bot features. This saves you money and gives you more control over your API usage.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Subscription;
