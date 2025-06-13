import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dumbbell, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const demoAccounts = [
    { role: 'Admin', email: 'admin@fitgym.com', password: 'admin123' },
    { role: 'Member', email: 'member@fitgym.com', password: 'member123' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Starting login process for:', email);
      
      // Step 1: Sign in with Supabase Auth
      const { data, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        setError(signInError.message || 'Login failed');
        return;
      }

      if (!data?.user) {
        console.error('❌ No user data returned');
        setError('Login failed - no user data');
        return;
      }

      console.log('✅ Sign in successful, user ID:', data.user.id);

      // Step 2: Get user profile with role
      console.log('📋 Fetching user profile...');
      
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        // If profile doesn't exist, create a basic one
        const { error: createError } = await supabase
          .from('users')
          .insert({
            auth_user_id: data.user.id,
            email: data.user.email || email,
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
          .eq('auth_user_id', data.user.id)
          .single();

        if (newProfile) {
          console.log('✅ Profile created and fetched:', newProfile.role);
          redirectByRole(newProfile.role);
        } else {
          setError('Could not fetch user profile');
        }
        return;
      }

      if (!userProfile) {
        console.error('❌ No user profile found');
        setError('User profile not found');
        return;
      }

      console.log('✅ User profile found:', {
        email: userProfile.email,
        role: userProfile.role,
        name: `${userProfile.first_name} ${userProfile.last_name}`
      });

      // Step 3: Route based on role
      redirectByRole(userProfile.role);

    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An unexpected error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role: string) => {
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
            <p className="text-muted-foreground">Sign in to your account</p>
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
                  placeholder="Enter your email"
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
                      <span className="font-semibold mr-2">{account.role}:</span>
                      {account.email}
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
            </div>

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground text-center">
                Debug: Check browser console for detailed login logs
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