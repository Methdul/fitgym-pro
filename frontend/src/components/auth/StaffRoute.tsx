import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Loader2, Building } from 'lucide-react';

interface StaffRouteProps {
  children: React.ReactNode;
}

/**
 * Staff-only route protection - Temporary fix for branch authentication
 * This checks localStorage directly for your branch session
 */
export const StaffRoute: React.FC<StaffRouteProps> = ({ children }) => {
  const { branchId } = useParams<{ branchId: string }>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  React.useEffect(() => {
    const checkBranchAuth = () => {
      try {
        // Check for branch session the same way Navbar does it
        // Look for the main session storage key (you might need to adjust this key name)
        const possibleKeys = [
          'branchSession', 
          'gymSession', 
          'staffSession',
          'fitgymSession',
          'session',
          'authSession'
        ];
        
        let sessionData = null;
        let foundKey = '';
        
        // Try to find the session data
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
        
        console.log('🔍 Checking branch auth with keys:', possibleKeys);
        console.log('📋 Found session data:', { foundKey, sessionData });

        // If no session data found, try alternative approach
        if (!sessionData) {
          // Check all localStorage for session-like data
          const allKeys = Object.keys(localStorage);
          console.log('🔎 All localStorage keys:', allKeys);
          
          for (const key of allKeys) {
            const value = localStorage.getItem(key);
            if (value && value.includes('sessionToken')) {
              try {
                sessionData = JSON.parse(value);
                foundKey = key;
                console.log('🎯 Found session-like data in key:', key, sessionData);
                break;
              } catch (e) {
                // Continue searching
              }
            }
          }
        }

        // Check if we found valid session data
        if (!sessionData) {
          console.log('❌ No branch session found in any key');
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Check if session data has the required fields
        const hasSessionToken = sessionData.sessionToken;
        const hasBranchData = sessionData.branchId || sessionData.branchEmail;
        
        console.log('✅ Session validation:', {
          hasSessionToken: !!hasSessionToken,
          hasBranchData: !!hasBranchData,
          branchId: sessionData.branchId,
          branchEmail: sessionData.branchEmail
        });

        if (hasSessionToken && hasBranchData) {
          console.log('✅ Valid branch session found');
          setIsAuthorized(true);
        } else {
          console.log('❌ Invalid session data structure');
          setIsAuthorized(false);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Error checking branch auth:', error);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    checkBranchAuth();
  }, [branchId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking branch access...</p>
          {branchId && (
            <p className="text-xs text-muted-foreground mt-2">
              Branch: {branchId}
            </p>
          )}
        </div>
      </div>
    );
  }

  // If not authorized, redirect to login
  if (!isAuthorized) {
    console.log('❌ Not authorized for staff dashboard, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If authorized, show the dashboard
  console.log('✅ Authorized for staff dashboard');
  return <>{children}</>;
};

export default StaffRoute;