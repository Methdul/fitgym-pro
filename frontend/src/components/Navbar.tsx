import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dumbbell, Menu, X, User, LogOut, Settings, Building2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface BranchSession {
  sessionToken: string;
  branchId: string;
  branchName: string;
  branchEmail: string;
  loginTime: string;
  userType: string;
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [branchSession, setBranchSession] = useState<BranchSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // FIXED: More robust branch session checking
  const checkBranchSession = useCallback(() => {
    try {
      const sessionData = localStorage.getItem('branch_session');
      console.log('🔍 Navbar checking branch session:', sessionData ? 'found' : 'not found');
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('📧 Branch session data:', session);
        
        // Validate session structure
        if (session.branchId && session.branchEmail && session.userType === 'branch_staff') {
          // Check if session is not too old (24 hours)
          const loginTime = new Date(session.loginTime);
          const now = new Date();
          const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) { // Session valid for 24 hours
            console.log('✅ Valid branch session found:', session.branchEmail);
            setBranchSession(session);
            setSessionChecked(true);
            return;
          } else {
            console.log('⏰ Branch session expired, removing...');
            localStorage.removeItem('branch_session');
          }
        } else {
          console.log('❌ Invalid branch session structure, removing...');
          localStorage.removeItem('branch_session');
        }
      }
      
      // No valid session found
      setBranchSession(null);
      setSessionChecked(true);
    } catch (error) {
      console.error('❌ Error checking branch session:', error);
      localStorage.removeItem('branch_session');
      setBranchSession(null);
      setSessionChecked(true);
    }
  }, []);

  // FIXED: Check session immediately on mount and route changes
  useEffect(() => {
    console.log('🔄 Navbar effect triggered by route change:', location.pathname);
    checkBranchSession();
  }, [checkBranchSession, location.pathname]);

  // FIXED: Listen for storage changes from same tab and other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      console.log('📡 Storage change detected in navbar');
      if (e instanceof StorageEvent && e.key !== 'branch_session') {
        return; // Only care about branch_session changes
      }
      setTimeout(checkBranchSession, 100); // Small delay to ensure localStorage is updated
    };

    const handleCustomStorageChange = () => {
      console.log('📡 Custom storage event detected in navbar');
      setTimeout(checkBranchSession, 100);
    };

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom storage events from same tab
    window.addEventListener('storage', handleCustomStorageChange);
    window.addEventListener('branchSessionUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage', handleCustomStorageChange);
      window.addEventListener('branchSessionUpdated', handleCustomStorageChange);
    };
  }, [checkBranchSession]);

  // FIXED: Prevent user auth from clearing branch session
  useEffect(() => {
    if (user && branchSession) {
      console.log('⚠️ Both user and branch session exist, keeping branch session');
      // Don't clear branch session when user logs in
      // Let user choose which one to use
    }
  }, [user, branchSession]);

  const handleSignOut = async () => {
    console.log('🔐 Signing out user...');
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleBranchLogout = () => {
    console.log('🔐 Logging out branch session...');
    
    // Clear branch session
    localStorage.removeItem('branch_session');
    setBranchSession(null);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('branchSessionUpdated'));
    window.dispatchEvent(new Event('storage'));
    
    // Navigate to home
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Branches', path: '/branches' },
    { name: 'Partnerships', path: '/partnerships' },
  ];

  // FIXED: Better logic for determining login state
  const isLoggedIn = Boolean(user || branchSession);
  const currentUserEmail = user?.email || branchSession?.branchEmail || '';
  const currentUserType = user ? 'user' : branchSession ? 'branch' : null;

  // FIXED: Better user display info with validation
  const getCurrentUserDisplayInfo = () => {
    if (user?.email) {
      return {
        email: user.email,
        subtitle: null,
        type: 'user' as const
      };
    } else if (branchSession?.branchEmail) {
      return {
        email: branchSession.branchEmail,
        subtitle: branchSession.branchName || 'Branch Staff',
        type: 'branch' as const
      };
    }
    return {
      email: '',
      subtitle: null,
      type: null
    };
  };

  const userDisplayInfo = getCurrentUserDisplayInfo();

  const getDashboardPath = () => {
    if (user) {
      return user.email?.includes('admin') ? '/admin' : '/member';
    } else if (branchSession) {
      return `/dashboard/staff/${branchSession.branchId}`;
    }
    return '/';
  };

  const getDashboardLabel = () => {
    if (user) {
      return user.email?.includes('admin') ? 'Admin Dashboard' : 'Member Dashboard';
    } else if (branchSession) {
      return 'Staff Dashboard';
    }
    return 'Dashboard';
  };

  const getUserIcon = () => {
    if (user) {
      return user.email?.includes('admin') ? Shield : User;
    } else if (branchSession) {
      return Building2;
    }
    return User;
  };

  const UserIcon = getUserIcon();

  // FIXED: Debug logging for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Navbar state update:', {
        user: user?.email || 'none',
        branchSession: branchSession?.branchEmail || 'none',
        isLoggedIn,
        currentUserEmail,
        currentUserType,
        userDisplayEmail: userDisplayInfo.email,
        sessionChecked
      });
    }
  }, [user, branchSession, isLoggedIn, currentUserEmail, currentUserType, userDisplayInfo.email, sessionChecked]);

  // Show loading state until session is checked
  if (!sessionChecked) {
    return (
      <nav className="sticky top-0 z-50 glassmorphism">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Dumbbell className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">FitGym Pro</span>
              </Link>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse h-8 w-20 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 glassmorphism">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Dumbbell className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">FitGym Pro</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-foreground hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn && userDisplayInfo.email ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm">{userDisplayInfo.email}</span>
                      {userDisplayInfo.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {userDisplayInfo.subtitle}
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate(getDashboardPath())}>
                    <Settings className="h-4 w-4 mr-2" />
                    {getDashboardLabel()}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={currentUserType === 'user' ? handleSignOut : handleBranchLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                    {branchSession && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Branch)
                      </span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-border">
              {isLoggedIn && userDisplayInfo.email ? (
                <div className="space-y-2">
                  {/* User Info Display */}
                  <div className="px-3 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{userDisplayInfo.email}</div>
                        {userDisplayInfo.subtitle && (
                          <div className="text-xs text-muted-foreground">
                            {userDisplayInfo.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate(getDashboardPath());
                      setIsOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {getDashboardLabel()}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      if (currentUserType === 'user') {
                        handleSignOut();
                      } else {
                        handleBranchLogout();
                      }
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                    {branchSession && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Branch)
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <Button className="w-full" asChild>
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;