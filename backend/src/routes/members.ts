// backend/src/routes/members.ts - WITH RBAC PROTECTION
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
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

// Debug middleware
router.use((req: Request, res: Response, next) => {
  console.log(`👥 Members Route: ${req.method} ${req.path}`);
  next();
});

// Get members by branch - RBAC PROTECTED
router.get('/branch/:branchId', 
  strictRateLimit,
  commonValidations.validateBranchId,
  authenticate, // Must be authenticated
  requireBranchAccess(Permission.MEMBERS_READ), // Must have read permission for this branch
  auditLog('READ_MEMBERS', 'member'), // Log the action
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);
      
      console.log(`📋 Getting members for branch: ${branchId} (limit: ${limitNum}, offset: ${offsetNum})`);
      
      // Get user permissions to determine what data to return
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      // Select fields based on permissions (CORRECTED for your schema)
      let selectFields = 'id, first_name, last_name, status, start_date, expiry_date, created_at';
      
      if (rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_READ)) {
        // Full access - include contact info (CORRECTED field names)
        selectFields = 'id, first_name, last_name, email, phone, status, package_type, package_name, package_price, start_date, expiry_date, created_at';
      }
      
      const { data, error } = await supabase
        .from('members')
        .select(selectFields)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .range(offsetNum, offsetNum + limitNum - 1);
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch members');
      }
      
      console.log(`✅ Found ${data?.length || 0} members`);
      
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

// Create member - RBAC PROTECTED
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
      
      // Check if package exists (CORRECTED - no branch_id in packages table)
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
      
      // Create member (CORRECTED for your schema)
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

// Delete member - RBAC PROTECTED (High Security)
router.delete('/:id',
  strictRateLimit,
  authenticate,
  requirePermission(Permission.MEMBERS_DELETE), // Only users with delete permission
  [validateUUID('id'), handleValidationErrors],
  auditLog('DELETE_MEMBER', 'member'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ Deleting member: ${id}`);
      
      // Verify member exists and get branch info
      const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('id, first_name, last_name, branch_id, email')
        .eq('id', id)
        .single();
      
      if (fetchError || !member) {
        return res.status(404).json({
          status: 'error',
          error: 'Member not found'
        });
      }
      
      // Verify branch access
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        if (req.user.sessionType === 'branch_staff' && req.user.branchId !== member.branch_id) {
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only delete members in your assigned branch'
          });
        }
      }
      
      // Soft delete (update status instead of hard delete)
      const { error } = await supabase
        .from('members')
        .update({ 
          status: 'suspended',
          updated_at: new Date().toISOString(),
          deleted_by: req.user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Database error deleting member:', error);
        throw new Error('Failed to delete member');
      }
      
      console.log('✅ Member deleted (suspended) successfully');
      
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

// Member search - RBAC PROTECTED
router.post('/search',
  apiRateLimit,
  authenticate,
  requireBranchAccess(Permission.MEMBERS_SEARCH),
  [
    validateUUID('branchId').exists().withMessage('branchId is required'),
    body('searchTerm').optional().isLength({ max: 100 }).trim(),
    body('statusFilter').optional().isIn(['all', 'active', 'expired', 'suspended']),
    handleValidationErrors
  ],
  auditLog('SEARCH_MEMBERS', 'member'),
  async (req: Request, res: Response) => {
    try {
      const { branchId, searchTerm, statusFilter = 'all' } = req.body;
      
      console.log(`🔍 Searching members in branch: ${branchId}`);
      
      // Get user permissions to determine what data to return
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      let selectFields = 'id, first_name, last_name, status, expiry_date';
      if (rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_READ)) {
        selectFields = 'id, first_name, last_name, email, phone, status, expiry_date';
      }
      
      let query = supabase
        .from('members')
        .select(selectFields)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Add status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Add search term if provided
      if (searchTerm && searchTerm.trim()) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Database error searching members:', error);
        throw new Error('Search failed');
      }
      
      console.log(`✅ Found ${data?.length || 0} members`);
      
      res.json({
        status: 'success',
        data: data || [],
        filtered_count: data?.length || 0,
        search_term: searchTerm,
        status_filter: statusFilter,
        permissions: {
          canEdit: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_DELETE)
        }
      });
      
    } catch (error) {
      console.error('Error searching members:', error);
      res.status(500).json({
        status: 'error',
        error: 'Search failed',
        message: 'An error occurred while searching members'
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
          canRead: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_READ),
          canWrite: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_DELETE),
          canSearch: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_SEARCH),
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

export { router as memberRoutes };