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
router.post('/',
  authRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_WRITE), // Must have write permission
  commonValidations.createMember,
  auditLog('CREATE_MEMBER', 'member'),
  async (req: Request, res: Response) => {
    try {
      console.log('👥 Creating new member');
      
      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        branchId, 
        packageId,
        nationalId, // ← Now properly extracted
        emergencyContact,
        dateOfBirth,
        address 
      } = req.body;
      
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
      
      // Check if package exists - FIXED WITH duration_months
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
      
      // ✅ NEW: Create auth user FIRST (for login credentials)
      const memberPassword = nationalId || email.split('@')[0];
      console.log('🔐 Creating auth user for login...');
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: memberPassword,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'member'
        }
      });
      
      if (authError) {
        console.error('❌ Auth user creation failed:', authError);
        return res.status(400).json({
          status: 'error',
          error: 'Failed to create login account',
          message: authError.message || 'Could not create login credentials'
        });
      }
      
      console.log('✅ Auth user created:', authUser.user.id);
      
      // ✅ ORIGINAL WORKING MEMBER CREATION (exactly as before)
      const memberData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        branch_id: branchId,
        national_id: nationalId || `temp-${Date.now()}`, // ← Now uses actual nationalId
        status: 'active',
        package_type: package_.type || 'individual',
        package_name: package_.name,
        package_price: package_.price,
        start_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        expiry_date: new Date(Date.now() + (package_.duration_months || 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_verified: false, // Keep original value
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('members')
        .insert(memberData)
        .select('id, first_name, last_name, email, status, start_date, expiry_date')
        .single();
      
      if (error) {
        console.error('❌ Database error creating member:', error);
        
        // ⚠️ CLEANUP: Delete auth user if member creation fails
        try {
          await supabase.auth.admin.deleteUser(authUser.user.id);
          console.log('🧹 Cleaned up auth user after member creation failure');
        } catch (cleanupError) {
          console.error('⚠️ Failed to cleanup auth user:', cleanupError);
        }
        
        return res.status(500).json({
          status: 'error',
          error: 'Failed to create member record',
          message: 'Database error occurred'
        });
      }
      
      console.log('✅ Member created successfully:', data.id);
      
      // ✅ NEW: Return with REAL credentials instead of fake ones
      res.status(201).json({
        status: 'success',
        data: {
          ...data,
          // Include real login credentials for frontend
          loginCredentials: {
            email: email,
            password: memberPassword, // Real password that works
            authUserId: authUser.user.id
          }
        },
        message: 'Member and login account created successfully'
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