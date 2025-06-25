// backend/src/routes/staff.ts - COMPLETE WITH RBAC PROTECTION
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

// Import security utilities if available (graceful fallback)
let hashPin: any = null;
let verifyPin: any = null;
let validatePin: any = null;
let pinAttemptTracker: any = null;

try {
  const securityModule = require('../lib/security');
  hashPin = securityModule.hashPin;
  verifyPin = securityModule.verifyPin;
  validatePin = securityModule.validatePin;
  pinAttemptTracker = securityModule.pinAttemptTracker;
  console.log('✅ Security module loaded - using enhanced PIN security');
} catch (error) {
  console.log('⚠️ Security module not found - using legacy PIN handling');
}

// Helper function to check if new security features are available
const hasSecurityFeatures = () => {
  return hashPin && verifyPin && validatePin && pinAttemptTracker;
};

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
        // Full access - include contact info (but never PIN)
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

// Verify staff PIN - RBAC PROTECTED with special rate limiting
router.post('/verify-pin',
  authRateLimit, // Strict rate limiting for PIN attempts
  optionalAuth, // Optional auth since this IS the auth method
  auditLog('VERIFY_STAFF_PIN', 'staff'),
  commonValidations.verifyStaffPin,
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

      // Get staff member
      const { data: staff, error: staffError } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, role, branch_id, pin, email')
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

      // Use enhanced PIN verification if available, otherwise basic comparison
      let isValidPin = false;
      
      if (hasSecurityFeatures()) {
        isValidPin = await verifyPin(pin, staff.pin);
      } else {
        // Basic PIN validation for development/fallback
        const validation = basicPinValidation(pin);
        if (!validation.isValid) {
          return res.status(400).json({
            status: 'error',
            error: validation.error,
            isValid: false
          });
        }
        isValidPin = staff.pin === pin;
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
      // Simple token generation (replace with your sessionManager if needed)
      const sessionToken = `staff_${staff.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Alternative: Use your existing sessionManager if it has different signature
      // const sessionToken = sessionManager.createSession(staff.id, staff.branch_id, staff.role);

      res.json({
        status: 'success',
        isValid: true,
        sessionToken, // For frontend to use in subsequent requests
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
      
      // Hash PIN if security features available
      let hashedPin = pin;
      if (hasSecurityFeatures()) {
        hashedPin = await hashPin(pin);
      }
      
      // Create staff member
      const staffData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        role: role,
        pin: hashedPin,
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
        
        // Hash PIN if security features available
        if (hasSecurityFeatures()) {
          updateData.pin = await hashPin(updateData.pin);
        }
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
        .select('id, first_name, last_name, email, role, updated_at')
        .single();
      
      if (error) {
        console.error('Database error updating staff:', error);
        throw new Error('Failed to update staff member');
      }
      
      console.log('✅ Staff updated successfully');
      
      res.json({
        status: 'success',
        data,
        message: 'Staff member updated successfully'
      });
      
    } catch (error) {
      console.error('Error updating staff:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to update staff member',
        message: 'An error occurred while updating the staff member'
      });
    }
  }
);

// Delete staff - RBAC PROTECTED (High Security)
router.delete('/:id',
  strictRateLimit,
  authenticate,
  requirePermission(Permission.STAFF_DELETE),
  [validateUUID('id'), handleValidationErrors],
  auditLog('DELETE_STAFF', 'staff'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ Deleting staff: ${id}`);
      
      // Verify staff exists and get info
      const { data: staff, error: fetchError } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, branch_id, email, role')
        .eq('id', id)
        .single();
      
      if (fetchError || !staff) {
        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found'
        });
      }
      
      // Prevent self-deletion
      if (req.user.id === id) {
        return res.status(400).json({
          status: 'error',
          error: 'Cannot delete your own account',
          message: 'Staff members cannot delete their own accounts'
        });
      }
      
      // Verify branch access
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== staff.branch_id) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only delete staff in your assigned branch'
          });
        }
      }
      
      // Check if this is the last manager in the branch
      if (staff.role === 'manager') {
        const { data: otherManagers, error: managerError } = await supabase
          .from('branch_staff')
          .select('id')
          .eq('branch_id', staff.branch_id)
          .eq('role', 'manager')
          .neq('id', id);
        
        if (managerError) {
          console.error('Error checking managers:', managerError);
          throw new Error('Failed to verify manager requirements');
        }
        
        if (!otherManagers || otherManagers.length === 0) {
          return res.status(409).json({
            status: 'error',
            error: 'Cannot delete last manager',
            message: 'Each branch must have at least one manager'
          });
        }
      }
      
      // Soft delete (deactivate instead of hard delete)
      const { error } = await supabase
        .from('branch_staff')
        .update({ 
          email: `deleted_${Date.now()}_${staff.email}`, // Prevent email conflicts
          pin: '0000', // Invalidate PIN
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Database error deleting staff:', error);
        throw new Error('Failed to delete staff member');
      }
      
      // Log the deletion
      await supabase
        .from('staff_actions_log')
        .insert({
          staff_id: req.user.id,
          action_type: 'DELETED_STAFF',
          description: `Deleted staff member: ${staff.first_name} ${staff.last_name} (${staff.role})`,
          created_at: new Date().toISOString()
        });
      
      console.log('✅ Staff deleted successfully');
      
      res.json({
        status: 'success',
        message: 'Staff member deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting staff:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to delete staff member',
        message: 'An error occurred while deleting the staff member'
      });
    }
  }
);

// Get single staff member - RBAC PROTECTED
router.get('/:id',
  authenticate,
  requirePermission(Permission.STAFF_READ),
  [validateUUID('id'), handleValidationErrors],
  auditLog('READ_STAFF', 'staff'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`👥 Getting staff: ${id}`);
      
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      let selectFields = 'id, first_name, last_name, role, last_active';
      
      if (rbacUtils.hasPermission(userPermissions, Permission.STAFF_READ)) {
        selectFields = 'id, first_name, last_name, role, email, phone, branch_id, last_active, created_at, updated_at';
      }
      
      const { data, error } = await supabase
        .from('branch_staff')
        .select(`${selectFields}, branches(name)`)
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found'
        });
      }
      
      console.log('✅ Staff found');
      
      res.json({
        status: 'success',
        data,
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
        error: 'Failed to fetch staff member',
        message: 'An error occurred while retrieving staff data'
      });
    }
  }
);

// Get user's permissions for this module (for frontend UI)
router.get('/permissions', 
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      res.json({
        status: 'success',
        permissions: {
          canRead: rbacUtils.hasPermission(userPermissions, Permission.STAFF_READ),
          canWrite: rbacUtils.hasPermission(userPermissions, Permission.STAFF_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.STAFF_DELETE),
          canManagePins: rbacUtils.hasPermission(userPermissions, Permission.STAFF_MANAGE_PINS),
          canAccessAllBranches: rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)
        }
      });
    } catch (error) {
      console.error('Error getting permissions:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to get permissions'
      });
    }
  }
);

export { router as staffRoutes };