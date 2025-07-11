// backend/src/middleware/auth.ts - COMPLETE WORKING VERSION
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

// Helper function to safely extract error messages
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Verify Supabase JWT token
export const verifyAuth = async (authHeader: string) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  
  return user;
};

// Verify session token (for staff PIN authentication)
export const verifySessionToken = async (token: string) => {
  if (!token || token.length < 32) {
    throw new Error('Invalid session token format');
  }

  // First, get the session without JOIN to avoid foreign key issues
  const { data: session, error: sessionError } = await supabase
    .from('branch_sessions')
    .select('*')
    .eq('session_token', token)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session) {
    throw new Error('Invalid or expired session');
  }

  // Now handle different staff types
  let staffData = null;
  
  // Check if it's a virtual staff ID (for branch auth)
  if (session.staff_id && session.staff_id.startsWith('branch_')) {
    // Virtual staff for branch authentication
    staffData = {
      id: session.staff_id,
      branch_id: session.branch_id,
      first_name: 'Branch',
      last_name: 'Manager', 
      role: 'manager',
      email: 'branch@system.local' // placeholder
    };
  } else {
    // Real staff ID - look up in branch_staff table
    const { data: realStaff, error: staffError } = await supabase
      .from('branch_staff')
      .select('*')
      .eq('id', session.staff_id)
      .single();
    
    if (staffError || !realStaff) {
      // If staff lookup fails, create a fallback
      staffData = {
        id: session.staff_id,
        branch_id: session.branch_id,
        first_name: 'Staff',
        last_name: 'User',
        role: 'associate',
        email: 'staff@system.local'
      };
    } else {
      staffData = realStaff;
    }
  }

  return {
    id: staffData.id,
    email: staffData.email,
    role: staffData.role,
    branchId: session.branch_id,
    sessionType: 'branch_staff'
  };
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

// SECURE: Main authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`🔐 Auth check: ${req.method} ${req.path}`);
  
  try {
    const authHeader = req.headers.authorization;
    const sessionTokenHeader = req.headers['x-session-token'] as string;
    
    // Method 1: Try session token first (for staff PIN auth)
    if (sessionTokenHeader) {
      try {
        const user = await verifySessionToken(sessionTokenHeader);
        req.user = user;
        console.log('✅ Session token authenticated');
        return next();
      } catch (error) {
        console.log('❌ Session token invalid:', getErrorMessage(error));
      }
    }

    // Method 2: Try JWT token (for regular user auth)
    if (authHeader) {
      try {
        const user = await verifyAuth(authHeader);
        req.user = user;
        console.log('✅ JWT token authenticated');
        return next();
      } catch (error) {
        console.log('❌ JWT token invalid:', getErrorMessage(error));
      }
    }

    // 🔒 SECURITY: Development bypass (DISABLED for production safety)
    if (false) {
      console.log('⚠️ DEVELOPMENT BYPASS (disabled for security)');
      req.user = { 
        id: 'dev_bypass', 
        email: 'dev@example.com', 
        role: 'super_admin',
        isDevelopmentBypass: true 
      };
      return next();
    }

    // No valid authentication found
    console.log('🚫 Authentication failed');
    return res.status(401).json({
      status: 'error',
      error: 'Authentication required',
      message: 'Valid authentication token required'
    });

  } catch (error) {
    console.error('💥 Authentication error:', getErrorMessage(error));
    return res.status(401).json({
      status: 'error',
      error: 'Authentication failed',
      message: 'Invalid authentication'
    });
  }
};

// SECURE: Admin-only middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        error: 'Authentication required'
      });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(req.user.id);
    
    if (!userIsAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        error: 'Admin access required'
      });
    }
    
    req.userRole = 'admin';
    next();
    
  } catch (error) {
    console.error('Admin check error:', getErrorMessage(error));
    return res.status(403).json({
      status: 'error',
      error: 'Admin verification failed'
    });
  }
};

// SECURE: Optional authentication (for public endpoints that can benefit from auth)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionTokenHeader = req.headers['x-session-token'] as string;
    
    // Try to authenticate, but don't fail if no auth provided
    if (sessionTokenHeader) {
      try {
        req.user = await verifySessionToken(sessionTokenHeader);
      } catch (error) {
        // Ignore auth errors in optional auth
      }
    } else if (authHeader) {
      try {
        req.user = await verifyAuth(authHeader);
      } catch (error) {
        // Ignore auth errors in optional auth
      }
    }
    
    // Always continue, regardless of auth status
    next();
  } catch (error) {
    // Always continue in optional auth
    next();
  }
};

// SECURE: Branch access validation
export const validateBranchAccess = (requiredBranchId?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          error: 'Authentication required'
        });
      }

      const branchId = requiredBranchId || req.params.branchId;
      
      if (!branchId) {
        return res.status(400).json({
          status: 'error',
          error: 'Branch ID required'
        });
      }

      // Admin users can access any branch
      if (req.user.role === 'admin') {
        return next();
      }

      // Staff users can only access their assigned branch
      if (req.user.sessionType === 'branch_staff') {
        if (req.user.branchId !== branchId) {
          return res.status(403).json({
            status: 'error',
            error: 'Access denied to this branch'
          });
        }
        return next();
      }

      // Default deny
      return res.status(403).json({
        status: 'error',
        error: 'Branch access not authorized'
      });

    } catch (error) {
      console.error('Branch access validation error:', getErrorMessage(error));
      return res.status(500).json({
        status: 'error',
        error: 'Access validation failed'
      });
    }
  };
};