import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userRole?: string;
    }
  }
}

// Verify user authentication
export const verifyAuth = async (authHeader: string) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  return user;
};

// Check if user is admin
export const isAdmin = async (userId: string) => {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', userId)
    .single();
    
  return data?.role === 'admin';
};

// General authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // FOR DEVELOPMENT: Skip auth if no header provided but log it
    if (!authHeader) {
      console.log('⚠️ No auth header provided - allowing for development');
      next();
      return;
    }
    
    const user = await verifyAuth(authHeader);
    req.user = user;
    next();
  } catch (error) {
    console.log('🔐 Auth middleware error:', error instanceof Error ? error.message : 'Unknown error');
    
    // FOR DEVELOPMENT: Allow requests without proper auth but log them
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Development mode - allowing unauthenticated request');
      next();
      return;
    }
    
    res.status(401).json({
      status: 'error',
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
};

// Admin-only middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // FOR DEVELOPMENT: Skip admin check but log it
    if (process.env.NODE_ENV === 'development') {
      console.log('👑 Development mode - skipping admin check');
      req.userRole = 'admin';
      next();
      return;
    }
    
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        error: 'Authentication required'
      });
    }

    const adminCheck = await isAdmin(req.user.id);
    if (!adminCheck) {
      return res.status(403).json({
        status: 'error',
        error: 'Admin access required'
      });
    }

    req.userRole = 'admin';
    next();
  } catch (error) {
    res.status(403).json({
      status: 'error',
      error: 'Access denied',
      message: error instanceof Error ? error.message : 'Authorization failed'
    });
  }
};

// Optional authentication (for public endpoints that benefit from auth)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const user = await verifyAuth(authHeader);
      req.user = user;
    }
    next();
  } catch (error) {
    // Continue without authentication
    console.log('🔓 Optional auth failed, continuing without auth');
    next();
  }
};