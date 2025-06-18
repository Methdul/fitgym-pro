import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dumbbell, Eye, EyeOff, Loader2, Building2, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState<'user' | 'branch' | null>(null);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Helper function to create persistent branch session
  const createBranchSession = (branchInfo: any, sessionToken: string, email: string) => {
    const sessionData = {
      sessionToken: sessionToken,
      branchId: branchInfo.id,
      branchName: branchInfo.name,
      branchEmail: email,
      loginTime: new Date().toISOString(),
      userType: 'branch_staff',
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    console.log('💾 Creating persistent branch session:', sessionData);
    
    // Store session in localStorage
    localStorage.setItem('branch_session', JSON.stringify(sessionData));
    
    // Dispatch events to notify navbar
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('branchSessionUpdated', { detail: sessionData }));
    
    // Store backup flag for quick detection
    sessionStorage.setItem('branch_logged_in', 'true');
    
    return sessionData;
  };

  // Helper function to wait for auth state to update
  const waitForAuthUpdate = (maxWait = 2000) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 300); // Give auth context time to update
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLoginType(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Starting login process for:', email);
      
      // Step 1: Try regular Supabase Auth first
      console.log('📝 Attempting regular user login...');
      const { data: userData, error: signInError } = await signIn(email, password);
      
      if (!signInError && userData?.user) {
        console.log('✅ Regular user login successful');
        setLoginType('user');
        
        // Get user profile with role
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', userData.user.id)
          .single();

        if (profileError) {
          console.log('⚠️ Creating user profile...');
          // Create profile if doesn't exist
          const { error: createError } = await supabase
            .from('users')
            .insert({
              auth_user_id: userData.user.id,
              email: userData.user.email || email,
              first_name: 'User',
              last_name: 'Name',
              role: email.includes('admin') ? 'admin' : 'member'
            });

          if (createError) {
            console.error('❌ Profile creation error:', createError);
            setError('Could not create user profile');
            return;
          }

          // Retry getting profile
          const { data: newProfile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', userData.user.id)
            .single();

          if (newProfile) {
            console.log('⏳ Waiting for auth state to update...');
            await waitForAuthUpdate();
            redirectByUserRole(newProfile.role);
          } else {
            setError('Could not fetch user profile');
          }
          return;
        }

        if (userProfile) {
          console.log('⏳ Waiting for auth state to update...');
          await waitForAuthUpdate();
          redirectByUserRole(userProfile.role);
        } else {
          setError('User profile not found');
        }
        return;
      }

      // Step 2: If regular login failed, try branch credentials
      console.log('📝 Regular login failed, trying branch credentials...');
      console.log('🏢 Attempting branch staff login...');
      
      const { data: branchData, error: branchError } = await supabase.rpc('authenticate_branch_login', {
        p_branch_email: email,
        p_password: password
      });

      if (branchError) {
        console.error('❌ Branch login error:', branchError);
        setError('Invalid email or password. Please check your credentials and try again.');
        return;
      }

      const result = branchData?.[0];
      if (!result || !result.success) {
        console.error('❌ Branch login failed:', result?.error_message || 'Unknown error');
        setError('Invalid email or password. Please check your credentials and try again.');
        return;
      }

      console.log('✅ Branch login successful:', result.branch_data);
      setLoginType('branch');

      // Create persistent branch session
      const branchInfo = result.branch_data;
      const sessionData = createBranchSession(branchInfo, result.session_token, email);
      
      // Small delay to ensure session persistence
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🚀 Redirecting to branch dashboard for branch:', branchInfo.id);
      navigate(`/dashboard/staff/${branchInfo.id}`, {
        replace: true,
        state: { 
          authenticated: true, 
          branchData: branchInfo,
          sessionToken: result.session_token,
          sessionData: sessionData
        }
      });
      return;

    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const redirectByUserRole = (role: string) => {
    console.log('🚀 Redirecting user with role:', role);
    
    if (role === 'admin') {
      console.log('➡️ Redirecting to admin dashboard');
      navigate('/admin', { replace: true });
    } else {
      console.log('➡️ Redirecting to member dashboard');
      navigate('/member', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
      
      <div className="relative w-full max-w-md">
        <Card className="backdrop-blur-sm bg-card/80 border-border shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                FitGym Pro
              </span>
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold">Welcome Back</CardTitle>
              <p className="text-muted-foreground text-sm">
                Sign in to access your dashboard
              </p>
            </div>
            
            {/* Login Type Indicator */}
            {loginType && (
              <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50">
                {loginType === 'user' ? (
                  <>
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-500 font-medium">User Account</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">Branch Staff</span>
                  </>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-border focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-background/50 border-border focus:ring-2 focus:ring-primary/20 pr-11"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 font-medium" 
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Access Types</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                  <User className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-foreground">User Account</div>
                    <div>Admin & Members</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                  <Building2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium text-foreground">Branch Staff</div>
                    <div>Staff Dashboard</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Contact Admin
                </Link>
              </div>
              
              <Button variant="ghost" asChild className="group">
                <Link to="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Website
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;