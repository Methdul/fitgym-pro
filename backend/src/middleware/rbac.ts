// backend/src/middleware/rbac.ts - Advanced Role-Based Access Control
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

// Define all possible permissions in the system
export enum Permission {
  // Member Management
  MEMBERS_READ = 'members:read',
  MEMBERS_WRITE = 'members:write',
  MEMBERS_DELETE = 'members:delete',
  MEMBERS_SEARCH = 'members:search',
  
  // Staff Management  
  STAFF_READ = 'staff:read',
  STAFF_WRITE = 'staff:write',
  STAFF_DELETE = 'staff:delete',
  STAFF_MANAGE_PINS = 'staff:manage_pins',
  
  // Package Management
  PACKAGES_READ = 'packages:read',
  PACKAGES_WRITE = 'packages:write',
  PACKAGES_DELETE = 'packages:delete',
  PACKAGES_PRICING = 'packages:pricing',
  
  // Branch Management
  BRANCHES_READ = 'branches:read',
  BRANCHES_WRITE = 'branches:write',
  BRANCHES_DELETE = 'branches:delete',
  BRANCHES_MANAGE_ALL = 'branches:manage_all',
  
  // Analytics & Reports
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_FINANCIAL = 'analytics:financial',
  ANALYTICS_EXPORT = 'analytics:export',
  
  // System Administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_AUDIT_LOGS = 'system:audit_logs',
  SYSTEM_BACKUP = 'system:backup',
  
  // Renewals & Payments
  RENEWALS_PROCESS = 'renewals:process',
  RENEWALS_READ = 'renewals:read',
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_PROCESS = 'payments:process'
}

// Define role hierarchies and their permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Super Admin - Can do everything
  'super_admin': Object.values(Permission),
  
  // Branch Manager - Full control of their branch
  'manager': [
    Permission.MEMBERS_READ,
    Permission.MEMBERS_WRITE,
    Permission.MEMBERS_DELETE,
    Permission.MEMBERS_SEARCH,
    Permission.STAFF_READ,
    Permission.STAFF_WRITE,
    Permission.STAFF_MANAGE_PINS,
    Permission.PACKAGES_READ,
    Permission.PACKAGES_WRITE,
    Permission.PACKAGES_PRICING,
    Permission.PACKAGES_DELETE,
    Permission.BRANCHES_READ,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_FINANCIAL,
    Permission.RENEWALS_PROCESS,
    Permission.RENEWALS_READ,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_PROCESS
  ],
  
  // Senior Staff - Most operations except staff management
  'senior_staff': [
    Permission.MEMBERS_READ,
    Permission.MEMBERS_WRITE,
    Permission.MEMBERS_SEARCH,
    Permission.STAFF_READ,
    Permission.PACKAGES_READ,
    Permission.PACKAGES_WRITE,
    Permission.PACKAGES_PRICING,
    Permission.BRANCHES_READ,
    Permission.PACKAGES_DELETE,
    Permission.ANALYTICS_READ,
    Permission.RENEWALS_PROCESS,
    Permission.RENEWALS_READ,
    Permission.PAYMENTS_READ
  ],
  
  // Associate Staff - Basic operations only
  'associate': [
    Permission.MEMBERS_READ,
    Permission.MEMBERS_SEARCH,
    Permission.STAFF_READ,
    Permission.PACKAGES_READ,
    Permission.PACKAGES_WRITE,
    Permission.PACKAGES_PRICING,
    Permission.PACKAGES_DELETE,
    Permission.BRANCHES_READ,
    Permission.RENEWALS_READ
  ],
  
  // Regular Member - Very limited access
  'member': [
    Permission.BRANCHES_READ,
    Permission.PACKAGES_READ
  ]
};

// Helper function to get user permissions
export const getUserPermissions = async (user: any): Promise<Permission[]> => {
  try {
    console.log('🔍 Getting permissions for user:', { id: user.id, role: user.role, sessionType: user.sessionType });
    
    // Handle development bypass users
    if (user.isDevelopmentBypass && user.role) {
      console.log('🚨 Development bypass - using role:', user.role);
      const permissions = ROLE_PERMISSIONS[user.role] || [];
      console.log(`✅ Dev bypass permissions: ${permissions.length} permissions`);
      return permissions;
    }
    
    // Handle different user types
    if (user.sessionType === 'branch_staff') {
      // For staff, get role from staff table
      const role = user.role || 'associate';
      console.log('👥 Staff user with role:', role);
      return ROLE_PERMISSIONS[role] || [];
    } else if (user.email && user.id) {
      // For regular users, get role from users table
      console.log('🔍 Looking up user role in database for ID:', user.id);
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();
      
      const role = userProfile?.role || 'member';
      console.log('📊 Database user role:', role);
      return ROLE_PERMISSIONS[role] || [];
    }
    
    // Default to no permissions
    console.log('❌ No valid user type found, defaulting to no permissions');
    return [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};

// Check if user has specific permission
export const hasPermission = (userPermissions: Permission[], requiredPermission: Permission): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes(Permission.SYSTEM_ADMIN);
};

// Check if user has any of the specified permissions
export const hasAnyPermission = (userPermissions: Permission[], requiredPermissions: Permission[]): boolean => {
  return requiredPermissions.some(permission => hasPermission(userPermissions, permission));
};

// Middleware to require specific permission
export const requirePermission = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          error: 'Authentication required',
          message: 'User must be authenticated to access this resource'
        });
      }
      
      const userPermissions = await getUserPermissions(req.user);
      
      if (!hasPermission(userPermissions, permission)) {
        console.log(`🚫 Permission denied: User ${req.user.id} lacks ${permission}`);
        return res.status(403).json({
          status: 'error',
          error: 'Insufficient permissions',
          message: `This operation requires the ${permission} permission`,
          required: permission,
          userRole: req.user.role
        });
      }
      
      console.log(`✅ Permission granted: User ${req.user.id} has ${permission}`);
      next();
      
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Permission validation failed',
        message: 'Unable to verify user permissions'
      });
    }
  };
};

// Middleware to require any of multiple permissions
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          error: 'Authentication required'
        });
      }
      
      const userPermissions = await getUserPermissions(req.user);
      
      if (!hasAnyPermission(userPermissions, permissions)) {
        console.log(`🚫 Permission denied: User ${req.user.id} lacks any of ${permissions.join(', ')}`);
        return res.status(403).json({
          status: 'error',
          error: 'Insufficient permissions',
          message: `This operation requires one of: ${permissions.join(', ')}`,
          required: permissions,
          userRole: req.user.role
        });
      }
      
      console.log(`✅ Permission granted: User ${req.user.id} has sufficient permissions`);
      next();
      
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Permission validation failed'
      });
    }
  };
};

// Branch-specific access control
export const requireBranchAccess = (requiredPermission?: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          error: 'Authentication required'
        });
      }
      
      const branchId = req.params.branchId || req.body.branchId;
      
      if (!branchId) {
        return res.status(400).json({
          status: 'error',
          error: 'Branch ID required',
          message: 'This operation requires a branch context'
        });
      }
      
      const userPermissions = await getUserPermissions(req.user);
      
      // Check basic permission first (if specified)
      if (requiredPermission && !hasPermission(userPermissions, requiredPermission)) {
        return res.status(403).json({
          status: 'error',
          error: 'Insufficient permissions',
          message: `Operation requires ${requiredPermission} permission`
        });
      }
      
      // Super admins can access any branch
      if (hasPermission(userPermissions, Permission.SYSTEM_ADMIN) || 
          hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
        console.log(`✅ Admin access granted to branch ${branchId}`);
        return next();
      }
      
      // For staff users, check if they belong to this branch
      if (req.user.sessionType === 'branch_staff') {
        if (req.user.branchId !== branchId) {
          console.log(`🚫 Branch access denied: Staff ${req.user.id} not assigned to branch ${branchId}`);
          return res.status(403).json({
            status: 'error',
            error: 'Branch access denied',
            message: 'You can only access your assigned branch',
            assignedBranch: req.user.branchId,
            requestedBranch: branchId
          });
        }
      }
      
      console.log(`✅ Branch access granted: User ${req.user.id} → Branch ${branchId}`);
      next();
      
    } catch (error) {
      console.error('Branch access check error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Branch access validation failed'
      });
    }
  };
};

// Get user's role information for debugging
export const getUserRoleInfo = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        error: 'Authentication required'
      });
    }
    
    const userPermissions = await getUserPermissions(req.user);
    
    res.json({
      status: 'success',
      data: {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        sessionType: req.user.sessionType,
        branchId: req.user.branchId,
        permissions: userPermissions,
        permissionCount: userPermissions.length
      }
    });
    
  } catch (error) {
    console.error('Error getting role info:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to get role information'
    });
  }
};

// Audit logging for sensitive operations
export const auditLog = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(data: any) {
        // Log the action after successful response
        if (req.user && res.statusCode < 400) {
          logAuditEvent({
            userId: req.user.id,
            userEmail: req.user.email,
            action,
            resourceType,
            resourceId: req.params.id || req.body.id,
            branchId: req.params.branchId || req.body.branchId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            success: true,
            statusCode: res.statusCode
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.error('Audit logging error:', error);
      next(); // Continue even if audit logging fails
    }
  };
};

// Function to log audit events
const logAuditEvent = async (auditData: any) => {
  try {
    // In a production system, you'd want to:
    // 1. Store in a separate audit database
    // 2. Use a message queue for async processing
    // 3. Consider data retention policies
    
    console.log('📋 AUDIT LOG:', JSON.stringify(auditData, null, 2));
    
    // Optional: Store in database
    await supabase
      .from('audit_logs')
      .insert(auditData)
      .select()
      .single();
      
  } catch (error) {
    console.error('Failed to store audit log:', error);
    // Don't throw - audit logging failure shouldn't break the request
  }
};

// Export permission checking utilities for use in route handlers
export const rbacUtils = {
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  Permission
};