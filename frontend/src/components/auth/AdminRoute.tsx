import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Admin-only route protection - Temporary fix
 * For now, this allows access if user is logged in
 * You can customize the logic once we see your auth system
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for any type of session data (admin, branch, or user)
        const possibleKeys = [
          'adminSession',
          'userSession', 
          'branchSession', 
          'gymSession', 
          'staffSession',
          'fitgymSession',
          'session',
          'authSession'
        ];
        
        let sessionData = null;
        let foundKey = '';
        let sessionType = '';
        
        // Try to find any session data
        for (const key of possibleKeys) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              sessionData = JSON.parse(stored);
              foundKey = key;
              break;
            } catch (e) {
              // If it's not JSON, check if it's a simple string value
              if (stored) {
                sessionData = { value: stored };
                foundKey = key;
                break;
              }
            }
          }
        }
        
        console.log('🔍 Admin route checking auth with keys:', possibleKeys);
        console.log('📋 Admin route found session data:', { foundKey, sessionData });

        // If no session data found, search all localStorage
        if (!sessionData) {
          const allKeys = Object.keys(localStorage);
          console.log('🔎 Admin route - all localStorage keys:', allKeys);
          
          for (const key of allKeys) {
            const value = localStorage.getItem(key);
            if (value && (value.includes('sessionToken') || value.includes('token') || value.includes('admin'))) {
              try {
                sessionData = JSON.parse(value);
                foundKey = key;
                console.log('🎯 Admin route found session-like data in key:', key, sessionData);
                break;
              } catch (e) {
                // Continue searching
              }
            }
          }
        }

        // Check if we found valid session data
        if (!sessionData) {
          console.log('❌ Admin route: No session found in any key');
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Determine session type and validate
        if (sessionData.sessionToken) {
          // Branch/staff session format
          sessionType = 'branch';
          console.log('✅ Admin route: Found branch session, allowing admin access');
          setIsAuthorized(true);
        } else if (sessionData.access_token || sessionData.token) {
          // User session format (Supabase or similar)
          sessionType = 'user';
          console.log('✅ Admin route: Found user session, allowing admin access');
          setIsAuthorized(true);
        } else if (sessionData.value || sessionData.email) {
          // Simple session format
          sessionType = 'simple';
          console.log('✅ Admin route: Found simple session, allowing admin access');
          setIsAuthorized(true);
        } else {
          console.log('❌ Admin route: Unknown session format');
          setIsAuthorized(false);
        }

        console.log('🎯 Admin route session validation:', {
          sessionType,
          hasData: !!sessionData,
          authorized: sessionType !== ''
        });

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Admin route error checking auth:', error);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;