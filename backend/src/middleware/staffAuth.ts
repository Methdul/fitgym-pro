import { Request, Response, NextFunction } from 'express';
import { sessionManager } from '../lib/sessionManager';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      staffSession?: {
        staffId: string;
        branchId: string;
        role: string;
      };
    }
  }
}

// Middleware to check staff session OR JWT auth
export const staffAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for session token first
    const sessionToken = req.headers['x-session-token'] as string;
    
    if (sessionToken) {
      const session = sessionManager.getSession(sessionToken);
      
      if (session) {
        req.staffSession = {
          staffId: session.staffId,
          branchId: session.branchId,
          role: session.role
        };
        return next();
      }
    }

    // Fallback to JWT auth
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
        return next();
      }
    }

    // Allow in development with bypass
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_AUTH_BYPASS === 'true') {
      console.log('⚠️ Auth bypassed in development mode');
      return next();
    }

    return res.status(401).json({
      status: 'error',
      error: 'Authentication required'
    });

  } catch (error) {
    return res.status(401).json({
      status: 'error',
      error: 'Authentication failed'
    });
  }
};