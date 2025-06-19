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

// General authentication middleware - SECURED VERSION
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // SECURITY: Only allow development bypass if explicitly enabled
    const allowDevBypass = process.env.NODE_ENV === 'development' && 
                          process.env.ALLOW_AUTH_BYPASS === 'true';
    
    if (!authHeader) {
      if (allowDevBypass) {
        console.log('⚠️ DEVELOPMENT MODE: No auth header - bypassing (DANGEROUS IN PRODUCTION!)');
        next();
        return;
      }
      
      return res.status(401).json({
        status: 'error',
        error: 'Authentication required',
        message: 'Authorization header is required'
      });
    }
    
    const user = await verifyAuth(authHeader);
    req.user = user;
    next();
  } catch (error) {
    console.log('🔐 Auth middleware error:', error instanceof Error ? error.message : 'Unknown error');
    
    // SECURITY: Only allow dev bypass if explicitly enabled
    const allowDevBypass = process.env.NODE_ENV === 'development' && 
                          process.env.ALLOW_AUTH_BYPASS === 'true';
    
    if (allowDevBypass) {
      console.log('⚠️ DEVELOPMENT MODE: Auth failed but bypassing (DANGEROUS IN PRODUCTION!)');
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

// Admin-only middleware - SECURED VERSION
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // SECURITY: Only allow dev bypass if explicitly enabled
    const allowDevBypass = process.env.NODE_ENV === 'development' && 
                          process.env.ALLOW_AUTH_BYPASS === 'true';
    
    if (allowDevBypass) {
      console.log('👑 DEVELOPMENT MODE: Skipping admin check (DANGEROUS IN PRODUCTION!)');
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