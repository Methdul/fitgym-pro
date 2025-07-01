// backend/src/routes/members.ts - MINIMAL FIX: Keep Original + Add Auth
import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { 
  commonValidations, 
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
import { verifyPin } from '../lib/security';


const router = express.Router();

// Get members by branch - RBAC PROTECTED
router.get('/branch/:branchId',
  authRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_READ),
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      const limitNum = Math.min(Number(limit) || 100, 1000); // Cap at 1000
      const offsetNum = Number(offset) || 0;
      
      // Verify user has access to this branch
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      // Check branch access (unless user is admin)
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== branchId) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only access members in your assigned branch'
          });
        }
      }
      
      console.log(`📊 Fetching up to ${limitNum} members for branch: ${branchId}`);
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('branch_id', branchId)
        .range(offsetNum, offsetNum + limitNum - 1)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch members');
      }
      
      console.log(`✅ Retrieved ${data?.length || 0} members`);
      
      res.json({ 
        status: 'success', 
        data: data || [],
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: data?.length || 0
        },
        permissions: {
          canEdit: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_DELETE),
          canViewContact: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_READ)
        }
      });
    } catch (error) {
      console.error('Error fetching members:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch members',
        message: 'An error occurred while retrieving member data'
      });
    }
  }
);

// Create member - ORIGINAL WORKING LOGIC + AUTH CREATION
// Create member - RBAC PROTECTED + PIN VERIFICATION
router.post('/',
  authRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_WRITE), // Must have write permission
  // ADD PIN VERIFICATION VALIDATION
  [
    require('express-validator').body('staffId')
      .isUUID()
      .withMessage('staffId must be a valid UUID'),
    require('express-validator').body('staffPin')
      .isLength({ min: 4, max: 4 })
      .isNumeric()
      .withMessage('staffPin must be exactly 4 digits'),
    handleValidationErrors
  ],
  commonValidations.createMember,
  auditLog('CREATE_MEMBER', 'member'),
  async (req: Request, res: Response) => {
    try {
      console.log('👥 Creating new member with PIN verification');
      
      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        branchId, 
        packageId,
        emergencyContact,
        dateOfBirth,
        address,
        staffId,        // PIN verification fields
        staffPin        // PIN verification fields
      } = req.body;
      
      // ✅ ADD PIN VERIFICATION BEFORE ANYTHING ELSE
      console.log('🔐 Verifying staff PIN for member creation');
      
      // Get staff member
      const { data: staff, error: staffError } = await supabase
        .from('branch_staff')
        .select('id, first_name, last_name, pin_hash, branch_id')
        .eq('id', staffId)
        .single();

      if (staffError || !staff) {
        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found'
        });
      }

      // Verify staff belongs to the same branch
      if (staff.branch_id !== branchId) {
        return res.status(403).json({
          status: 'error',
          error: 'Staff member not authorized for this branch'
        });
      }

      // HASH PIN ONLY - Verify PIN
      if (!staff.pin_hash) {
        return res.status(401).json({
          status: 'error',
          error: 'Staff PIN requires migration. Contact administrator.',
          requiresMigration: true
        });
      }

      const { verifyPin } = require('../lib/security');
      const isPinValid = await verifyPin(staffPin, staff.pin_hash);
      if (!isPinValid) {
        console.log('❌ Invalid PIN attempt for member creation');
        return res.status(401).json({
          status: 'error',
          error: 'Invalid PIN'
        });
      }

      console.log('✅ PIN verified successfully for member creation');
      
      // ✅ CONTINUE WITH EXISTING MEMBER CREATION LOGIC
      
      // Verify user has access to this branch
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      // Check branch access (unless user is admin)
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== branchId) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only create members in your assigned branch'
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
          error: 'Branch not found',
          message: 'The specified branch does not exist'
        });
      }
      
      // Check if package exists
      const { data: package_, error: packageError } = await supabase
        .from('packages')
        .select('id, name, type, price, is_active')
        .eq('id', packageId)
        .single();
      
      if (packageError || !package_) {
        return res.status(404).json({
          status: 'error',
          error: 'Package not found',
          message: 'The specified package does not exist'
        });
      }
      
      if (!package_.is_active) {
        return res.status(400).json({
          status: 'error',
          error: 'Package inactive',
          message: 'The selected package is not currently available'
        });
      }
      
      // Check for existing member
      const { data: existingMember } = await supabase
        .from('members')
        .select('id, email')
        .eq('email', email)
        .eq('branch_id', branchId)
        .single();
      
      if (existingMember) {
        return res.status(409).json({
          status: 'error',
          error: 'Member exists',
          message: 'A member with this email already exists in this branch'
        });
      }
      
      // Create member
      const memberData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        branch_id: branchId,
        national_id: phone || `temp-${Date.now()}`, // Temp solution for required field
        status: 'active',
        package_type: package_.type || 'individual',
        package_name: package_.name,
        package_price: package_.price,
        start_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days later
        is_verified: false,
        processed_by_staff_id: staffId, // Record which staff created this member
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('members')
        .insert(memberData)
        .select('id, first_name, last_name, email, status, start_date, expiry_date')
        .single();
      
      if (error) {
        console.error('Database error creating member:', error);
        throw new Error('Failed to create member');
      }
      
      console.log('✅ Member created successfully:', data.id);
      
      res.status(201).json({
        status: 'success',
        data,
        message: 'Member created successfully'
      });
      
    } catch (error) {
      console.error('❌ Error creating member:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to create member',
        message: 'An error occurred while creating the member'
      });
    }
  }
);

// Update member - RBAC PROTECTED
router.put('/:id',
  authRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_WRITE),
  commonValidations.updateMember,
  auditLog('UPDATE_MEMBER', 'member'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updated_at: new Date().toISOString() };
      
      console.log(`🔄 Updating member: ${id}`);
      
      // Remove undefined values and sensitive fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || key === 'id' || key === 'created_at') {
          delete updateData[key];
        }
      });
      
      // Get existing member to verify ownership/access
      const { data: existingMember, error: fetchError } = await supabase
        .from('members')
        .select('id, branch_id, email, first_name, last_name')
        .eq('id', id)
        .single();
      
      if (fetchError || !existingMember) {
        return res.status(404).json({
          status: 'error',
          error: 'Member not found'
        });
      }
      
      // Verify branch access
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== existingMember.branch_id) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only update members in your assigned branch'
          });
        }
      }
      
      // Add updated_by field
      updateData.updated_by = req.user.id;
      
      // Update member
      const { data, error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', id)
        .select('id, first_name, last_name, email, status, updated_at')
        .single();
      
      if (error) {
        console.error('Database error updating member:', error);
        throw new Error('Failed to update member');
      }
      
      console.log('✅ Member updated successfully');
      
      res.json({
        status: 'success',
        data,
        message: 'Member updated successfully'
      });
      
    } catch (error) {
      console.error('Error updating member:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to update member',
        message: 'An error occurred while updating the member'
      });
    }
  }
);

// Get member by ID - RBAC PROTECTED
router.get('/:id',
  authRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_READ),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return res.status(404).json({
          status: 'error',
          error: 'Member not found'
        });
      }
      
      // Verify branch access
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== data.branch_id) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only access members in your assigned branch'
          });
        }
      }
      
      res.json({
        status: 'success',
        data
      });
      
    } catch (error) {
      console.error('Error fetching member:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch member',
        message: 'An error occurred while retrieving member data'
      });
    }
  }
);

// Delete member - RBAC PROTECTED
router.delete('/:id',
  authRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_DELETE),
  auditLog('DELETE_MEMBER', 'member'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get existing member to verify ownership/access
      const { data: existingMember, error: fetchError } = await supabase
        .from('members')
        .select('id, branch_id, email, first_name, last_name')
        .eq('id', id)
        .single();
      
      if (fetchError || !existingMember) {
        return res.status(404).json({
          status: 'error',
          error: 'Member not found'
        });
      }
      
      // Verify branch access
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== existingMember.branch_id) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only delete members in your assigned branch'
          });
        }
      }
      
      // Delete member record
      const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Database error deleting member:', deleteError);
        throw new Error('Failed to delete member');
      }
      
      console.log('✅ Member deleted successfully');
      
      res.json({
        status: 'success',
        message: 'Member deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting member:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to delete member',
        message: 'An error occurred while deleting the member'
      });
    }
  }
);

export { router as memberRoutes };