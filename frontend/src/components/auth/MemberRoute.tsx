import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, User } from 'lucide-react';

interface MemberRouteProps {
  children: React.ReactNode;
}

/**
 * Member-only route protection - Temporary fix
 * For now, this allows access if user is logged in
 * You can customize the logic once we see your auth system
 */
export const MemberRoute: React.FC<MemberRouteProps> = ({ children }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for any type of session data (member, user, branch, etc.)
        const possibleKeys = [
          'memberSession',
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
        
        console.log('🔍 Member route checking auth with keys:', possibleKeys);
        console.log('📋 Member route found session data:', { foundKey, sessionData });

        // If no session data found, search all localStorage
        if (!sessionData) {
          const allKeys = Object.keys(localStorage);
          console.log('🔎 Member route - all localStorage keys:', allKeys);
          
          for (const key of allKeys) {
            const value = localStorage.getItem(key);
            if (value && (value.includes('sessionToken') || value.includes('token') || value.includes('member'))) {
              try {
                sessionData = JSON.parse(value);
                foundKey = key;
                console.log('🎯 Member route found session-like data in key:', key, sessionData);
                break;
              } catch (e) {
                // Continue searching
              }
            }
          }
        }

        // Check if we found valid session data
        if (!sessionData) {
          console.log('❌ Member route: No session found in any key');
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Determine session type and validate
        if (sessionData.sessionToken) {
          // Branch/staff session format
          sessionType = 'branch';
          console.log('✅ Member route: Found branch session, allowing member access');
          setIsAuthorized(true);
        } else if (sessionData.access_token || sessionData.token) {
          // User session format (Supabase or similar)
          sessionType = 'user';
          console.log('✅ Member route: Found user session, allowing member access');
          setIsAuthorized(true);
        } else if (sessionData.value || sessionData.email) {
          // Simple session format
          sessionType = 'simple';
          console.log('✅ Member route: Found simple session, allowing member access');
          setIsAuthorized(true);
        } else {
          console.log('❌ Member route: Unknown session format');
          setIsAuthorized(false);
        }

        console.log('🎯 Member route session validation:', {
          sessionType,
          hasData: !!sessionData,
          authorized: sessionType !== ''
        });

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Member route error checking auth:', error);
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
          <User className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying member access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default MemberRoute;