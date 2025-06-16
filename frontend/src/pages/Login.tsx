import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dumbbell, Eye, EyeOff, Loader2, Building2, User } from 'lucide-react';
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

  const demoAccounts = [
    { role: 'Admin', email: 'admin@fitgym.com', password: 'admin123', type: 'user' },
    { role: 'Member', email: 'member@fitgym.com', password: 'member123', type: 'user' },
    { role: 'Branch Staff', email: 'staff@downtown.fitgym.com', password: 'branch123', type: 'branch' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLoginType(null);

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
            redirectByUserRole(newProfile.role);
          } else {
            setError('Could not fetch user profile');
          }
          return;
        }

        if (userProfile) {
          redirectByUserRole(userProfile.role);
        } else {
          setError('User profile not found');
        }
        return;
      }

      // Step 2: If regular login failed, try branch credentials
      console.log('📝 Regular login failed, trying branch credentials...');
      console.log('🏢 Attempting branch staff login...');
      
      // FIXED: Correct parameter names and response handling
      const { data: branchData, error: branchError } = await supabase.rpc('authenticate_branch_login', {
        p_branch_email: email,
        p_password: password  // FIXED: was p_branch_password, now p_password
      });

      if (branchError) {
        console.error('❌ Branch login error:', branchError);
        setError('Invalid email or password');
        return;
      }

      // FIXED: Function returns array of rows, get first row
      const result = branchData?.[0];
      if (!result || !result.success) {
        console.error('❌ Branch login failed:', result?.error_message || 'Unknown error');
        setError(result?.error_message || 'Invalid branch credentials');
        return;
      }

      console.log('✅ Branch login successful:', result.branch_data);
      setLoginType('branch');

      // Store branch session info in localStorage for the staff dashboard
      const branchInfo = result.branch_data;
      const sessionData = {
        sessionToken: result.session_token,
        branchId: branchInfo.id,
        branchName: branchInfo.name,
        branchEmail: email,
        loginTime: new Date().toISOString(),
        userType: 'branch_staff'
      };

      localStorage.setItem('branch_session', JSON.stringify(sessionData));
      
      console.log('🚀 Redirecting to branch dashboard for branch:', branchInfo.id);

      // Redirect to staff dashboard with branch ID
      navigate(`/dashboard/staff/${branchInfo.id}`, {  // ← FIXED PATH
        replace: true,
        state: { 
          authenticated: true, 
          branchData: branchInfo,
          sessionToken: result.session_token
        }
      });

    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An unexpected error occurred during login');
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

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(''); // Clear any existing errors
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    
    // Small delay to show the values were filled
    setTimeout(() => {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      document.getElementById('login-form')?.dispatchEvent(event);
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 gym-gradient">
      <div className="w-full max-w-md">
        <Card className="gym-card-gradient border-border">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Dumbbell className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">FitGym Pro</span>
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <p className="text-muted-foreground">
              Sign in to your account or branch dashboard
            </p>
            
            {/* Login Type Indicator */}
            {loginType && (
              <div className="flex items-center justify-center gap-2 mt-2">
                {loginType === 'user' ? (
                  <>
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-500">User Account Login</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">Branch Staff Login</span>
                  </>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background border-border"
                  placeholder="Enter your email or branch email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-background border-border pr-10"
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
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
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="space-y-3">
              <div className="text-center text-sm text-muted-foreground">
                Demo Accounts:
              </div>
              <div className="grid gap-2">
                {demoAccounts.map((account, index) => (
                  <div key={index} className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fillDemo(account.email, account.password)}
                      className="flex-1 justify-start text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {account.type === 'user' ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Building2 className="h-3 w-3" />
                        )}
                        <span className="font-semibold mr-2">{account.role}:</span>
                        <span className="truncate">{account.email}</span>
                      </div>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleQuickLogin(account.email, account.password)}
                      className="px-3"
                      disabled={loading}
                    >
                      Login
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="text-center text-xs text-muted-foreground border-t pt-3">
                <p>💡 <strong>User accounts:</strong> Access admin or member dashboards</p>
                <p>🏢 <strong>Branch credentials:</strong> Access branch staff dashboard</p>
              </div>
            </div>

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>Debug: Check browser console for detailed login logs</p>
                <p>System will try user login first, then branch login if that fails</p>
              </div>
            )}

            <div className="text-center">
              <Button variant="link" asChild>
                <Link to="/">← Back to Website</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;