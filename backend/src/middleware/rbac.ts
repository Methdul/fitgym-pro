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
    Permission.STAFF_DELETE,  
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

// Sanitize request data to capture financial information safely - ENHANCED VERSION  
const sanitizeRequestData = async (body: any, action: string) => {
  if (!body) return null;

  console.log('🚨 DEBUG - FULL REQUEST BODY:', JSON.stringify(body, null, 2));
  
  console.log('🔍 AUDIT DEBUG - Request Body:', JSON.stringify(body, null, 2));
  
  console.log('🔍 AUDIT DEBUG - Request Body:', JSON.stringify(body, null, 2));
  
  // For financial operations, capture key financial data
  if (action === 'CREATE_MEMBER' || action === 'PROCESS_MEMBER_RENEWAL') {
    // Get package information if packageId is provided
    let packageInfo = null;
    const packageId = body.packageId || body.package_id;
    
    if (packageId) {
      try {
        const { data: packageData } = await supabase
          .from('packages')
          .select('name, type, price')
          .eq('id', packageId)
          .single();
        
        packageInfo = packageData;
        console.log('📦 AUDIT DEBUG - Package Info:', packageInfo);
      } catch (error) {
        console.error('❌ AUDIT DEBUG - Failed to fetch package info:', error);
      }
    }
    
    const auditData = {
      // Financial data for analytics - ENHANCED FIELD MAPPING
      package_price: body.customPrice || body.amountPaid || body.package_price || body.packagePrice || body.totalAmount,  // ← ADD body.customPrice ||
      payment_method: body.paymentMethod || body.payment_method,
      package_name: packageInfo?.name || body.package_name || body.packageName || 'Unknown Package',
      package_type: packageInfo?.type || body.package_type || body.packageType,
      package_id: packageId,
      duration_months: body.duration || body.duration_months || body.durationMonths,
      
      // Member data (non-sensitive)
      member_type: packageInfo?.type || body.package_type || body.packageType,
      branch_id: body.branchId || body.branch_id,
      
      // Staff data - GET FROM VERIFICATION SECTION
      staff_id: body.staffId || body.staff_id,
      staff_pin_provided: body.staffPin ? 'YES' : 'NO', // Don't store actual PIN
      
      // Additional member info for better tracking
      member_first_name: body.firstName || body.first_name,  // ← ADD || body.first_name
      member_last_name: body.lastName || body.last_name,   // ← ADD || body.last_name
      member_email: body.email,
      
      // Payment details
      start_date: body.startDate,
      expiry_date: body.expiryDate,
      total_amount: body.amountPaid || body.totalAmount
    };
    
    console.log('💰 AUDIT DEBUG - Captured Financial Data:', JSON.stringify(auditData, null, 2));

    console.log('🔍 CRITICAL FIELD DEBUG:', {
    customPrice: body.customPrice,
    package_price_captured: auditData.package_price,
    firstName: body.firstName,
    lastName: body.lastName,
    member_first_name_captured: auditData.member_first_name,
    member_last_name_captured: auditData.member_last_name,
    paymentMethod: body.paymentMethod,
    payment_method_captured: auditData.payment_method
  });
    return auditData;
  }
  
  // For other operations, capture basic data
  return {
    operation_type: action,
    resource_count: Array.isArray(body) ? body.length : 1,
    has_sensitive_data: !!(body.pin || body.password || body.national_id),
    data_keys: Object.keys(body || {}).filter(key => 
      !['pin', 'password', 'national_id', 'pin_hash', 'staffPin'].includes(key)
    )
  };
};

// Sanitize response data to capture success metrics - ENHANCED VERSION
const sanitizeResponseData = (responseData: any, action: string) => {
  if (!responseData) return null;
  
  console.log('🔍 AUDIT DEBUG - Response Data:', JSON.stringify(responseData, null, 2));
  
  // Extract useful response information
  const response = {
    status: responseData.status,
    success: responseData.status === 'success',
    timestamp: new Date().toISOString()
  };
  
  // For financial operations, capture result data - ENHANCED
  if (action === 'CREATE_MEMBER' || action === 'PROCESS_MEMBER_RENEWAL') {
    const enhancedResponse = {
      ...response,
      // Success metrics
      member_id: responseData.data?.id || responseData.data?.member?.id || responseData.data?.memberId,
      renewal_id: responseData.data?.renewal?.id,
      transaction_successful: responseData.status === 'success',
      
      // Financial confirmation
      amount_processed: responseData.data?.amount_paid || responseData.data?.package_price || responseData.data?.amountPaid,
      new_expiry_date: responseData.data?.member?.expiry_date || responseData.data?.new_expiry || responseData.data?.expiryDate,
      
      // ENHANCED: Capture member name from response
      member_name: responseData.data?.member_name || 
                   responseData.data?.memberName ||
                   (responseData.data?.firstName && responseData.data?.lastName ? 
                    `${responseData.data.firstName} ${responseData.data.lastName}` : null) ||
                   (responseData.data?.member?.first_name && responseData.data?.member?.last_name ?
                    `${responseData.data.member.first_name} ${responseData.data.member.last_name}` : null),
      
      // Package information
      package_name: responseData.data?.package?.name || responseData.data?.packageName,
      
      // Avoid sensitive data
      message: responseData.message
    };
    
    console.log('💰 AUDIT DEBUG - Captured Response Data:', JSON.stringify(enhancedResponse, null, 2));
    return enhancedResponse;
  }
  
  // For other operations
  return {
    ...response,
    record_count: responseData.data ? (Array.isArray(responseData.data) ? responseData.data.length : 1) : 0,
    has_data: !!responseData.data,
    message: responseData.message
  };
};

// Function to log audit events - FIXED VERSION
const logAuditEvent = async (auditData: any) => {
  try {
    console.log('📋 AUDIT LOG ATTEMPT:', JSON.stringify(auditData, null, 2));
    
    // Ensure required fields are present
    if (!auditData.userId || !auditData.userEmail) {
      console.error('❌ AUDIT LOG SKIPPED: Missing required user_id or user_email');
      return;
    }
    
    // Map JavaScript camelCase to database snake_case
    const dbAuditData = {
      user_id: auditData.userId,
      user_email: auditData.userEmail,
      action: auditData.action,
      resource_type: auditData.resourceType,
      resource_id: auditData.resourceId || null,
      branch_id: auditData.branchId || null,
      ip_address: auditData.ipAddress || null,
      user_agent: auditData.userAgent || null,
      timestamp: auditData.timestamp || new Date().toISOString(),
      success: auditData.success !== undefined ? auditData.success : true,
      status_code: auditData.statusCode || null,
      error_message: auditData.errorMessage || null,
      request_data: auditData.requestData || null,
      response_data: auditData.responseData || null
    };
    
    console.log('📋 MAPPED DB DATA:', JSON.stringify(dbAuditData, null, 2));
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(dbAuditData)
      .select()
      .single();
      
    if (error) {
      console.error('❌ AUDIT LOG INSERT ERROR:', error);
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE', 
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint'
      });
      return;
    }
    
    console.log('✅ AUDIT LOG SAVED SUCCESSFULLY:', data);
      
  } catch (error: any) {
    console.error('💥 AUDIT LOG FAILED:', error);
    console.error('Error details:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'NO_CODE',
      details: error?.details || 'No details',
      hint: error?.hint || 'No hint'
    });
    // Don't throw - audit logging failure shouldn't break the request
  }
};

// Audit logging for sensitive operations - ENHANCED VERSION
export const auditLog = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`🔍 AUDIT MIDDLEWARE: ${action} - ${resourceType}`);
      
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(data: any) {
        console.log(`🔍 RESPONSE STATUS:`, res.statusCode);
        
        // Log the action after successful response (async but don't await)
        if (req.user && res.statusCode < 400) {
          console.log(`📋 CREATING AUDIT LOG FOR:`, action);
          
          // ENHANCED: Get staff member info from verification if available
          let auditUserId = req.user.id || req.user.userId;
          let auditUserEmail = req.user.email || req.user.userEmail;
          
          // Handle async operations without blocking the response
          const processAuditLog = async () => {
            // For member creation/renewal, try to get the verified staff member
            if ((action === 'CREATE_MEMBER' || action === 'PROCESS_MEMBER_RENEWAL') && req.body?.staffId) {
              try {
                const { data: staffMember } = await supabase
                  .from('branch_staff')
                  .select('id, email, first_name, last_name')
                  .eq('id', req.body.staffId)
                  .single();
                
                if (staffMember) {
                  auditUserId = staffMember.id;
                  auditUserEmail = staffMember.email;
                  console.log(`🔍 AUDIT: Using verified staff member: ${staffMember.first_name} ${staffMember.last_name} (${staffMember.email})`);
                }
              } catch (error) {
                console.error('❌ AUDIT: Failed to get staff member info, using authenticated user');
              }
            }
            
            if (!auditUserId || !auditUserEmail) {
              console.error(`❌ MISSING USER DATA - ID: ${auditUserId}, Email: ${auditUserEmail}`);
              return;
            }
            
            logAuditEvent({
              userId: auditUserId,
              userEmail: auditUserEmail,
              action,
              resourceType,
              resourceId: req.params.id || req.body?.id || null,
              branchId: req.params.branchId || req.body?.branchId || null,
              ipAddress: req.ip || req.connection?.remoteAddress || null,
              userAgent: req.get('User-Agent') || null,
              timestamp: new Date().toISOString(),
              success: true,
              statusCode: res.statusCode,
              requestData: {
                method: req.method,
                path: req.path,
                params: req.params,
                query: req.query,
                body: await sanitizeRequestData(req.body, action), // Now properly async
                headers: {
                  'content-type': req.get('Content-Type'),
                  'user-agent': req.get('User-Agent')
                }
              },
              responseData: sanitizeResponseData(data, action)
            });
          };
          
          // Execute async audit logging without blocking response
          processAuditLog().catch(error => {
            console.error('💥 AUDIT LOG PROCESSING ERROR:', error);
          });
        } else {
          if (!req.user) {
            console.log(`⚠️ NO AUDIT LOG - Missing user object`);
          }
          if (res.statusCode >= 400) {
            console.log(`⚠️ NO AUDIT LOG - Error status code: ${res.statusCode}`);
          }
        }
        
        // Call original json method immediately (synchronous)
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error: any) {
      console.error('💥 AUDIT MIDDLEWARE ERROR:', error);
      next(); // Continue even if audit setup fails
    }
  };
};

// Export permission checking utilities for use in route handlers
export const rbacUtils = {
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  Permission
};