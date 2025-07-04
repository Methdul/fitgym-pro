// backend/src/routes/members.ts - COMPLETE ERROR-FREE VERSION
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
  auditLog('READ_MEMBERS', 'member'),
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch members',
        message: 'An error occurred while retrieving member data',
        details: errorMessage
      });
    }
  }
);

// Create member - RBAC PROTECTED + PIN VERIFICATION + AUTH CREATION
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
      console.log('🚨 MEMBER CREATION ROUTE CALLED');
      console.log('🚨 REQUEST BODY:', JSON.stringify(req.body, null, 2));
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
        .select('id, name, type, price, duration_months, is_active')
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
      
        // FIXED: Handle both new and existing members with proper date calculations
        const { 
          startDate, 
          expiryDate, 
          duration = 1, 
          nationalId
        } = req.body;

        console.log('🔍 MEMBER CREATION - EXTRACTED VALUES:', {
          startDate,
          expiryDate, 
          duration,
          nationalId,
          firstName,
          lastName,
          email
        });

        // 🔥 CREATE AUTH ACCOUNT FOR ALL NEW MEMBERS
        let authUserId = null;
        if (nationalId) {
          console.log('🔐 Creating auth account for new member...');
          console.log(`📧 Email: ${email}`);
          console.log(`🔑 Password: ${nationalId}`);
          
          try {
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: email,
              password: nationalId,
              email_confirm: true,
              user_metadata: {
                first_name: firstName,
                last_name: lastName,
                role: 'member',
                created_by: 'staff'
              }
            });

            if (!authError && authData?.user) {
              authUserId = authData.user.id;
              console.log('✅ Auth account created successfully:', authUserId);
            } else {
              console.error('❌ Auth creation failed:', authError?.message || 'Unknown auth error');
            }
          } catch (authCreateError) {
            const authErrorMsg = authCreateError instanceof Error ? authCreateError.message : 'Unknown auth creation error';
            console.error('❌ Auth creation error:', authErrorMsg);
          }
        } else {
          console.log('⚠️ No nationalId provided, skipping auth creation');
        }

        // Calculate dates based on whether it's a new or existing member
        let memberStartDate: string, memberExpiryDate: string, memberStatus: string;

        if (startDate) {
          // Existing member: use provided start date (last payment date)
          memberStartDate = startDate;
          if (expiryDate) {
            memberExpiryDate = expiryDate;
          } else {
            // Calculate expiry from start date + package duration
            const start = new Date(startDate);
            start.setMonth(start.getMonth() + (duration || package_.duration_months || 1));
            memberExpiryDate = start.toISOString().split('T')[0];
          }
        } else {
          // New member: use current date
          memberStartDate = new Date().toISOString().split('T')[0];
          const start = new Date();
          start.setMonth(start.getMonth() + (duration || package_.duration_months || 1));
          memberExpiryDate = start.toISOString().split('T')[0];
        }

        // Calculate status based on expiry date
        const now = new Date();
        const expiryDateObj = new Date(memberExpiryDate);
        memberStatus = expiryDateObj > now ? 'active' : 'expired';

        console.log('📅 Date calculations:', {
          startDate: memberStartDate,
          expiryDate: memberExpiryDate,
          status: memberStatus,
          authUserId: authUserId || 'NOT_CREATED'
        });

        const memberData = {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          branch_id: branchId,
          national_id: nationalId || phone || `temp-${Date.now()}`,
          user_id: authUserId, // 🔥 LINK TO AUTH ACCOUNT
          status: memberStatus,
          package_type: package_.type || 'individual',
          package_name: package_.name,
          package_price: package_.price,
          start_date: memberStartDate,
          expiry_date: memberExpiryDate,
          is_verified: false,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({
        status: 'error',
        error: 'Failed to create member',
        message: 'An error occurred while creating the member',
        details: errorMessage
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({
        status: 'error',
        error: 'Failed to update member',
        message: 'An error occurred while updating the member',
        details: errorMessage
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch member',
        message: 'An error occurred while retrieving member data',
        details: errorMessage
      });
    }
  }
);

// Delete member - RBAC PROTECTED
router.delete('/:id',
  authRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_DELETE),
  [validateUUID('id'), handleValidationErrors],
  auditLog('DELETE_MEMBER', 'member'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ Deleting member: ${id}`);
      
      // Get existing member to verify ownership/access and for audit trail
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
      
      // Delete member
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Database error deleting member:', error);
        throw new Error('Failed to delete member');
      }
      
      console.log('✅ Member deleted successfully');
      
      res.json({
        status: 'success',
        message: 'Member deleted successfully',
        data: {
          id: existingMember.id,
          name: `${existingMember.first_name} ${existingMember.last_name}`,
          email: existingMember.email
        }
      });
      
    } catch (error) {
      console.error('Error deleting member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({
        status: 'error',
        error: 'Failed to delete member',
        message: 'An error occurred while deleting the member',
        details: errorMessage
      });
    }
  }
);

// Export both ways to work with dynamic route loading
export { router as memberRoutes };
export default router;