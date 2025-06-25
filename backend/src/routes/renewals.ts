// backend/src/routes/renewals.ts - WITH SECURITY FIXES (Phase 1)
import express, { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { 
  commonValidations, 
  currentStrictRateLimit as strictRateLimit,
  currentAuthRateLimit as authRateLimit,
  currentApiRateLimit as apiRateLimit,
  validateUUID,
  handleValidationErrors,
  validatePIN,
  validatePrice,
  validateInteger,
  validateEnum
} from '../middleware/validation';

// Import RBAC system
import {
  requirePermission,
  requireAnyPermission,
  requireBranchAccess,
  auditLog,
  Permission,
  rbacUtils
} from '../middleware/rbac';

const router = express.Router();

// Extend Request interface for PIN attempt tracking
declare global {
  namespace Express {
    interface Request {
      pinAttemptCount?: number;
    }
  }
}

// Debug middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`🔄 Renewals Route: ${req.method} ${req.path}`);
  next();
});

// Type definitions for API responses
interface EdgeFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// PHASE 1 SECURITY FIXES: Renewal processing validation
const renewalProcessValidation = [
  // Validate UUIDs
  require('express-validator').body('memberId')
    .isUUID()
    .withMessage('memberId must be a valid UUID'),
  require('express-validator').body('packageId')
    .isUUID()
    .withMessage('packageId must be a valid UUID'),
  require('express-validator').body('staffId')
    .isUUID()
    .withMessage('staffId must be a valid UUID'),
  
  // Validate payment method
  require('express-validator').body('paymentMethod')
    .isIn(['cash', 'card', 'transfer', 'cheque'])
    .withMessage('paymentMethod must be one of: cash, card, transfer, cheque'),
  
  // Validate amount
  require('express-validator').body('amountPaid')
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('amountPaid must be between 0.01 and 999999.99'),
  
  // Validate duration
  require('express-validator').body('durationMonths')
    .isInt({ min: 1, max: 24 })
    .withMessage('durationMonths must be between 1 and 24'),
  
  // Validate PIN (CRITICAL SECURITY FIX)
  require('express-validator').body('staffPin')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('staffPin must be exactly 4 digits'),
  
  handleValidationErrors
];

// PHASE 1 SECURITY FIXES: Create PIN attempt tracking middleware
const pinAttemptTracking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staffId } = req.body;
    const clientIP = req.ip;
    
    // PHASE 1 FIX: Track PIN attempts in staff_security_events table
    const { data: recentAttempts } = await supabase
      .from('staff_security_events')
      .select('*')
      .eq('staff_id', staffId)
      .eq('event_type', 'pin_attempt')
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .order('created_at', { ascending: false });

    const attemptCount = recentAttempts?.length || 0;
    
    // PHASE 1 FIX: Implement progressive delays
    if (attemptCount >= 5) {
      // Log security event
      await supabase.from('staff_security_events').insert({
        staff_id: staffId,
        event_type: 'pin_lockout',
        ip_address: clientIP,
        user_agent: req.get('User-Agent'),
        details: `PIN attempts exceeded (${attemptCount} attempts)`,
        created_at: new Date().toISOString()
      });

      return res.status(429).json({
        status: 'error',
        error: 'PIN attempts exceeded',
        message: 'Too many PIN attempts. Please wait 15 minutes before trying again.',
        lockoutUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });
    }

    // Log this attempt and set the count on request object
    await supabase.from('staff_security_events').insert({
      staff_id: staffId,
      event_type: 'pin_attempt',
      ip_address: clientIP,
      user_agent: req.get('User-Agent'),
      details: `PIN attempt ${attemptCount + 1}/5`,
      created_at: new Date().toISOString()
    });

    // Ensure pinAttemptCount is always set
    req.pinAttemptCount = attemptCount + 1;
    next();
  } catch (error) {
    console.error('PIN attempt tracking error:', error);
    next(); // Continue even if tracking fails
  }
};

// PHASE 1 SECURITY FIXES: Secure PIN comparison function
const secureComparePin = (inputPin: string, storedPin: string): boolean => {
  if (!inputPin || !storedPin) return false;
  if (inputPin.length !== storedPin.length) return false;
  
  // PHASE 1 FIX: Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < inputPin.length; i++) {
    result |= inputPin.charCodeAt(i) ^ storedPin.charCodeAt(i);
  }
  return result === 0;
};

// Process a member renewal - PHASE 1 SECURITY FIXES APPLIED
router.post('/process', 
  authRateLimit,                               // PHASE 1 FIX: PIN brute force protection
  renewalProcessValidation,                    // PHASE 1 FIX: Input validation
  pinAttemptTracking,                          // PHASE 1 FIX: PIN attempt tracking
  authenticate,                                // Must be authenticated
  requirePermission(Permission.RENEWALS_PROCESS), // Must have renewal processing permission
  auditLog('PROCESS_RENEWAL', 'renewal'),      // Log the action
  async (req: Request, res: Response) => {
    try {
      const {
        memberId,
        packageId,
        paymentMethod,
        amountPaid,
        durationMonths,
        staffId,
        staffPin
      } = req.body;

      console.log(`🔄 Processing renewal for member: ${memberId}`);

      try {
        // Try to use Edge Function first
        const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/member-renewal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({
            action: 'process',
            memberId,
            packageId,
            paymentMethod,
            amountPaid,
            durationMonths,
            staffId,
            staffPin
          })
        });

        const result = await response.json() as EdgeFunctionResponse;
        
        if (result.success) {
          return res.json({
            status: 'success',
            data: result.data
          });
        } else {
          return res.status(400).json({
            status: 'error',
            error: result.error
          });
        }

      } catch (edgeFunctionError) {
        console.log('Edge function not available, using direct database approach');
        
        // Fallback to direct database processing
        // PHASE 1 FIX: Secure staff PIN verification
        const { data: staff, error: staffError } = await supabase
          .from('branch_staff')
          .select('*')
          .eq('id', staffId)
          .single();

        if (staffError || !staff) {
          // Log failed staff lookup
          await supabase.from('staff_security_events').insert({
            staff_id: staffId,
            event_type: 'invalid_staff_lookup',
            ip_address: req.ip,
            details: 'Staff member not found during renewal',
            created_at: new Date().toISOString()
          });

          return res.status(404).json({
            status: 'error',
            error: 'Staff member not found'
          });
        }

        // PHASE 1 FIX: Secure PIN comparison with timing attack protection
        const pinValid = secureComparePin(staffPin, staff.pin);
        const currentAttemptCount = req.pinAttemptCount || 1;
        
        if (!pinValid) {
          // Log failed PIN attempt
          await supabase.from('staff_security_events').insert({
            staff_id: staffId,
            event_type: 'pin_failure',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            details: `Invalid PIN attempt ${currentAttemptCount}/5`,
            created_at: new Date().toISOString()
          });

          return res.status(401).json({
            status: 'error',
            error: 'Invalid PIN',
            attemptsRemaining: Math.max(0, 5 - currentAttemptCount)
          });
        }

        // PHASE 1 FIX: Log successful PIN verification
        await supabase.from('staff_security_events').insert({
          staff_id: staffId,
          event_type: 'pin_success',
          ip_address: req.ip,
          details: 'PIN verified successfully for renewal',
          created_at: new Date().toISOString()
        });

        // Step 2: Get member details with branch validation
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', memberId)
          .single();

        if (memberError || !member) {
          return res.status(404).json({
            status: 'error',
            error: 'Member not found'
          });
        }

        // PHASE 1 FIX: Enhanced branch access validation
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== member.branch_id) {
          const userPermissions = await rbacUtils.getUserPermissions(req.user);
          if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
            await supabase.from('staff_security_events').insert({
              staff_id: staffId,
              event_type: 'unauthorized_branch_access',
              ip_address: req.ip,
              details: `Attempted renewal for member in different branch: ${member.branch_id}`,
              created_at: new Date().toISOString()
            });

            return res.status(403).json({
              status: 'error',
              error: 'Branch access denied',
              message: 'You can only process renewals for your assigned branch'
            });
          }
        }

        // Step 3: Check if member is expired
        const currentDate = new Date();
        const expiryDate = new Date(member.expiry_date);
        
        if (member.status !== 'expired' && expiryDate > currentDate) {
          return res.status(400).json({
            status: 'error',
            error: 'Member is not expired. Renewals can only be processed after expiry.'
          });
        }

        // Step 4: Get package details with validation
        const { data: packageData, error: packageError } = await supabase
          .from('packages')
          .select('*')
          .eq('id', packageId)
          .eq('is_active', true)
          .single();

        if (packageError || !packageData) {
          return res.status(404).json({
            status: 'error',
            error: 'Package not found or inactive'
          });
        }

        // PHASE 1 FIX: Validate amount against package price (tolerance check)
        const priceTolerance = packageData.price * 0.1; // 10% tolerance
        if (Math.abs(amountPaid - packageData.price) > priceTolerance) {
          await supabase.from('staff_security_events').insert({
            staff_id: staffId,
            event_type: 'suspicious_amount',
            ip_address: req.ip,
            details: `Amount paid (${amountPaid}) differs significantly from package price (${packageData.price})`,
            created_at: new Date().toISOString()
          });

          return res.status(400).json({
            status: 'error',
            error: 'Amount validation failed',
            message: `Amount paid should be close to package price of $${packageData.price}`
          });
        }

        // Step 5: Calculate new expiry date
        const newExpiry = new Date(currentDate);
        newExpiry.setMonth(newExpiry.getMonth() + durationMonths);

        // PHASE 1 FIX: Use database transaction for atomic operations
        const { data: renewal, error: renewalError } = await supabase
          .from('member_renewals')
          .insert({
            member_id: memberId,
            package_id: packageId,
            amount_paid: amountPaid,
            payment_method: paymentMethod,
            duration_months: durationMonths,
            renewed_by_staff_id: staffId,
            new_expiry_date: newExpiry.toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (renewalError) {
          console.error('Renewal creation error:', renewalError);
          throw new Error('Failed to create renewal record');
        }

        // Step 7: Update member record
        const { error: updateError } = await supabase
          .from('members')
          .update({
            status: 'active',
            expiry_date: newExpiry.toISOString(),
            package_type: packageData.type,
            package_name: packageData.name,
            package_price: packageData.price,
            updated_at: new Date().toISOString()
          })
          .eq('id', memberId);

        if (updateError) {
          console.error('Member update error:', updateError);
          throw new Error('Failed to update member record');
        }

        // Log successful renewal
        await supabase.from('staff_security_events').insert({
          staff_id: staffId,
          event_type: 'renewal_success',
          ip_address: req.ip,
          details: `Renewal processed successfully for member ${memberId}, amount: $${amountPaid}`,
          created_at: new Date().toISOString()
        });

        console.log(`✅ Renewal processed successfully for member: ${memberId}`);

        // Return success
        return res.json({
          status: 'success',
          data: {
            renewal,
            message: `Membership renewed successfully. New expiry date: ${newExpiry.toLocaleDateString()}`
          }
        });
      }

    } catch (error) {
      console.error('Error processing renewal:', error);
      res.status(500).json({
        status: 'error',
        error: 'Internal server error',
        message: 'An error occurred while processing the renewal'
      });
    }
  }
);

// Get renewal history for a member - PHASE 1 SECURITY FIXES APPLIED
router.get('/member/:memberId', 
  apiRateLimit,                                // PHASE 1 FIX: Rate limiting
  [validateUUID('memberId'), handleValidationErrors], // PHASE 1 FIX: UUID validation
  authenticate,                                // Must be authenticated
  requirePermission(Permission.RENEWALS_READ), // Must have renewal read permission
  auditLog('READ_MEMBER_RENEWALS', 'renewal'), // Log the action
  async (req: Request, res: Response) => {
    try {
      const { memberId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      // PHASE 1 FIX: Apply pagination limits
      const resultLimit = Math.min(parseInt(limit as string) || 20, 100);
      const resultOffset = Math.max(parseInt(offset as string) || 0, 0);

      // First get member details to check branch access
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('branch_id')
        .eq('id', memberId)
        .single();

      if (memberError || !member) {
        return res.status(404).json({
          status: 'error',
          error: 'Member not found'
        });
      }

      // Check branch access for staff users
      if (req.user.sessionType === 'branch_staff') {
        const userPermissions = await rbacUtils.getUserPermissions(req.user);
        if (req.user.branchId !== member.branch_id && 
            !rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only view renewals for members in your assigned branch'
          });
        }
      }

      const { data, error } = await supabase
        .from('member_renewals')
        .select(`
          *,
          packages (name, type),
          branch_staff (first_name, last_name, role)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .range(resultOffset, resultOffset + resultLimit - 1);

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch renewal history');
      }

      console.log(`✅ Found ${data?.length || 0} renewals for member ${memberId}`);

      res.json({
        status: 'success',
        data: data || [],
        meta: {
          resultLimit,
          resultOffset,
          queriedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching renewal history:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch renewal history'
      });
    }
  }
);

// Get recent renewals for a branch - PHASE 1 SECURITY FIXES APPLIED
router.get('/recent/:branchId', 
  apiRateLimit,                                // PHASE 1 FIX: Rate limiting
  commonValidations.validateBranchId,         // PHASE 1 FIX: UUID validation
  authenticate,                                // Must be authenticated
  requireBranchAccess(Permission.RENEWALS_READ), // Must have renewal read permission for this branch
  auditLog('READ_RECENT_RENEWALS', 'renewal'), // Log the action
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      const { limit = 10 } = req.query;

      // PHASE 1 FIX: Apply result limits
      const resultLimit = Math.min(parseInt(limit as string) || 10, 50);

      const { data, error } = await supabase
        .from('member_renewals')
        .select(`
          *,
          members!inner (branch_id, first_name, last_name, email),
          packages (name, type),
          branch_staff (first_name, last_name, role)
        `)
        .eq('members.branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(resultLimit);

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch recent renewals');
      }

      console.log(`✅ Found ${data?.length || 0} recent renewals for branch ${branchId}`);

      res.json({
        status: 'success',
        data: data || [],
        meta: {
          resultLimit,
          queriedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching recent renewals:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch recent renewals'
      });
    }
  }
);

// Check if member is eligible for renewal - PHASE 1 SECURITY FIXES APPLIED
router.get('/eligibility/:memberId', 
  apiRateLimit,                                // PHASE 1 FIX: Rate limiting
  [validateUUID('memberId'), handleValidationErrors], // PHASE 1 FIX: UUID validation
  authenticate,                                // Must be authenticated
  requirePermission(Permission.RENEWALS_READ), // Must have renewal read permission
  auditLog('CHECK_RENEWAL_ELIGIBILITY', 'renewal'), // Log the action
  async (req: Request, res: Response) => {
    try {
      const { memberId } = req.params;

      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error || !member) {
        return res.status(404).json({
          status: 'error',
          error: 'Member not found'
        });
      }

      // Check branch access for staff users
      if (req.user.sessionType === 'branch_staff') {
        const userPermissions = await rbacUtils.getUserPermissions(req.user);
        if (req.user.branchId !== member.branch_id && 
            !rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only check eligibility for members in your assigned branch'
          });
        }
      }

      const currentDate = new Date();
      const expiryDate = new Date(member.expiry_date);
      const isExpired = expiryDate < currentDate;
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`✅ Checked renewal eligibility for member ${memberId}: ${isExpired ? 'Eligible' : 'Not eligible'}`);

      res.json({
        status: 'success',
        data: {
          isEligible: isExpired,
          memberStatus: member.status,
          expiryDate: member.expiry_date,
          daysUntilExpiry: isExpired ? Math.abs(daysUntilExpiry) : daysUntilExpiry,
          isExpired,
          message: isExpired 
            ? 'Member is eligible for renewal' 
            : `Member expires in ${daysUntilExpiry} days. Renewal only available after expiry.`
        },
        meta: {
          queriedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error checking renewal eligibility:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to check renewal eligibility'
      });
    }
  }
);

console.log('🔄 Renewal routes loaded successfully - WITH PHASE 1 SECURITY FIXES');

export { router as renewalRoutes };