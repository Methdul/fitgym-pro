import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Check for branch session on mount and storage changes
  useEffect(() => {
    const checkBranchSession = () => {
      const sessionData = localStorage.getItem('branch_session');
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          setBranchSession(session);
        } catch (error) {
          console.error('Invalid branch session data:', error);
          localStorage.removeItem('branch_session');
          setBranchSession(null);
        }
      } else {
        setBranchSession(null);
      }
    };

    // Check on mount
    checkBranchSession();

    // Listen for storage changes (in case user logs out from another tab)
    window.addEventListener('storage', checkBranchSession);
    
    // Check periodically in case localStorage changes from same tab
    const interval = setInterval(checkBranchSession, 1000);

    return () => {
      window.removeEventListener('storage', checkBranchSession);
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = async () => {
    // Sign out from regular auth
    await signOut();
    navigate('/');
  };

  const handleBranchLogout = () => {
    // Clear branch session
    localStorage.removeItem('branch_session');
    setBranchSession(null);
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Branches', path: '/branches' },
    { name: 'Partnerships', path: '/partnerships' },
  ];

  // Determine current user type and display info
  const isLoggedIn = user || branchSession;
  const currentUserEmail = user?.email || branchSession?.branchEmail;
  const currentUserType = user ? 'user' : branchSession ? 'branch' : null;

  const getDashboardPath = () => {
    if (user) {
      // Check user role from profile (you might want to get this from your user profile)
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
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm">{currentUserEmail}</span>
                      {branchSession && (
                        <span className="text-xs text-muted-foreground">
                          {branchSession.branchName}
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
              {isLoggedIn ? (
                <div className="space-y-2">
                  {/* User Info Display */}
                  <div className="px-3 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{currentUserEmail}</div>
                        {branchSession && (
                          <div className="text-xs text-muted-foreground">
                            {branchSession.branchName}
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