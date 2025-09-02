import { Container, Paper, Typography, Button, Box, useTheme, useMediaQuery } from '@mui/material';
import { Twitter } from '@mui/icons-material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import api from '../utils/api';
import { toast } from 'react-toastify';
import paperPlaneLogo from '/paper-plane.svg';

const Login = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleTwitterLogin = async () => {
    try {
      const response = await api.get('/twitter-auth/twitter');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Twitter login error:', error);
      toast.error('Failed to initialize Twitter login');
    }
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        background: `
          linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)),
          url('/paper-plane-background.svg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: 1, md: 3 }
      }}
    >
      <Container 
        maxWidth="sm" 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}
      >
        <Paper 
          elevation={24} 
          sx={{ 
            p: { xs: 4, md: 6 }, 
            backgroundColor: 'rgba(17, 17, 17, 0.95)', 
            border: '1px solid #333',
            borderRadius: { xs: 3, md: 2 },
            backdropFilter: 'blur(10px)',
            width: '100%',
            maxWidth: 400
          }}
        >
          <Box textAlign="center">
            {/* Logo */}
            <Box sx={{ mb: { xs: 3, md: 4 } }}>
              <img 
                src={paperPlaneLogo} 
                alt="Paper Planes Logo" 
                style={{ 
                  width: isMobile ? 64 : 80, 
                  height: isMobile ? 64 : 80,
                  filter: 'brightness(1.1)'
                }} 
              />
            </Box>
            
            <Typography 
              variant={isMobile ? "h4" : "h3"} 
              component="h1" 
              gutterBottom 
              sx={{ 
                color: '#ffffff',
                fontWeight: 'bold',
                mb: { xs: 2, md: 3 },
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Paper Planes
            </Typography>
            
            <Typography 
              variant="h6" 
              sx={{ 
                mb: { xs: 4, md: 5 }, 
                color: '#b0b0b0',
                fontSize: { xs: '1rem', md: '1.25rem' },
                lineHeight: { xs: 1.4, md: 1.6 },
                fontWeight: 300
              }}
            >
              Your automated Twitter engagement platform
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<Twitter sx={{ fontSize: { xs: 24, md: 28 } }} />}
              onClick={handleTwitterLogin}
              fullWidth
              sx={{
                backgroundColor: '#1DA1F2',
                '&:hover': { 
                  backgroundColor: '#1991db',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(29, 161, 242, 0.3)'
                },
                py: { xs: 1.5, md: 2 },
                px: { xs: 3, md: 4 },
                fontSize: { xs: '1.1rem', md: '1.2rem' },
                fontWeight: 'bold',
                color: '#ffffff',
                borderRadius: { xs: 2, md: 1.5 },
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(29, 161, 242, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              Sign in with Twitter
            </Button>

            <Typography 
              variant="caption" 
              sx={{ 
                mt: 3,
                color: '#666',
                fontSize: { xs: '0.75rem', md: '0.8rem' },
                display: 'block'
              }}
            >
              Secure authentication via Twitter OAuth
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
