import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type UserRole = 'admin' | 'member' | 'staff';

interface RoleAuthResult {
  userRole: UserRole | null;
  isAdmin: boolean;
  isMember: boolean;
  isStaff: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canAccess: (requiredRoles: UserRole[]) => boolean;
  isAuthenticated: boolean;
}

/**
 * Hook for role-based authentication checks
 * Provides utilities for checking user roles and permissions
 */
export const useRoleAuth = (): RoleAuthResult => {
  const { user, loading } = useAuth();

  const roleAuthResult = useMemo((): RoleAuthResult => {
    // If still loading or no user, return default values
    if (loading || !user) {
      return {
        userRole: null,
        isAdmin: false,
        isMember: false,
        isStaff: false,
        hasRole: () => false,
        hasAnyRole: () => false,
        canAccess: () => false,
        isAuthenticated: false
      };
    }

    // Extract user role from user metadata or direct property
    const userRole = (user.user_metadata?.role || user.role) as UserRole;

    // Role check functions
    const hasRole = (role: UserRole): boolean => userRole === role;
    
    const hasAnyRole = (roles: UserRole[]): boolean => 
      roles.some(role => userRole === role);
    
    const canAccess = (requiredRoles: UserRole[]): boolean => 
      hasAnyRole(requiredRoles);

    return {
      userRole,
      isAdmin: userRole === 'admin',
      isMember: userRole === 'member',
      isStaff: userRole === 'staff',
      hasRole,
      hasAnyRole,
      canAccess,
      isAuthenticated: true
    };
  }, [user, loading]);

  return roleAuthResult;
};

/**
 * Check if user has specific role
 */
export const checkUserRole = (user: any, requiredRole: UserRole): boolean => {
  if (!user) return false;
  const userRole = (user.user_metadata?.role || user.role) as UserRole;
  return userRole === requiredRole;
};

/**
 * Check if user has any of the specified roles
 */
export const checkUserRoles = (user: any, allowedRoles: UserRole[]): boolean => {
  if (!user) return false;
  const userRole = (user.user_metadata?.role || user.role) as UserRole;
  return allowedRoles.includes(userRole);
};

/**
 * Get user role from user object
 */
export const getUserRole = (user: any): UserRole | null => {
  if (!user) return null;
  const role = (user.user_metadata?.role || user.role) as UserRole;
  const validRoles: UserRole[] = ['admin', 'member', 'staff'];
  return validRoles.includes(role) ? role : null;
};

export default useRoleAuth;