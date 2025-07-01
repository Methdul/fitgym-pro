// backend/src/routes/staff.ts - COMPLETE WITH DEBUG ROUTES AND PIN VERIFICATION FIX
import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { staffAuth } from '../middleware/staffAuth';
// import { sessionManager } from '../lib/sessionManager'; // Commented out to avoid dependency issues
import { 
  commonValidations, 
  strictRateLimit,
  authRateLimit,
  apiRateLimit,
  validateUUID,
  handleValidationErrors 
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

// HASH PIN ONLY - No more dual system
import { hashPin, verifyPin, validatePin } from '../lib/security';
console.log('✅ Security module loaded - HASH PIN ONLY mode');

// Helper function to safely get branch name from Supabase join result
const getBranchName = (branches: any): string | undefined => {
  if (!branches) return undefined;
  if (Array.isArray(branches)) {
    return branches[0]?.name;
  }
  return branches?.name;
};

// Helper function to validate PIN format (basic validation)
const basicPinValidation = (pin: string): { isValid: boolean; error?: string } => {
  if (!pin) {
    return { isValid: false, error: 'PIN is required' };
  }
  
  if (!/^\d{4}$/.test(pin)) {
    return { isValid: false, error: 'PIN must be exactly 4 digits' };
  }
  
  return { isValid: true };
};

// Debug middleware
router.use((req: Request, res: Response, next) => {
  console.log(`👥 Staff Route: ${req.method} ${req.path}`);
  next();
});

// ====================================================================
// TEMPORARY DEBUG ROUTES (REMOVE AFTER FIXING ISSUES)
// ====================================================================

// DEBUG ROUTE - Create staff without auth checks
router.post('/debug/create-no-auth',
  async (req: Request, res: Response) => {
    try {
      console.log('🐛 DEBUG: Creating staff without auth checks');
      console.log('🐛 Request body:', JSON.stringify(req.body, null, 2));
      
      const { firstName, lastName, email, phone, role, pin, branchId } = req.body;
      
      // Basic validation
      if (!firstName || !lastName || !email || !pin || !branchId) {
        return res.status(400).json({
          status: 'error',
          error: 'Missing required fields',
          required: ['firstName', 'lastName', 'email', 'pin', 'branchId'],
          received: Object.keys(req.body)
        });
      }

      // Validate PIN format
      const pinValidation = basicPinValidation(pin);
      if (!pinValidation.isValid) {
        return res.status(400).json({
          status: 'error',
          error: pinValidation.error
        });
      }

      // Check if branch exists
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', branchId)
        .single();
      
      if (branchError || !branch) {
        return res.status(404).json({
          status: 'error',
          error: 'Branch not found',
          branchId: branchId,
          details: branchError?.message
        });
      }

      console.log('🐛 Found branch:', branch.name);

      // Check if email already exists
      const { data: existingStaff } = await supabase
        .from('branch_staff')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (existingStaff) {
        return res.status(409).json({
          status: 'error',
          error: 'Staff member with this email already exists'
        });
      }
      
      // Hash PIN
      // HASH PIN ONLY - Always use hashPin
      const hashedPin = await hashPin(pin);  
      console.log('🔐 Using secure hashPin for PIN creation');
      
      // Create staff member
      const staffData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        role: role,
        pin_hash: hashedPin,
        pin: null,
        branch_id: branchId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🐛 Creating staff with data:', { ...staffData, pin_hash: '[HIDDEN]' });
      
      const { data, error } = await supabase
        .from('branch_staff')
        .insert(staffData)
        .select('id, first_name, last_name, email, role, branch_id, created_at')
        .single();
      
      if (error) {
        console.error('🐛 Database error:', error);
        return res.status(500).json({
          status: 'error',
          error: 'Database error',
          details: error.message
        });
      }
      
      console.log('🐛 ✅ Staff created successfully:', data.id);
      
      res.status(201).json({
        status: 'success',
        data,
        message: 'DEBUG: Staff member created successfully'
      });
      
    } catch (error) {
      console.error('🐛 ❌ Error in debug create:', error);
      res.status(500).json({
        status: 'error',
        error: 'Debug creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// DEBUG ROUTE - Check PIN status
router.get('/debug/pin-check/:id',
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const { data: staff } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, pin, pin_hash')
        .eq('id', id)
        .single();
        
      if (!staff) {
        return res.status(404).json({ error: 'Staff not found' });
      }
      
      res.json({
        staffId: staff.id,
        name: `${staff.first_name} ${staff.last_name}`,
        hasLegacyPin: !!staff.pin,
        hasSecurePin: !!staff.pin_hash,
        pinLength: staff.pin?.length || 0,
        pinHashLength: staff.pin_hash?.length || 0,
        securityFeatures: true, // Always true in HASH PIN ONLY mode
        recommendation: staff.pin_hash ? 'Using secure PIN system' : 'Should migrate to secure PIN'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check PIN status' });
    }
  }
);

// DEBUG ROUTE - Set PIN
// DEBUG ROUTE - Set PIN
router.post('/debug/set-pin/:id',
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newPin } = req.body; // ✅ Make sure this line exists
      
      if (!newPin || !/^\d{4}$/.test(newPin)) {
        return res.status(400).json({ error: 'PIN must be 4 digits' });
      }
      
      // HASH PIN ONLY - Always use hashPin
      const hashedPin = await hashPin(newPin); // ✅ Now newPin is properly defined
      console.log('🔐 Using secure hashPin for PIN creation');
      
      const { error } = await supabase
        .from('branch_staff')
        .update({ 
          pin_hash: hashedPin,
          pin: null // Clear legacy pin
        })
        .eq('id', id);
        
      if (error) throw error;
      
      res.json({ 
        status: 'success',
        message: 'PIN updated successfully',
        usedSecureHash: true
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set PIN' });
    }
  }
);

// ====================================================================
// REGULAR ROUTES (WITH ORIGINAL AUTHENTICATION)
// ====================================================================

// Get staff by branch - RBAC PROTECTED
router.get('/branch/:branchId', 
  [validateUUID('branchId'), handleValidationErrors],
  authenticate,
  requireBranchAccess(Permission.STAFF_READ),
  auditLog('READ_BRANCH_STAFF', 'staff'),
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      
      console.log(`👥 Getting staff for branch: ${branchId}`);
      
      // Get user permissions to determine what data to return
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      // Select fields based on permissions
      let selectFields = 'id, first_name, last_name, role, last_active';
      
      if (rbacUtils.hasPermission(userPermissions, Permission.STAFF_READ)) {
        // Full access - include contact info (but never PIN or PIN_HASH)
        selectFields = 'id, first_name, last_name, role, email, phone, last_active, created_at';
      }
      
      const { data, error } = await supabase
        .from('branch_staff')
        .select(selectFields)
        .eq('branch_id', branchId)
        .order('role');
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch staff');
      }
      
      console.log(`✅ Found ${data?.length || 0} staff members`);
      
      res.json({ 
        status: 'success', 
        data: data || [],
        permissions: {
          canEdit: rbacUtils.hasPermission(userPermissions, Permission.STAFF_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.STAFF_DELETE),
          canManagePins: rbacUtils.hasPermission(userPermissions, Permission.STAFF_MANAGE_PINS)
        }
      });
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch staff',
        message: 'An error occurred while retrieving staff data'
      });
    }
  }
);

// Verify staff PIN - RBAC PROTECTED with special rate limiting - FIXED VALIDATION
router.post('/verify-pin',
  authRateLimit, // Strict rate limiting for PIN attempts
  optionalAuth, // Optional auth since this IS the auth method
  auditLog('VERIFY_STAFF_PIN', 'staff'),
  // FIXED: staffId should be in BODY not params
  [
    require('express-validator').body('staffId')
      .isUUID()
      .withMessage('staffId must be a valid UUID'),
    require('express-validator').body('pin')
      .isLength({ min: 4, max: 4 })
      .isNumeric()
      .withMessage('pin must be exactly 4 digits'),
    handleValidationErrors
  ],
  async (req: Request, res: Response) => {
    try {
      const { staffId, pin } = req.body;

      console.log('🔐 PIN verification request for staff:', staffId);

      // Enhanced security logging
      console.log(`🔐 PIN verification attempt:`, {
        staffId,
        pinLength: pin?.length,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Get staff member with both PIN columns for migration support
      const { data: staff, error: staffError } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, role, branch_id, pin, pin_hash, email')
        .eq('id', staffId)
        .single();

      if (staffError || !staff) {
        // Don't reveal if staff exists or not for security
        console.log(`❌ Staff lookup failed for ID: ${staffId}`);
        return res.status(401).json({
          status: 'error',
          error: 'Invalid credentials',
          isValid: false
        });
      }

      // UNIFIED PIN VERIFICATION LOGIC
      // HASH PIN ONLY - Single verification path
      let isValidPin = false;

      // Basic format validation
      const validation = validatePin(pin);
      if (!validation.isValid) {
        return res.status(400).json({
          status: 'error',
          error: validation.error,
          isValid: false
        });
      }

      // ONLY verify against pin_hash - no fallbacks
      if (staff.pin_hash) {
        isValidPin = await verifyPin(pin, staff.pin_hash);
        console.log('🔐 Hash PIN verification:', isValidPin ? 'SUCCESS' : 'FAILED');
      } else {
        // Force migration - no PIN verification without hash
        console.log('❌ Staff has no pin_hash - forcing migration required');
        return res.status(401).json({
          status: 'error',
          error: 'PIN system requires migration. Contact administrator.',
          isValid: false,
          requiresMigration: true
        });
      }

      if (!isValidPin) {
        console.log('❌ Invalid PIN attempt for staff:', staffId);
        
        // Log failed attempt
        await supabase
          .from('staff_actions_log')
          .insert({
            staff_id: staffId,
            action_type: 'FAILED_PIN_ATTEMPT',
            description: `Failed PIN verification from IP: ${req.ip}`,
            created_at: new Date().toISOString()
          });
        
        return res.status(401).json({
          status: 'error',
          error: 'Invalid PIN',
          isValid: false
        });
      }

      // Update last active timestamp
      await supabase
        .from('branch_staff')
        .update({ last_active: new Date().toISOString() })
        .eq('id', staffId);

      // Log successful login
      await supabase
        .from('staff_actions_log')
        .insert({
          staff_id: staffId,
          action_type: 'SUCCESSFUL_LOGIN',
          description: `Staff member logged in from IP: ${req.ip}`,
          created_at: new Date().toISOString()
        });

      console.log('✅ PIN verified successfully for staff:', staffId);

      // Create session token for subsequent requests
      const sessionToken = `staff_${staff.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.json({
        status: 'success',
        isValid: true,
        sessionToken,
        staff: {
          id: staff.id,
          firstName: staff.first_name,
          lastName: staff.last_name,
          role: staff.role,
          branchId: staff.branch_id,
          email: staff.email
        }
      });

    } catch (error) {
      console.error('Error verifying PIN:', error);
      res.status(500).json({
        status: 'error',
        error: 'PIN verification failed',
        isValid: false,
        message: 'An error occurred during authentication'
      });
    }
  }
);

// Get all staff (admin only) - RBAC PROTECTED
router.get('/', 
  authenticate,
  requirePermission(Permission.STAFF_READ),
  auditLog('READ_ALL_STAFF', 'staff'),
  async (req: Request, res: Response) => {
    try {
      console.log('👥 Getting all staff (admin access)');
      
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      // Admin can see more fields
      let selectFields = 'id, first_name, last_name, role, branch_id, last_active';
      
      if (rbacUtils.hasPermission(userPermissions, Permission.STAFF_READ)) {
        selectFields = 'id, first_name, last_name, role, email, phone, branch_id, last_active, created_at, updated_at';
      }
      
      const { data, error } = await supabase
        .from('branch_staff')
        .select(`${selectFields}, branches(name)`)
        .order('role');
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} total staff members`);
      
      res.json({ 
        status: 'success', 
        data: data || [],
        permissions: {
          canEdit: rbacUtils.hasPermission(userPermissions, Permission.STAFF_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.STAFF_DELETE),
          canManagePins: rbacUtils.hasPermission(userPermissions, Permission.STAFF_MANAGE_PINS)
        }
      });
    } catch (error) {
      console.error('Error fetching all staff:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch staff'
      });
    }
  }
);

// Create staff - RBAC PROTECTED
router.post('/',
  strictRateLimit,
  authenticate,
  requirePermission(Permission.STAFF_WRITE),
  commonValidations.createStaff,
  auditLog('CREATE_STAFF', 'staff'),
  async (req: Request, res: Response) => {
    try {
      console.log('👥 Creating new staff member');
      
      const { firstName, lastName, email, phone, role, pin, branchId } = req.body;
      
      // Verify user has access to this branch (unless admin)
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== branchId) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only create staff in your assigned branch'
          });
        }
      }
      
      // Check if branch exists
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', branchId)
        .single();
      
      if (branchError || !branch) {
        return res.status(404).json({
          status: 'error',
          error: 'Branch not found'
        });
      }
      
      // Check if staff with this email already exists
      const { data: existingStaff } = await supabase
        .from('branch_staff')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (existingStaff) {
        return res.status(409).json({
          status: 'error',
          error: 'Staff member with this email already exists'
        });
      }
      
      // Validate PIN
      const pinValidation = basicPinValidation(pin);
      if (!pinValidation.isValid) {
        return res.status(400).json({
          status: 'error',
          error: pinValidation.error
        });
      }
      
      // ALWAYS HASH PIN AND USE PIN_HASH COLUMN
      // HASH PIN ONLY - Always use hashPin
      const hashedPin = await hashPin(pin);
      console.log('🐛 Using secure PIN hashing (HASH PIN ONLY mode)');
      
      // Create staff member - ALWAYS use pin_hash column for new staff
      const staffData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        role: role,
        pin_hash: hashedPin,  // ALWAYS use pin_hash for new staff
        pin: null,            // Clear legacy pin column
        branch_id: branchId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('branch_staff')
        .insert(staffData)
        .select('id, first_name, last_name, email, role, branch_id, created_at')
        .single();
      
      if (error) {
        console.error('Database error creating staff:', error);
        throw new Error('Failed to create staff member');
      }
      
      console.log('✅ Staff member created successfully:', data.id);
      
      // Log the creation
      await supabase
        .from('staff_actions_log')
        .insert({
          staff_id: req.user.id,
          action_type: 'CREATED_STAFF',
          description: `Created new staff member: ${data.first_name} ${data.last_name} (${data.role})`,
          created_at: new Date().toISOString()
        });
      
      res.status(201).json({
        status: 'success',
        data,
        message: 'Staff member created successfully'
      });
      
    } catch (error) {
      console.error('❌ Error creating staff:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to create staff member',
        message: 'An error occurred while creating the staff member'
      });
    }
  }
);

// Update staff - RBAC PROTECTED
router.put('/:id',
  authRateLimit,
  authenticate,
  requirePermission(Permission.STAFF_WRITE),
  [validateUUID('id'), handleValidationErrors],
  auditLog('UPDATE_STAFF', 'staff'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updated_at: new Date().toISOString() };
      
      console.log(`🔄 Updating staff: ${id}`);
      
      // Remove undefined values and protected fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || key === 'id' || key === 'created_at') {
          delete updateData[key];
        }
      });
      
      // Handle PIN updates with enhanced security
      if (updateData.pin) {
        const userPermissions = await rbacUtils.getUserPermissions(req.user);
        
        if (!rbacUtils.hasPermission(userPermissions, Permission.STAFF_MANAGE_PINS)) {
          return res.status(403).json({
            status: 'error',
            error: 'Insufficient permissions',
            message: 'Changing staff PINs requires additional permissions'
          });
        }
        
        const pinValidation = basicPinValidation(updateData.pin);
        if (!pinValidation.isValid) {
          return res.status(400).json({
            status: 'error',
            error: pinValidation.error
          });
        }
        
        // ALWAYS hash PIN and use pin_hash column for updates
        // HASH PIN ONLY - Always use hashPin
        updateData.pin_hash = await hashPin(updateData.pin);
        console.log('🔐 PIN updated using secure hashPin');
        
        // Clear legacy pin column and remove from update data
        updateData.pin = null;
        delete updateData.pin; // Don't include in update
      }
      
      // Get existing staff to verify ownership/access
      const { data: existingStaff, error: fetchError } = await supabase
        .from('branch_staff')
        .select('id, branch_id, email, first_name, last_name')
        .eq('id', id)
        .single();
      
      if (fetchError || !existingStaff) {
        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found'
        });
      }
      
      // Verify branch access
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== existingStaff.branch_id) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only update staff in your assigned branch'
          });
        }
      }
      
      // Update staff
      const { data, error } = await supabase
        .from('branch_staff')
        .update(updateData)
        .eq('id', id)
        .select('id, first_name, last_name, email, role, branch_id, updated_at')
        .single();
      
      if (error) {
        console.error('Database error updating staff:', error);
        throw new Error('Failed to update staff member');
      }
      
      console.log('✅ Staff member updated successfully:', id);
      
      res.json({
        status: 'success',
        data,
        message: 'Staff member updated successfully'
      });
      
    } catch (error) {
      console.error('❌ Error updating staff:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to update staff member',
        message: 'An error occurred while updating the staff member'
      });
    }
  }
);

// Delete staff - RBAC PROTECTED
router.delete('/:id',
  authRateLimit,
  authenticate,
  requirePermission(Permission.STAFF_DELETE),
  [validateUUID('id'), handleValidationErrors],
  auditLog('DELETE_STAFF', 'staff'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ Deleting staff: ${id}`);
      
      // Get existing staff to verify ownership/access
      const { data: existingStaff, error: fetchError } = await supabase
        .from('branch_staff')
        .select('id, branch_id, email, first_name, last_name')
        .eq('id', id)
        .single();
      
      if (fetchError || !existingStaff) {
        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found'
        });
      }
      
      // Verify branch access
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== existingStaff.branch_id) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only delete staff in your assigned branch'
          });
        }
      }
      
      // Delete staff member
      const { error } = await supabase
        .from('branch_staff')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Database error deleting staff:', error);
        throw new Error('Failed to delete staff member');
      }
      
      console.log('✅ Staff member deleted successfully:', id);
      
      // Log the deletion
      await supabase
        .from('staff_actions_log')
        .insert({
          staff_id: req.user.id,
          action_type: 'DELETED_STAFF',
          description: `Deleted staff member: ${existingStaff.first_name} ${existingStaff.last_name}`,
          created_at: new Date().toISOString()
        });
      
      res.json({
        status: 'success',
        message: 'Staff member deleted successfully'
      });
      
    } catch (error) {
      console.error('❌ Error deleting staff:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to delete staff member',
        message: 'An error occurred while deleting the staff member'
      });
    }
  }
);

export default router;