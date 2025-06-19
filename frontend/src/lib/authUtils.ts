import { type UserRole } from '@/hooks/useRoleAuth';

/**
 * Authentication utility functions
 * Provides helper functions for authentication validation and role checking
 */

/**
 * Check if a user session is valid
 */
export const isValidSession = (user: any): boolean => {
  if (!user) return false;
  
  // Check for required user properties
  if (!user.id || !user.email) return false;
  
  // Check if session hasn't expired (if exp property exists)
  if (user.exp && Date.now() >= user.exp * 1000) {
    return false;
  }
  
  return true;
};

/**
 * Extract user role from user object
 */
export const getUserRole = (user: any): UserRole | null => {
  if (!user) return null;
  
  // Try user_metadata first, then direct property
  const role = user.user_metadata?.role || user.role;
  
  // Validate role is one of our expected values
  const validRoles: UserRole[] = ['admin', 'member', 'staff'];
  return validRoles.includes(role) ? role : null;
};

/**
 * Check if user has specific role
 */
export const hasRole = (user: any, requiredRole: UserRole): boolean => {
  const userRole = getUserRole(user);
  return userRole === requiredRole;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user: any, allowedRoles: UserRole[]): boolean => {
  const userRole = getUserRole(user);
  return userRole ? allowedRoles.includes(userRole) : false;
};

/**
 * Get redirect path based on user role
 */
export const getDefaultRedirectPath = (user: any): string => {
  const role = getUserRole(user);
  
  switch (role) {
    case 'admin':
      return '/admin';
    case 'member':
      return '/member';
    case 'staff':
      // For staff, we need additional logic to determine their branch
      // For now, redirect to login to handle branch selection
      return '/login';
    default:
      return '/';
  }
};

/**
 * Validate branch access for staff members
 * In a real implementation, this would check against a backend service
 */
export const validateBranchAccess = async (
  user: any, 
  branchId: string
): Promise<boolean> => {
  if (!user || !branchId) return false;
  
  const userRole = getUserRole(user);
  if (userRole !== 'staff') return false;
  
  // TODO: Implement actual branch access validation
  // This would typically involve:
  // 1. Fetch staff member details from backend
  // 2. Check if staff member is assigned to this branch
  // 3. Verify branch permissions
  
  console.log(`Validating staff access to branch: ${branchId} for user: ${user.id}`);
  
  // For now, return true (assuming valid access)
  // In production, replace with actual validation logic
  return true;
};

/**
 * Check if user account is verified
 */
export const isAccountVerified = (user: any): boolean => {
  if (!user) return false;
  
  // Check email verification status
  const isEmailVerified = user.email_confirmed_at || user.email_verified;
  
  // Check custom verification flag if exists
  const isCustomVerified = user.user_metadata?.is_verified;
  
  return Boolean(isEmailVerified || isCustomVerified);
};

/**
 * Get user display name
 */
export const getUserDisplayName = (user: any): string => {
  if (!user) return 'Unknown User';
  
  const metadata = user.user_metadata || {};
  const firstName = metadata.first_name || user.first_name;
  const lastName = metadata.last_name || user.last_name;
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (firstName) return firstName;
  if (user.email) return user.email.split('@')[0];
  
  return 'User';
};

/**
 * Format role for display
 */
export const formatRole = (role: UserRole | null): string => {
  if (!role) return 'Unknown';
  
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'member':
      return 'Member';
    case 'staff':
      return 'Staff';
    default:
      return role;
  }
};

/**
 * Check if user needs password change
 */
export const needsPasswordChange = (user: any): boolean => {
  if (!user) return false;
  
  // Check for temporary password flag
  const hasTemporaryPassword = user.user_metadata?.needs_password_change;
  
  // Check if password was set to national_id (temporary password pattern)
  const metadata = user.user_metadata || {};
  const hasDefaultPassword = metadata.account_type === 'existing_member';
  
  return Boolean(hasTemporaryPassword || hasDefaultPassword);
};

/**
 * Security validation for route access
 */
export const validateRouteAccess = (
  user: any,
  route: string,
  branchId?: string
): { allowed: boolean; redirect?: string; message?: string } => {
  // Public routes - always allowed
  const publicRoutes = ['/', '/about', '/branches', '/partnerships', '/login', '/404'];
  if (publicRoutes.includes(route)) {
    return { allowed: true };
  }
  
  // Check authentication
  if (!isValidSession(user)) {
    return { 
      allowed: false, 
      redirect: '/login',
      message: 'Authentication required'
    };
  }
  
  const userRole = getUserRole(user);
  
  // Admin routes
  if (route.startsWith('/admin')) {
    if (userRole !== 'admin') {
      return {
        allowed: false,
        redirect: getDefaultRedirectPath(user),
        message: 'Admin access required'
      };
    }
    return { allowed: true };
  }
  
  // Member routes
  if (route.startsWith('/member')) {
    if (userRole !== 'member') {
      return {
        allowed: false,
        redirect: getDefaultRedirectPath(user),
        message: 'Member access required'
      };
    }
    return { allowed: true };
  }
  
  // Staff routes
  if (route.startsWith('/dashboard/staff/')) {
    if (userRole !== 'staff') {
      return {
        allowed: false,
        redirect: getDefaultRedirectPath(user),
        message: 'Staff access required'
      };
    }
    
    if (!branchId) {
      return {
        allowed: false,
        redirect: '/login',
        message: 'Branch ID required for staff access'
      };
    }
    
    // TODO: Add actual branch validation
    return { allowed: true };
  }
  
  // Default allow for other routes
  return { allowed: true };
};

export default {
  isValidSession,
  getUserRole,
  hasRole,
  hasAnyRole,
  getDefaultRedirectPath,
  validateBranchAccess,
  isAccountVerified,
  getUserDisplayName,
  formatRole,
  needsPasswordChange,
  validateRouteAccess
};