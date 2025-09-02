import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware to ensure user has an active subscription
 */
export const requireActiveSubscription = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Admins bypass subscription check
    if (user.isAdmin) {
      return next();
    }

    // Check if user has active subscription
    if (user.subscriptionStatus !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Active subscription required to access this feature. Please upgrade your plan.',
        requiresSubscription: true
      });
    }

    next();
  } catch (error: any) {
    logger.error('Error in subscription middleware:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Middleware to ensure user is an admin
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    next();
  } catch (error: any) {
    logger.error('Error in admin middleware:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};
