import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthGuardConfig {
  requiredRole?: 'admin' | 'member' | 'staff';
  requireBranchAccess?: boolean;
  branchId?: string;
  redirectTo?: string;
  allowedRoles?: string[];
}

interface AuthGuardResult {
  isAuthorized: boolean;
  isLoading: boolean;
  error: string | null;
  user: any;
  userRole: string | null;
}

/**
 * Core authentication guard hook
 * Handles session validation, role checking, and permissions
 */
export const useAuthGuard = (config: AuthGuardConfig = {}): AuthGuardResult => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const {
    requiredRole,
    requireBranchAccess = false,
    branchId,
    redirectTo = '/login',
    allowedRoles = []
  } = config;

  useEffect(() => {
    const validateAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Check if user is authenticated
        if (!user) {
          setError('Authentication required');
          setIsAuthorized(false);
          if (redirectTo) {
            navigate(redirectTo, { 
              state: { from: location },
              replace: true 
            });
          }
          return;
        }

        // 2. Check if session is still valid (basic check)
        if (!user.email || !user.id) {
          setError('Invalid session');
          setIsAuthorized(false);
          if (redirectTo) {
            navigate(redirectTo, { replace: true });
          }
          return;
        }

        // 3. Get user profile and role
        const userProfile = user.user_metadata || {};
        const userRole = userProfile.role || user.role;

        // 4. Check role requirements
        if (requiredRole && userRole !== requiredRole) {
          setError(`Access denied. Required role: ${requiredRole}`);
          setIsAuthorized(false);
          
          // Redirect to appropriate dashboard based on actual role
          switch (userRole) {
            case 'admin':
              navigate('/admin', { replace: true });
              break;
            case 'member':
              navigate('/member', { replace: true });
              break;
            case 'staff':
              // For staff, we need to determine their branch
              // This would require a backend call in a real scenario
              setError('Staff role detected but branch access validation needed');
              break;
            default:
              navigate('/login', { replace: true });
          }
          return;
        }

        // 5. Check allowed roles (alternative to requiredRole for multiple roles)
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          setError(`Access denied. Allowed roles: ${allowedRoles.join(', ')}`);
          setIsAuthorized(false);
          return;
        }

        // 6. Branch access validation for staff
        if (requireBranchAccess && userRole === 'staff') {
          if (!branchId) {
            setError('Branch access required but no branch specified');
            setIsAuthorized(false);
            return;
          }

          // In a real implementation, you'd verify staff has access to this branch
          // For now, we'll assume they do if they're authenticated staff
          console.log(`Staff access validation for branch: ${branchId}`);
        }

        // 7. All checks passed
        setIsAuthorized(true);
        setError(null);

      } catch (err) {
        console.error('Auth guard validation error:', err);
        setError('Authentication validation failed');
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run validation when auth loading is complete
    if (!authLoading) {
      validateAuth();
    }
  }, [user, authLoading, requiredRole, requireBranchAccess, branchId, redirectTo, allowedRoles, navigate, location]);

  return {
    isAuthorized,
    isLoading: authLoading || isLoading,
    error,
    user,
    userRole: user?.user_metadata?.role || user?.role || null
  };
};

export default useAuthGuard;