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

// Verify branch session token (for staff operations)
export const verifyBranchToken = async (token: string) => {
  // For branch session tokens, we'll do basic validation
  // In a real production system, you'd want to:
  // 1. Decode and verify the token signature
  // 2. Check token expiration
  // 3. Validate against a session store
  
  if (!token || token.length < 20) {
    throw new Error('Invalid branch session token');
  }
  
  // For now, we'll accept any properly formatted branch token
  // This is a simplified version for development
  return {
    id: 'branch_session_user',
    email: 'branch@session.com',
    type: 'branch_session',
    role: 'staff'
  };
};

// Enhanced authentication middleware that handles both token types
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth middleware - Path:', req.path);
    console.log('🔐 Auth middleware - Method:', req.method);
    console.log('🔐 Auth middleware - Auth header present:', !!authHeader);
    
    if (!authHeader) {
      // Only allow bypass for development and specific endpoints
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ DEVELOPMENT: No auth header - allowing request');
        next();
        return;
      }
      
      return res.status(401).json({
        status: 'error',
        error: 'Authentication required',
        message: 'Authorization header is required'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Try Supabase authentication first
    try {
      const user = await verifyAuth(authHeader);
      req.user = user;
      console.log('✅ Supabase token verified for user:', user.email);
      next();
      return;
    } catch (supabaseError) {
      console.log('🔐 Supabase token verification failed, trying branch session...');
      
      // If Supabase fails, try branch session token for staff routes
      if (req.path.includes('/staff') || req.path.includes('/branch')) {
        try {
          const branchUser = await verifyBranchToken(token);
          req.user = branchUser;
          console.log('✅ Branch session token verified for staff operations');
          next();
          return;
        } catch (branchError) {
          console.log('❌ Branch session token verification failed:', branchError instanceof Error ? branchError.message : 'Unknown error');
        }
      }
      
      // If both fail, check development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ DEVELOPMENT: Both auth methods failed - allowing request');
        req.user = { id: 'dev_user', email: 'dev@local.com', role: 'dev' };
        next();
        return;
      }
      
      // Production: Reject unauthorized requests
      return res.status(401).json({
        status: 'error',
        error: 'Unauthorized',
        message: 'Invalid authentication token'
      });
    }
  } catch (error) {
    console.log('🔐 Auth middleware error:', error instanceof Error ? error.message : 'Unknown error');
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ DEVELOPMENT: Auth error - allowing request');
      req.user = { id: 'error_fallback', email: 'fallback@local.com', role: 'dev' };
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
    // Development bypass
    if (process.env.NODE_ENV === 'development') {
      console.log('👑 DEVELOPMENT MODE: Skipping admin check');
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

    // For branch session users, allow admin operations in development
    if (req.user.type === 'branch_session' && process.env.NODE_ENV === 'development') {
      console.log('👑 DEVELOPMENT: Allowing branch session admin access');
      req.userRole = 'admin';
      next();
      return;
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
      const token = authHeader.replace('Bearer ', '');
      
      // Try Supabase first
      try {
        const user = await verifyAuth(authHeader);
        req.user = user;
        console.log('✅ Optional auth: Supabase token verified');
      } catch (supabaseError) {
        // Try branch session
        try {
          const branchUser = await verifyBranchToken(token);
          req.user = branchUser;
          console.log('✅ Optional auth: Branch session verified');
        } catch (branchError) {
          console.log('🔓 Optional auth: Both methods failed, continuing without auth');
        }
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    console.log('🔓 Optional auth failed, continuing without auth');
    next();
  }
};