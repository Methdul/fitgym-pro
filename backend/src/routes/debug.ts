// backend/src/routes/debug.ts - RBAC Testing & Debug Routes
import express, { Request, Response } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { 
  requirePermission,
  requireAnyPermission,
  requireBranchAccess,
  auditLog,
  getUserRoleInfo,
  Permission,
  rbacUtils,
  ROLE_PERMISSIONS
} from '../middleware/rbac';

const router = express.Router();

// Get current user's complete role information
router.get('/whoami', authenticate, getUserRoleInfo);

// Test all permission levels - useful for debugging
router.get('/permissions/test', authenticate, async (req: Request, res: Response) => {
  try {
    const userPermissions = await rbacUtils.getUserPermissions(req.user);
    
    // Test each permission category
    const permissionTests = {
      members: {
        read: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_READ),
        write: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_WRITE),
        delete: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_DELETE),
        search: rbacUtils.hasPermission(userPermissions, Permission.MEMBERS_SEARCH)
      },
      staff: {
        read: rbacUtils.hasPermission(userPermissions, Permission.STAFF_READ),
        write: rbacUtils.hasPermission(userPermissions, Permission.STAFF_WRITE),
        delete: rbacUtils.hasPermission(userPermissions, Permission.STAFF_DELETE),
        managePins: rbacUtils.hasPermission(userPermissions, Permission.STAFF_MANAGE_PINS)
      },
      packages: {
        read: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_READ),
        write: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_WRITE),
        delete: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_DELETE),
        pricing: rbacUtils.hasPermission(userPermissions, Permission.PACKAGES_PRICING)
      },
      branches: {
        read: rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_READ),
        write: rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_WRITE),
        delete: rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_DELETE),
        manageAll: rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)
      },
      analytics: {
        read: rbacUtils.hasPermission(userPermissions, Permission.ANALYTICS_READ),
        financial: rbacUtils.hasPermission(userPermissions, Permission.ANALYTICS_FINANCIAL),
        export: rbacUtils.hasPermission(userPermissions, Permission.ANALYTICS_EXPORT)
      },
      system: {
        admin: rbacUtils.hasPermission(userPermissions, Permission.SYSTEM_ADMIN),
        auditLogs: rbacUtils.hasPermission(userPermissions, Permission.SYSTEM_AUDIT_LOGS),
        backup: rbacUtils.hasPermission(userPermissions, Permission.SYSTEM_BACKUP)
      }
    };
    
    res.json({
      status: 'success',
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        sessionType: req.user.sessionType,
        branchId: req.user.branchId
      },
      allPermissions: userPermissions,
      permissionTests,
      summary: {
        totalPermissions: userPermissions.length,
        isAdmin: rbacUtils.hasPermission(userPermissions, Permission.SYSTEM_ADMIN),
        canManageAllBranches: rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL),
        highestAccess: getHighestAccessLevel(userPermissions)
      }
    });
    
  } catch (error) {
    console.error('Error in permission test:', error);
    res.status(500).json({
      status: 'error',
      error: 'Permission test failed'
    });
  }
});

// Test specific permission (useful for debugging specific issues)
router.get('/permissions/check/:permission', authenticate, async (req: Request, res: Response) => {
  try {
    const { permission } = req.params;
    
    // Check if permission exists
    if (!Object.values(Permission).includes(permission as Permission)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid permission',
        validPermissions: Object.values(Permission)
      });
    }
    
    const userPermissions = await rbacUtils.getUserPermissions(req.user);
    const hasPermission = rbacUtils.hasPermission(userPermissions, permission as Permission);
    
    res.json({
      status: 'success',
      permission,
      hasPermission,
      user: {
        id: req.user.id,
        role: req.user.role,
        sessionType: req.user.sessionType
      }
    });
    
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({
      status: 'error',
      error: 'Permission check failed'
    });
  }
});

// Show all available roles and their permissions
router.get('/roles', optionalAuth, (req: Request, res: Response) => {
  res.json({
    status: 'success',
    roles: ROLE_PERMISSIONS,
    roleDescriptions: {
      super_admin: 'Full system access - can do everything',
      manager: 'Branch manager - full control of assigned branch',
      senior_staff: 'Senior staff - most operations except staff management',
      associate: 'Basic staff - view and search operations only',
      member: 'Regular member - very limited access'
    },
    permissionCategories: {
      members: 'Member management operations',
      staff: 'Staff management operations', 
      packages: 'Package and pricing management',
      branches: 'Branch management operations',
      analytics: 'Reports and analytics access',
      system: 'System administration',
      renewals: 'Membership renewals',
      payments: 'Payment processing'
    }
  });
});

// Test branch access (useful for testing branch isolation)
router.get('/branch-access/:branchId', 
  authenticate,
  requireBranchAccess(Permission.MEMBERS_READ),
  auditLog('TEST_BRANCH_ACCESS', 'debug'),
  (req: Request, res: Response) => {
    const { branchId } = req.params;
    
    res.json({
      status: 'success',
      message: `Access granted to branch ${branchId}`,
      user: {
        id: req.user.id,
        role: req.user.role,
        assignedBranch: req.user.branchId,
        requestedBranch: branchId
      },
      timestamp: new Date().toISOString()
    });
  }
);

// Test different permission levels (useful for UI testing)
router.get('/test-permissions/:level', authenticate, async (req: Request, res: Response) => {
  try {
    const { level } = req.params;
    const userPermissions = await rbacUtils.getUserPermissions(req.user);
    
    let requiredPermissions: Permission[] = [];
    let description = '';
    
    switch (level) {
      case 'view':
        requiredPermissions = [Permission.MEMBERS_READ, Permission.PACKAGES_READ];
        description = 'Basic viewing permissions';
        break;
      case 'edit':
        requiredPermissions = [Permission.MEMBERS_WRITE, Permission.PACKAGES_WRITE];
        description = 'Basic editing permissions';
        break;
      case 'manage':
        requiredPermissions = [Permission.STAFF_WRITE, Permission.ANALYTICS_READ];
        description = 'Management level permissions';
        break;
      case 'admin':
        requiredPermissions = [Permission.SYSTEM_ADMIN];
        description = 'Full administrative access';
        break;
      default:
        return res.status(400).json({
          status: 'error',
          error: 'Invalid permission level',
          validLevels: ['view', 'edit', 'manage', 'admin']
        });
    }
    
    const hasAccess = rbacUtils.hasAnyPermission(userPermissions, requiredPermissions);
    
    res.json({
      status: 'success',
      level,
      description,
      hasAccess,
      requiredPermissions,
      userPermissions: userPermissions.filter(p => requiredPermissions.includes(p)),
      user: {
        id: req.user.id,
        role: req.user.role
      }
    });
    
  } catch (error) {
    console.error('Error testing permission level:', error);
    res.status(500).json({
      status: 'error',
      error: 'Permission level test failed'
    });
  }
});

// Test audit logging (creates a test log entry)
router.post('/test-audit', 
  authenticate,
  auditLog('TEST_AUDIT_LOG', 'debug'),
  (req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Audit log test completed',
      note: 'Check your server console and database for the audit log entry',
      user: req.user.id,
      timestamp: new Date().toISOString()
    });
  }
);

// Helper function to determine highest access level
function getHighestAccessLevel(permissions: Permission[]): string {
  if (rbacUtils.hasPermission(permissions, Permission.SYSTEM_ADMIN)) {
    return 'System Administrator';
  }
  if (rbacUtils.hasPermission(permissions, Permission.BRANCHES_MANAGE_ALL)) {
    return 'Multi-Branch Manager';
  }
  if (rbacUtils.hasPermission(permissions, Permission.STAFF_WRITE)) {
    return 'Branch Manager';
  }
  if (rbacUtils.hasPermission(permissions, Permission.MEMBERS_WRITE)) {
    return 'Senior Staff';
  }
  if (rbacUtils.hasPermission(permissions, Permission.MEMBERS_READ)) {
    return 'Staff Member';
  }
  return 'Basic User';
}

export { router as debugRoutes };