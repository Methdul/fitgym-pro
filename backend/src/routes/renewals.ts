// backend/src/routes/renewals.ts - COMPLETE WITH DEBUG ROUTES
import express, { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { 
  commonValidations, 
  strictRateLimit,
  authRateLimit,
  apiRateLimit,
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

// Import security utilities for unified PIN verification
let verifyPin: any = null;
try {
  const securityModule = require('../lib/security');
  verifyPin = securityModule.verifyPin;
  console.log('✅ Security module loaded for renewals - using enhanced PIN security');
} catch (error) {
  console.log('⚠️ Security module not found in renewals - using basic comparison only');
}

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

// ====================================================================
// TEMPORARY DEBUG ROUTES (REMOVE AFTER FIXING ISSUES)
// ====================================================================

// DEBUG ROUTE - Process renewal without auth checks
router.post('/debug/process-no-auth',
  async (req: Request, res: Response) => {
    try {
      console.log('🐛 DEBUG: Processing renewal without auth checks');
      console.log('🐛 Request body:', JSON.stringify(req.body, null, 2));
      
      const {
        memberId,
        packageId,
        staffId,
        staffPin,
        paymentMethod,
        amountPaid,
        durationMonths
      } = req.body;
      
      // Basic validation
      const required = ['memberId', 'packageId', 'staffId', 'staffPin', 'paymentMethod', 'amountPaid', 'durationMonths'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          status: 'error',
          error: 'Missing required fields',
          missing,
          received: Object.keys(req.body)
        });
      }

      // Check if staff exists
      const { data: staff, error: staffError } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, pin, pin_hash')
        .eq('id', staffId)
        .single();

      if (staffError || !staff) {
        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found',
          details: staffError?.message
        });
      }

      console.log('🐛 Found staff:', staff.first_name, staff.last_name);
      console.log('🐛 Staff has pin_hash:', !!staff.pin_hash);
      console.log('🐛 Staff has legacy pin:', !!staff.pin);

      // Test PIN verification
      let pinValid = false;
      
      if (staff.pin_hash && verifyPin) {
        pinValid = await verifyPin(staffPin, staff.pin_hash);
        console.log('🐛 PIN verification (secure):', pinValid);
      } else if (staff.pin) {
        pinValid = staff.pin === staffPin;
        console.log('🐛 PIN verification (legacy):', pinValid);
      }

      if (!pinValid) {
        return res.status(401).json({
          status: 'error',
          error: 'Invalid PIN'
        });
      }

      console.log('🐛 ✅ PIN verification successful');

      // Check if member exists
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberError || !member) {
        console.log('🐛 Member not found:', memberError?.message);
        return res.status(404).json({
          status: 'error',
          error: 'Member not found',
          details: memberError?.message
        });
      }

      console.log('🐛 Found member:', member.first_name, member.last_name);

      // Check if package exists
      const { data: renewalPackage, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError || !renewalPackage) {
        console.log('🐛 Package not found:', packageError?.message);
        return res.status(404).json({
          status: 'error',
          error: 'Package not found',
          details: packageError?.message
        });
      }

      console.log('🐛 Found package:', renewalPackage.name);

      res.json({
        status: 'success',
        message: 'DEBUG: All validations passed - renewal would proceed',
        debug: {
          staffFound: true,
          memberFound: true,
          packageFound: true,
          pinVerified: true,
          staffName: `${staff.first_name} ${staff.last_name}`,
          memberName: `${member.first_name} ${member.last_name}`,
          packageName: renewalPackage.name,
          usedSecurePin: !!staff.pin_hash
        }
      });

    } catch (error) {
      console.error('🐛 ❌ Error in debug renewal:', error);
      res.status(500).json({
        status: 'error',
        error: 'Debug renewal failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// ====================================================================
// REGULAR ROUTES (WITH ORIGINAL AUTHENTICATION)
// ====================================================================

// Process a member renewal - PHASE 1 SECURITY FIXES APPLIED
router.post('/process', 
  authRateLimit,                               // PHASE 1 FIX: PIN brute force protection
  renewalProcessValidation,                    // PHASE 1 FIX: Input validation
  pinAttemptTracking,                          // PHASE 1 FIX: PIN attempt tracking
  authenticate,                                // Must be authenticated
  requirePermission(Permission.RENEWALS_PROCESS), // Must have renewal processing permission
  auditLog('PROCESS_MEMBER_RENEWAL', 'renewals'),
  async (req: Request, res: Response) => {
    try {
      const {
        memberId,
        packageId,
        staffId,
        staffPin,
        paymentMethod,
        amountPaid,
        durationMonths,
        additionalMembers = []
      } = req.body;

      console.log('🔄 Processing member renewal with enhanced security');

      // Step 1: PHASE 1 FIX - Enhanced staff verification with unified PIN logic
      const { data: renewalStaff, error: renewalStaffError } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, role, pin, pin_hash')
        .eq('id', staffId)
        .single();

      if (renewalStaffError || !renewalStaff) {
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

      // UNIFIED PIN VERIFICATION (same logic as staff.ts)
      let pinValid = false;
      
      if (renewalStaff.pin_hash && verifyPin) {
        // New secure system - use hashed PIN from pin_hash column
        pinValid = await verifyPin(staffPin, renewalStaff.pin_hash);
        console.log('🔐 Using secure PIN verification (pin_hash)');
      } else if (renewalStaff.pin) {
        // Legacy system or fallback - plain text comparison
        pinValid = secureComparePin(staffPin, renewalStaff.pin);
        console.log('🔐 Using legacy PIN verification (pin)');
      } else {
        // No PIN set
        pinValid = false;
        console.log('❌ No PIN found for staff member');
      }

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

      // Step 2: Get and validate member
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

      // Step 3: Get and validate package
      const { data: renewalPackage, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError || !renewalPackage) {
        return res.status(404).json({
          status: 'error',
          error: 'Package not found'
        });
      }

      // Step 4: Calculate new expiry date
      const currentDate = new Date();
      const currentExpiry = new Date(member.expiry_date);
      const startDate = currentExpiry > currentDate ? currentExpiry : currentDate;
      
      const newExpiryDate = new Date(startDate);
      newExpiryDate.setMonth(newExpiryDate.getMonth() + parseInt(durationMonths));

      // Step 5: PHASE 1 FIX - Second staff verification before processing
      const { data: processStaff, error: processStaffError } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, role, pin, pin_hash')
        .eq('id', staffId)
        .single();

      if (processStaffError || !processStaff) {
        // Log failed staff lookup
        await supabase.from('staff_security_events').insert({
          staff_id: staffId,
          event_type: 'invalid_staff_lookup',
          ip_address: req.ip,
          details: 'Staff member not found during renewal processing',
          created_at: new Date().toISOString()
        });

        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found'
        });
      }

      // UNIFIED PIN VERIFICATION for processing step
      let processPinValid = false;
      
      if (processStaff.pin_hash && verifyPin) {
        // New secure system - use hashed PIN from pin_hash column
        processPinValid = await verifyPin(staffPin, processStaff.pin_hash);
      } else if (processStaff.pin) {
        // Legacy system or fallback - plain text comparison
        processPinValid = secureComparePin(staffPin, processStaff.pin);
      } else {
        // No PIN set
        processPinValid = false;
      }
      
      if (!processPinValid) {
        // Log failed PIN attempt
        await supabase.from('staff_security_events').insert({
          staff_id: staffId,
          event_type: 'pin_failure',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          details: `Invalid PIN attempt during processing ${currentAttemptCount}/5`,
          created_at: new Date().toISOString()
        });

        return res.status(401).json({
          status: 'error',
          error: 'Invalid PIN',
          attemptsRemaining: Math.max(0, 5 - currentAttemptCount)
        });
      }

      // Step 6: Create renewal record
      const renewalData = {
        member_id: memberId,
        package_id: packageId,
        renewed_by_staff_id: staffId,
        payment_method: paymentMethod,
        amount_paid: parseFloat(amountPaid),
        duration_months: parseInt(durationMonths),
        previous_expiry_date: member.expiry_date,
        new_expiry_date: newExpiryDate.toISOString(),
        additional_members: additionalMembers,
        created_at: new Date().toISOString()
      };

      const { data: renewal, error: renewalError } = await supabase
        .from('member_renewals')
        .insert(renewalData)
        .select()
        .single();

      if (renewalError) {
        console.error('Renewal creation error:', renewalError);
        return res.status(500).json({
          status: 'error',
          error: 'Failed to create renewal record'
        });
      }

      // Step 7: Update member status and expiry
      const { error: updateError } = await supabase
        .from('members')
        .update({
          expiry_date: newExpiryDate.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (updateError) {
        console.error('Member update error:', updateError);
        return res.status(500).json({
          status: 'error',
          error: 'Failed to update member'
        });
      }

      // Step 8: Log the renewal action
      await supabase
        .from('staff_actions_log')
        .insert({
          staff_id: staffId,
          action_type: 'MEMBER_RENEWAL',
          description: `Renewed membership for ${member.first_name} ${member.last_name} - ${renewalPackage.name} for ${durationMonths} months`,
          member_id: memberId,
          created_at: new Date().toISOString()
        });

      console.log('✅ Member renewal processed successfully');

      res.json({
        status: 'success',
        data: {
          renewal,
          member: {
            ...member,
            expiry_date: newExpiryDate.toISOString(),
            status: 'active'
          },
          package: renewalPackage,
          staff: {
            id: processStaff.id,
            name: `${processStaff.first_name} ${processStaff.last_name}`,
            role: processStaff.role
          }
        },
        message: 'Member renewal processed successfully'
      });

    } catch (error) {
      console.error('❌ Error processing renewal:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to process renewal',
        message: 'An unexpected error occurred during renewal processing'
      });
    }
  }
);

// Get renewals for a branch - RBAC PROTECTED
router.get('/branch/:branchId', 
  authenticate,
  requireBranchAccess(Permission.RENEWALS_READ),
  [validateUUID('branchId'), handleValidationErrors],
  auditLog('READ_BRANCH_RENEWALS', 'renewals'),
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      const { limit = 50, offset = 0, period = '30' } = req.query;

      console.log(`📋 Getting renewals for branch: ${branchId}`);

      // Calculate date range
      const daysAgo = parseInt(period as string);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('member_renewals')
        .select(`
          *,
          members!member_renewals_member_id_fkey(first_name, last_name, email, national_id),
          packages!member_renewals_package_id_fkey(name, price, type),
          branch_staff!member_renewals_renewed_by_staff_id_fkey(first_name, last_name, role)
        `)
        .eq('members.branch_id', branchId)
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} renewals`);

      res.json({
        status: 'success',
        data: data || [],
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: data?.length || 0
        }
      });

    } catch (error) {
      console.error('Error fetching renewals:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch renewals'
      });
    }
  }
);

export default router;