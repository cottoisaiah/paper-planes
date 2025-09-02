import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { logout } from '../store/authSlice';
import paperPlaneLogo from '/paper-plane.svg';

const Navigation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setMobileMenuAnchor(null);
  };

  const menuItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'AI Content', path: '/content-generation' },
    { label: 'Missions', path: '/missions' },
    { label: 'Posts', path: '/posts' },
    { label: 'Context', path: '/context' },
    { label: 'Profile', path: '/profile' },
    { label: 'Subscription', path: '/subscription' },
    ...(user?.isAdmin ? [{ label: 'Admin', path: '/admin' }] : []),
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
    setMobileMenuAnchor(null);
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#000000', borderBottom: '1px solid #333' }}>
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 3 } }}>
        {/* Logo and Title */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexGrow: 1,
            cursor: 'pointer'
          }}
          onClick={() => navigate('/')}
        >
          <img 
            src={paperPlaneLogo} 
            alt="Paper Planes Logo" 
            style={{ 
              width: isMobile ? 24 : 32, 
              height: isMobile ? 24 : 32, 
              marginRight: isMobile ? 8 : 12 
            }} 
          />
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            component="div" 
            sx={{ 
              color: '#ffffff', 
              fontWeight: 'bold',
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}
          >
            Paper Planes
          </Typography>
        </Box>
        
        {isAuthenticated && (
          <>
            {/* Desktop Menu */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {menuItems.map((item) => (
                  <Button 
                    key={item.path}
                    color="inherit" 
                    onClick={() => navigate(item.path)} 
                    sx={{ 
                      color: '#ffffff',
                      minWidth: 'auto',
                      px: 2,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
                <Button 
                  color="inherit" 
                  onClick={handleLogout} 
                  sx={{ 
                    color: '#ffffff',
                    minWidth: 'auto',
                    px: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Logout
                </Button>
              </Box>
            )}

            {/* Mobile Menu */}
            {isMobile && (
              <>
                <IconButton
                  color="inherit"
                  aria-label="menu"
                  onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
                  sx={{ color: '#ffffff' }}
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={mobileMenuAnchor}
                  open={Boolean(mobileMenuAnchor)}
                  onClose={() => setMobileMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      backgroundColor: '#111111',
                      border: '1px solid #333',
                      '& .MuiMenuItem-root': {
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }
                    }
                  }}
                >
                  {menuItems.map((item) => (
                    <MenuItem 
                      key={item.path}
                      onClick={() => handleMenuClick(item.path)}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                  <MenuItem onClick={handleLogout}>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )}
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
