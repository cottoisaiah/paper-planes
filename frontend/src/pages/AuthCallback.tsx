import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/authSlice';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import api from '../utils/api';
import { toast } from 'react-toastify';

const AuthCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      // OAuth 1.0a parameters
      const oauth_token = searchParams.get('oauth_token');
      const oauth_verifier = searchParams.get('oauth_verifier');

      if (!oauth_token || !oauth_verifier) {
        toast.error('Authorization failed - missing parameters');
        navigate('/login');
        return;
      }

      try {
        const response = await api.post('/twitter-auth/twitter/callback', {
          oauth_token,
          oauth_verifier
        });

        // Store token and user data in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        dispatch(loginSuccess({
          token: response.data.token,
          user: response.data.user
        }));

        toast.success(`Welcome back, ${response.data.user.xUsername}!`);
        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Login failed - please try again');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, dispatch, navigate]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Box textAlign="center">
        <CircularProgress sx={{ color: '#1DA1F2', mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#ffffff' }}>
          Completing Twitter authentication...
        </Typography>
        <Typography variant="body2" sx={{ color: '#8899a6', mt: 1 }}>
          Please wait while we verify your credentials
        </Typography>
      </Box>
    </Container>
  );
};

export default AuthCallback;
