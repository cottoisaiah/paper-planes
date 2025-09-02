import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess } from './store/authSlice';
import { RootState } from './store/store';
import 'react-toastify/dist/ReactToastify.css';

import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Missions from './pages/Missions';
import Posts from './pages/Posts';
import Context from './pages/Context';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import AuthCallback from './pages/AuthCallback';
import Analytics from './pages/Analytics';
import ContentGeneration from './pages/ContentGeneration';

// Dark theme matching X/Twitter
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DA1F2',
    },
    background: {
      default: '#000000',
      paper: '#111111',
    },
    text: {
      primary: '#ffffff',
      secondary: '#8899a6',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
        },
      },
    },
  },
});

const AppContent = () => {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Don't show navigation on login page or auth callback
  const hideNavigation = location.pathname === '/login' || location.pathname === '/auth/callback';

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
      {isAuthenticated && !hideNavigation && <Navigation />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="/missions" element={
          <ProtectedRoute>
            <Missions />
          </ProtectedRoute>
        } />
        <Route path="/posts" element={
          <ProtectedRoute>
            <Posts />
          </ProtectedRoute>
        } />
        <Route path="/context" element={
          <ProtectedRoute>
            <Context />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/subscription" element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/content-generation" element={
          <ProtectedRoute>
            <ContentGeneration />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
};

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for existing auth token on app startup
    const token = localStorage.getItem('token');
    if (token) {
      // For now, just set the token. In a real app, you'd verify it with the server
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          dispatch(loginSuccess({ token, user }));
        } catch (error) {
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
  }, [dispatch]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <AppContent />
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;
