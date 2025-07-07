// backend/src/routes/packages.ts - COMPLETE WITH RBAC PROTECTION
import express, { Request, Response } from 'express';
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
  console.log(`📦 Packages Route: ${req.method} ${req.path}`);
  next();
});

// Get packages by branch - RBAC PROTECTED
router.get('/branch/:branchId', 
  [validateUUID('branchId'), handleValidationErrors],
  authenticate,
  requireBranchAccess(Permission.PACKAGES_READ),
  auditLog('READ_BRANCH_PACKAGES', 'package'),
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      
      console.log(`📦 Getting packages for branch: ${branchId}`);
      
      // Get user permissions to determine what data to return
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      // Select fields based on permissions
      let selectFields = 'id, name, type, duration_months, duration_type, duration_value, max_members, features, is_active';

      if (rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)) {
        // Include pricing info for users with pricing permission
        selectFields = 'id, name, type, price, duration_months, duration_type, duration_value, max_members, features, is_active, created_at, updated_at';
      }

      
      const { data, error } = await supabase
        .from('packages')
        .select(selectFields)
        .eq('branch_id', branchId) 
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch packages');
      }
      
      console.log(`✅ Found ${data?.length || 0} packages for branch`);
      
      res.json({ 
        status: 'success', 
        data: data || [],
        permissions: {
          canEdit: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_DELETE),
          canViewPricing: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)
        }
      });
    } catch (error) {
      console.error('Error fetching branch packages:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch branch packages',
        message: 'An error occurred while retrieving package data'
      });
    }
  }
);

// Get all active packages for a branch (public with optional auth)
router.get('/branch/:branchId/active', 
  [validateUUID('branchId'), handleValidationErrors],
  optionalAuth,
  auditLog('READ_ACTIVE_PACKAGES', 'package'),
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      
      console.log(`📦 Getting active packages for branch: ${branchId}`);
      
      // Public endpoint - limited data
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, type, price, duration_months, duration_type, duration_value, max_members, features, is_active')
        .eq('branch_id', branchId) 
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch active packages');
      }
      
      console.log(`✅ Found ${data?.length || 0} active packages for branch`);
      
      res.json({ 
        status: 'success', 
        data: data || []
      });
    } catch (error) {
      console.error('Error fetching active branch packages:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch active branch packages',
        message: 'An error occurred while retrieving active packages'
      });
    }
  }
);

// Get all packages (admin only) - RBAC PROTECTED
router.get('/', 
  authenticate,
  requirePermission(Permission.PACKAGES_READ),
  auditLog('READ_ALL_PACKAGES', 'package'),
  async (req: Request, res: Response) => {
    try {
      console.log('📦 Getting all packages (admin)');
      
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      // Select fields based on permissions
      let selectFields = 'id, name, type, duration_months, max_members, features, is_active, created_at';

      
      if (rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)) {
        selectFields = 'id, name, type, price, duration_months, max_members, features, is_active, created_at, updated_at';
      }
      
      const { data, error } = await supabase
        .from('packages')
        .select(selectFields)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} total packages`);
      
      res.json({ 
        status: 'success', 
        data: data || [],
        permissions: {
          canEdit: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_DELETE),
          canViewPricing: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)
        }
      });
    } catch (error) {
      console.error('Error fetching all packages:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch packages',
        message: 'An error occurred while retrieving packages'
      });
    }
  }
);

// Get single package - RBAC PROTECTED
router.get('/:id', 
  [validateUUID('id'), handleValidationErrors],
  authenticate,
  requirePermission(Permission.PACKAGES_READ),
  auditLog('READ_PACKAGE', 'package'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      console.log(`📦 Getting package: ${id}`);

      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      let selectFields = 'id, name, type, duration_months, max_members, features, is_active';
      
      if (rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)) {
        selectFields = 'id, name, type, price, duration_months, max_members, features, is_active, created_at, updated_at';
      }

      const { data, error } = await supabase
        .from('packages')
        .select(selectFields)
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({
          status: 'error',
          error: 'Package not found'
        });
      }

      console.log('✅ Package found');

      res.json({
        status: 'success',
        data,
        permissions: {
          canEdit: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_DELETE)
        }
      });

    } catch (error) {
      console.error('Error fetching package:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch package',
        message: 'An error occurred while retrieving the package'
      });
    }
  }
);

// Create package - RBAC PROTECTED
router.post('/',
  strictRateLimit,
  authenticate,
  requirePermission(Permission.PACKAGES_WRITE),
  commonValidations.createPackage,
  auditLog('CREATE_PACKAGE', 'package'),
  async (req: Request, res: Response) => {
    try {
      console.log('📦 Creating new package');
      
      const { 
        name, 
        type, 
        price, 
        duration_months,
        duration_type,
        duration_value,
        max_members,
        features, 
        is_active,
        branch_id
      } = req.body;
      
      // Check if user has pricing permission to set price
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      if (!rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)) {
        return res.status(403).json({
          status: 'error',
          error: 'Insufficient permissions',
          message: 'Setting package pricing requires additional permissions'
        });
      }
      
      // Check for duplicate package name
      const { data: existingPackage } = await supabase
        .from('packages')
        .select('id, name')
        .eq('name', name)
        .single();

      if (existingPackage) {
        return res.status(409).json({
          status: 'error',
          error: 'Package with this name already exists'
        });
      }

      // Prepare package data
      const packageData = {
        name: name.trim(),
        type,
        price: parseFloat(price),
        duration_months: parseInt(duration_months),
        duration_type: duration_type || 'months',
        duration_value: parseInt(duration_value) || 1,
        max_members: parseInt(max_members),
        features: Array.isArray(features) ? features : ['Gym Access'],
        is_active: Boolean(is_active),
        branch_id: branch_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('💾 Creating package with data:', packageData);

      // Create package
      const { data, error } = await supabase
        .from('packages')
        .insert(packageData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error('Failed to create package');
      }

      console.log('✅ Package created successfully:', data.id);

      res.status(201).json({
        status: 'success',
        data,
        message: 'Package created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating package:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to create package',
        message: 'An error occurred while creating the package'
      });
    }
  }
);

// Update package - RBAC PROTECTED
router.put('/:id',
  authRateLimit,
  authenticate,
  requirePermission(Permission.PACKAGES_WRITE),
  [validateUUID('id'), handleValidationErrors],
  auditLog('UPDATE_PACKAGE', 'package'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updated_at: new Date().toISOString() };
      
      console.log(`🔄 Updating package: ${id}`);
      
      // Check if user has pricing permission for price changes
      const userPermissions = await rbacUtils.getUserPermissions(req.user);
      
      if (updateData.price && !rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)) {
        return res.status(403).json({
          status: 'error',
          error: 'Insufficient permissions',
          message: 'Updating package pricing requires additional permissions'
        });
      }
      
      // Remove undefined values and protected fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || key === 'id' || key === 'created_at') {
          delete updateData[key];
        }
      });
      
      // Verify package exists
      const { data: existingPackage, error: fetchError } = await supabase
        .from('packages')
        .select('id, name')
        .eq('id', id)
        .single();
      
      if (fetchError || !existingPackage) {
        return res.status(404).json({
          status: 'error',
          error: 'Package not found'
        });
      }
      
      // Update package
      const { data, error } = await supabase
        .from('packages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Database error updating package:', error);
        throw new Error('Failed to update package');
      }
      
      console.log('✅ Package updated successfully');
      
      res.json({
        status: 'success',
        data,
        message: 'Package updated successfully'
      });
      
    } catch (error) {
      console.error('Error updating package:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to update package',
        message: 'An error occurred while updating the package'
      });
    }
  }
);

// Delete package - RBAC PROTECTED (High Security)
router.delete('/:id',
  strictRateLimit,
  authenticate,
  requirePermission(Permission.PACKAGES_DELETE),
  [validateUUID('id'), handleValidationErrors],
  auditLog('DELETE_PACKAGE', 'package'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ Deleting package: ${id}`);
      
      // Check if package has active members
      const { data: activeMembers, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('package_name', (await supabase.from('packages').select('name').eq('id', id).single()).data?.name)
        .eq('status', 'active');
      
      if (memberError) {
        console.error('Error checking active members:', memberError);
        throw new Error('Failed to check package usage');
      }
      
      if (activeMembers && activeMembers.length > 0) {
        return res.status(409).json({
          status: 'error',
          error: 'Cannot delete package with active members',
          message: `This package has ${activeMembers.length} active members`
        });
      }
      
      // Soft delete (deactivate instead of hard delete)
      const { error } = await supabase
        .from('packages')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Database error deleting package:', error);
        throw new Error('Failed to delete package');
      }
      
      console.log('✅ Package deleted (deactivated) successfully');
      
      res.json({
        status: 'success',
        message: 'Package deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting package:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to delete package',
        message: 'An error occurred while deleting the package'
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
          canRead: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_READ),
          canWrite: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_WRITE),
          canDelete: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_DELETE),
          canViewPricing: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)
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

export { router as packageRoutes };