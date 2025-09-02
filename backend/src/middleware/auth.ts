import jwt from 'jsonwebtoken';
import User from '../models/User';

export const authenticate = async (req: any, res: any, next: any) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    console.log('Token decoded successfully:', { id: decoded.id });
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('Authentication failed: User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('Authentication successful for user:', user.xUsername);
    req.user = user;
    next();
  } catch (error: any) {
    console.log('Authentication failed: Token verification error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuthenticate = async (req: any, res: any, next: any) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }
  
  next();
};

export const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const requireActiveSubscription = async (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.isAdmin) {
    return next(); // Admins bypass subscription check
  }
  
  if (req.user.subscriptionStatus !== 'active') {
    return res.status(403).json({ message: 'Active subscription required' });
  }
  
  next();
};
