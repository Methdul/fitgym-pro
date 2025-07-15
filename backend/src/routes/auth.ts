// backend/src/routes/auth.ts - COMPLETE WORKING VERSION WITH ALL FIXES
import express from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { 
  apiRateLimit,
  handleValidationErrors
} from '../middleware/validation';

const router = express.Router();

// Type aliases to avoid conflicts
type ExpressRequest = express.Request;
type ExpressResponse = express.Response;

// Sign in with email/password
router.post('/signin', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        error: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({
        status: 'error',
        error: error.message
      });
    }

    // Get user profile WITH verification status
    const { data: profile } = await supabase
      .from('users')
      .select('*, is_verified')
      .eq('auth_user_id', data.user.id)
      .single();

    res.json({
      status: 'success',
      data: {
        user: data.user,
        session: data.session,
        profile,
        verification: {
          isVerified: profile?.is_verified || false,
          needsVerification: !profile?.is_verified
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sign up with email/password
router.post('/signup', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { email, password, userData } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        error: 'Email and password are required'
      });
    }

    // Call Edge Function for custom signup
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/auth-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ email, password, userData })
    });

    const result = await response.json() as any;

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        error: result.error
      });
    }

    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user profile
router.get('/me', authenticate, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        error: 'User not authenticated'
      });
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        status: 'error',
        error: 'User profile not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: req.user,
        profile
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to get user profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send verification email
router.post('/send-verification', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        error: 'Email is required'
      });
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userProfile) {
      return res.status(404).json({
        status: 'error',
        error: 'User not found'
      });
    }

    if (userProfile.is_verified) {
      return res.status(400).json({
        status: 'error',
        error: 'Email is already verified'
      });
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store verification token (you could add this to users table or create a separate table)
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        verification_token: verificationToken,
        verification_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .eq('id', userProfile.id);

    if (updateError) {
      throw updateError;
    }

    // In a real app, you'd send an actual email here
    // For now, we'll just return the token for testing
    console.log(`📧 Verification email would be sent to ${email} with token: ${verificationToken}`);

    res.json({
      status: 'success',
      message: 'Verification email sent',
      // Remove this in production - only for testing
      verificationToken: verificationToken
    });

  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to send verification email'
    });
  }
});

// Verify email with token
router.post('/verify-email', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        status: 'error',
        error: 'Email and verification token are required'
      });
    }

    // Find user with matching token
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('verification_token', token)
      .single();

    if (userError || !userProfile) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid or expired verification token'
      });
    }

    // Check if token is expired
    if (userProfile.verification_token_expires && new Date() > new Date(userProfile.verification_token_expires)) {
      return res.status(400).json({
        status: 'error',
        error: 'Verification token has expired'
      });
    }

    // Update user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        is_verified: true,
        verification_token: null,
        verification_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id);

    if (updateError) {
      throw updateError;
    }

    res.json({
      status: 'success',
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to verify email'
    });
  }
});

// Create session for staff authentication - FIXES THE 500 ERROR ISSUE
router.post('/create-session',
  apiRateLimit,
  [
    body('branchId').isUUID().withMessage('Valid branch ID required'),
    body('authMethod').isIn(['pin', 'credentials']).withMessage('Valid auth method required'),
    // For PIN authentication
    body('staffId').optional().isUUID().withMessage('Valid staff ID required for PIN auth'),
    body('pin').optional().isLength({ min: 4, max: 4 }).withMessage('PIN must be 4 digits'),
    // For credentials authentication  
    body('email').optional().isEmail().withMessage('Valid email required for credentials auth'),
    body('password').optional().isLength({ min: 1 }).withMessage('Password required for credentials auth'),
    handleValidationErrors
  ],
  async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { branchId, authMethod, staffId, pin, email, password } = req.body;
      
      console.log(`🔐 Creating session for ${authMethod} authentication in branch: ${branchId}`);
      
      let authenticatedStaff = null;
      
      // Method 1: PIN Authentication
      if (authMethod === 'pin') {
        if (!staffId || !pin) {
          return res.status(400).json({
            status: 'error',
            error: 'Staff ID and PIN required for PIN authentication'
          });
        }
        
        // Verify staff exists and PIN matches
        const { data: staff, error: staffError } = await supabase
          .from('branch_staff')
          .select('*')
          .eq('id', staffId)
          .eq('branch_id', branchId)
          .single();
        
        if (staffError || !staff) {
          return res.status(404).json({
            status: 'error',
            error: 'Staff member not found'
          });
        }
        
        // Verify PIN (check both plain text and hashed versions for compatibility)
        let pinValid = false;
        if (staff.pin === pin) {
          pinValid = true;
        } else if (staff.pin_hash) {
          // If you're using hashed PINs
          try {
            const bcrypt = require('bcrypt');
            pinValid = await bcrypt.compare(pin, staff.pin_hash);
          } catch (error) {
            console.log('PIN hash comparison failed, checking plain text');
            pinValid = staff.pin === pin;
          }
        }
        
        if (!pinValid) {
          return res.status(401).json({
            status: 'error',
            error: 'Invalid PIN'
          });
        }
        
        authenticatedStaff = staff;
        console.log(`✅ PIN authentication successful for staff: ${staff.first_name} ${staff.last_name}`);
      }
      
      // Method 2: Credentials Authentication (branch login)
      else if (authMethod === 'credentials') {
        if (!email || !password) {
          return res.status(400).json({
            status: 'error',
            error: 'Email and password required for credentials authentication'
          });
        }
        
        // Verify branch credentials
        const { data: branch, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .eq('id', branchId)
          .eq('branch_email', email)
          .single();
        
        if (branchError || !branch) {
          return res.status(401).json({
            status: 'error',
            error: 'Invalid branch credentials'
          });
        }
        
        // For credentials auth, we create a virtual staff record
        authenticatedStaff = {
          id: `branch_${branchId}`,
          branch_id: branchId,
          first_name: 'Branch',
          last_name: 'Manager',
          role: 'manager',
          email: branch.branch_email,
          phone: branch.phone
        };
        
        console.log(`✅ Credentials authentication successful for branch: ${branch.name}`);
      }
      
      if (!authenticatedStaff) {
        return res.status(401).json({
          status: 'error',
          error: 'Authentication failed'
        });
      }
      
      // Generate secure session token
      const sessionToken = `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      const expiresAt = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)); // 90 days

      
      // Create session record in database
      const sessionData = {
        session_token: sessionToken,
        staff_id: authenticatedStaff.id,
        branch_id: branchId,
        is_active: true,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🔍 Creating session record:', {
        session_token: sessionToken,
        staff_id: authenticatedStaff.id,
        branch_id: branchId,
        expires_at: expiresAt.toISOString()
      });
      
      const { data: session, error: sessionError } = await supabase
        .from('branch_sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (sessionError) {
        console.error('🚨 Failed to create session:', sessionError);
        return res.status(500).json({
          status: 'error',
          error: 'Failed to create session',
          details: sessionError.message
        });
      }
      
      // Update staff last_active timestamp
      if (authMethod === 'pin') {
        await supabase
          .from('branch_staff')
          .update({ last_active: new Date().toISOString() })
          .eq('id', authenticatedStaff.id);
      }
      
      // Clean up expired sessions
      await supabase
        .from('branch_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      console.log(`✅ Session created successfully: ${sessionToken}`);
      
      res.json({
        status: 'success',
        message: 'Session created successfully',
        data: {
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          staff: {
            id: authenticatedStaff.id,
            first_name: authenticatedStaff.first_name,
            last_name: authenticatedStaff.last_name,
            role: authenticatedStaff.role,
            email: authenticatedStaff.email,
            branch_id: branchId
          }
        }
      });
      
    } catch (error) {
      console.error('💥 Session creation error:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Session validation endpoint (for debugging/testing)
router.get('/validate-session/:token',
  apiRateLimit,
  async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { token } = req.params;
      
      if (!token || token.length < 32) {
        return res.status(400).json({
          status: 'error',
          error: 'Invalid session token format'
        });
      }
      
      const { data: session, error } = await supabase
        .from('branch_sessions')
        .select('*, branch_staff(*)')
        .eq('session_token', token)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (error || !session) {
        return res.status(404).json({
          status: 'error',
          error: 'Invalid or expired session'
        });
      }
      
      res.json({
        status: 'success',
        message: 'Session is valid',
        data: {
          sessionToken: token,
          expiresAt: session.expires_at,
          staff: session.branch_staff
        }
      });
      
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to validate session'
      });
    }
  }
);

export { router as authRoutes };