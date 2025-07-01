import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, CreditCard, Calendar, Settings, AlertTriangle, Shield, Activity, TrendingUp, Clock, Star, ChevronRight, RefreshCw, LogOut, Mail, Lock, CheckCircle, XCircle, Eye, EyeOff, Send } from 'lucide-react';
import MemberProfile from '@/components/member/MemberProfile';
import MemberMembership from '@/components/member/MemberMembership';
import { VerificationBanner } from '@/components/VerificationBanner';
import { useToast } from '@/hooks/use-toast';
import { db, auth, supabase } from '@/lib/supabase';
import { Member } from '@/types';

const MemberDashboard = () => {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string>('');
  const [animatedStats, setAnimatedStats] = useState({
    daysRemaining: 0,
    price: 0,
    memberSince: 0
  });

  // Account Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    confirmEmail: '',
    isChanging: false
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    isChanging: false,
    showCurrent: false,
    showNew: false,
    showConfirm: false
  });
  const [verificationForm, setVerificationForm] = useState({
    isSending: false,
    lastSent: null as Date | null
  });

  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 Initializing member dashboard...');
    
    // Add a small delay to ensure auth system is fully initialized
    const initTimer = setTimeout(() => {
      initializeDashboard();
    }, 100);
    
    return () => clearTimeout(initTimer);
  }, []);

  const initializeDashboard = async () => {
    try {
      // First, get the current authenticated user
      console.log('🔐 Getting current user...');
      const { user, error: userError } = await auth.getCurrentUser();
      
      if (userError) {
        console.error('❌ Authentication error:', userError);
        setAuthError('Authentication failed. Please log in again.');
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('❌ No authenticated user found');
        setAuthError('Please log in to access your dashboard.');
        setLoading(false);
        return;
      }

      console.log('✅ Authenticated user found:', {
        id: user.id,
        email: user.email || 'No email'
      });
      setCurrentUser(user);

      // Get verification status from localStorage
      const status = localStorage.getItem('user_verification_status');
      if (status) {
        try {
          setVerificationStatus(JSON.parse(status));
        } catch (error) {
          console.error('Error parsing verification status:', error);
        }
      }

      // Ensure auth session is available for API calls
      try {
        // Check if we have a valid Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          console.log('🔐 Valid Supabase session found, storing for API calls');
          
          // Store the session data in a format the API can use
          const authData = {
            access_token: session.access_token,
            user_id: user.id,
            email: user.email,
            session_token: session.access_token
          };
          
          localStorage.setItem('user_session', JSON.stringify(authData));
          localStorage.setItem('access_token', JSON.stringify(authData));
          
          console.log('🔐 Auth session stored for API calls');
        } else {
          console.warn('⚠️ No valid session found');
        }
      } catch (sessionError) {
        console.warn('⚠️ Could not get/store session:', sessionError);
      }

      // Small delay to ensure auth is properly set up
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fetch member data using the authenticated user's ID
      await fetchMemberData(user.id);
      
    } catch (error) {
      console.error('❌ Dashboard initialization error:', error);
      setAuthError('Failed to initialize dashboard. Please try again.');
      setLoading(false);
    }
  };

  // Animate stats when member data loads
  useEffect(() => {
    if (member) {
      const daysUntilExpiry = getDaysUntilExpiry();
      const memberSinceYear = new Date(member.created_at).getFullYear();
      
      const duration = 1500;
      const steps = 60;
      const interval = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        
        setAnimatedStats({
          daysRemaining: Math.floor(daysUntilExpiry * progress),
          price: Math.floor(member.package_price * progress * 100) / 100,
          memberSince: Math.floor(memberSinceYear * progress)
        });

        if (currentStep >= steps) {
          clearInterval(timer);
          setAnimatedStats({
            daysRemaining: daysUntilExpiry,
            price: member.package_price,
            memberSince: memberSinceYear
          });
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [member]);

  const fetchMemberData = async (userId: string) => {
    try {
      console.log('🔍 Fetching member data for user:', userId);
      console.log('📧 User email:', currentUser?.email || 'Loading...');
      
      // Debug: Check what auth tokens we have
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('auth') || key.includes('session') || key.includes('token')
      );
      console.log('🔐 Available auth keys:', authKeys);
      
      // First, try to get member by user ID using API
      console.log('🔄 Trying API lookup...');
      let { data: memberData, error: memberError } = await db.members.getByUserId(userId);
      
      // If API fails, try direct Supabase query as fallback
      if (memberError || !memberData) {
        console.log('🔄 API lookup failed, trying direct Supabase query...');
        if (memberError) {
          console.log('API Error:', memberError);
        }
        
        try {
          // Get current session for authenticated requests
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Skip user_id lookup if it's causing 406 errors and go straight to email
            const userEmail = currentUser?.email || session.user?.email;
            if (userEmail) {
              console.log('🔍 Trying email lookup for:', userEmail);
              const { data: emailData, error: emailError } = await supabase
                .from('members')
                .select('*')
                .ilike('email', userEmail) // Use ilike for case-insensitive match
                .single();
                
              if (!emailError && emailData) {
                memberData = emailData;
                console.log('✅ Found member via direct Supabase query (email)');
                
                // Only try to update user_id if it's not already set and avoid conflicts
                if (!emailData.user_id || emailData.user_id !== userId) {
                  try {
                    const { error: updateError } = await supabase
                      .from('members')
                      .update({ user_id: userId })
                      .eq('id', emailData.id);
                      
                    if (!updateError) {
                      console.log('✅ Updated member record with user ID');
                    } else {
                      console.log('ℹ️ Could not update user_id (member already linked or conflict):', updateError.message);
                    }
                  } catch (updateError) {
                    console.log('ℹ️ User ID update skipped due to conflict - member already linked');
                  }
                }
              } else {
                console.log('❌ Email lookup also failed:', emailError);
              }
            } else {
              console.log('❌ No email available for lookup');
            }
          } else {
            console.error('❌ No valid session for Supabase queries');
          }
        } catch (directError) {
          console.error('❌ Direct Supabase query failed:', directError);
        }
      }
      
      if (!memberData) {
        const userEmail = currentUser?.email || 'Unknown email';
        console.log('❌ No member record found for user:', userId, 'or email:', userEmail);
        
        setAuthError(
          `No membership found for your account (${userEmail}). 
          
          This could mean:
          • Your membership hasn't been set up yet
          • Your account needs to be linked to your membership
          • There's a data synchronization issue
          
          Please contact support to resolve this issue.`
        );
        setLoading(false);
        return;
      }

      console.log('✅ Member data fetched successfully:', {
        id: memberData.id,
        name: `${memberData.first_name} ${memberData.last_name}`,
        email: memberData.email,
        status: memberData.status,
        package: memberData.package_name
      });

      setMember(memberData);
      setAuthError('');
      
      // Show success toast
      toast({
        title: "Welcome Back!",
        description: `Your membership data has been loaded successfully, ${memberData.first_name}.`,
      });
      
    } catch (error) {
      console.error('❌ Error in fetchMemberData:', error);
      setAuthError(error instanceof Error ? error.message : 'Failed to load member data');
      
      toast({
        title: "Error",
        description: "Failed to load member data. Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🔐 Signing out user...');
      await auth.signOut();
      
      // Clear any stored verification status
      localStorage.removeItem('user_verification_status');
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      // Redirect to login page or home
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshData = async () => {
    console.log('🔄 Refreshing member dashboard data...');
    
    setLoading(true);
    setAuthError('');
    
    // Clear any stale session data
    localStorage.removeItem('user_session');
    localStorage.removeItem('access_token');
    
    // Wait a bit for any pending auth operations
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Re-initialize everything
    await initializeDashboard();
  };

  // Account Settings Functions
  const handleEmailChange = async () => {
    if (!emailForm.newEmail || emailForm.newEmail !== emailForm.confirmEmail) {
      toast({
        title: "Validation Error",
        description: "Please enter matching email addresses",
        variant: "destructive",
      });
      return;
    }

    if (emailForm.newEmail === currentUser?.email) {
      toast({
        title: "No Change",
        description: "The new email is the same as your current email",
        variant: "destructive",
      });
      return;
    }

    setEmailForm(prev => ({ ...prev, isChanging: true }));

    try {
      console.log('📧 Updating email from', currentUser?.email, 'to', emailForm.newEmail);
      
      // Update email in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      });

      if (error) {
        throw error;
      }

      // Update email in member record if exists
      if (member) {
        try {
          await supabase
            .from('members')
            .update({ email: emailForm.newEmail })
            .eq('id', member.id);
          
          // Update local member state
          setMember(prev => prev ? { ...prev, email: emailForm.newEmail } : null);
        } catch (memberError) {
          console.warn('⚠️ Could not update member email:', memberError);
        }
      }

      toast({
        title: "Email Update Initiated",
        description: "Please check your new email address for a confirmation link to complete the change.",
      });

      // Clear form
      setEmailForm({
        newEmail: '',
        confirmEmail: '',
        isChanging: false
      });

    } catch (error) {
      console.error('❌ Email change error:', error);
      toast({
        title: "Email Change Failed",
        description: error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setEmailForm(prev => ({ ...prev, isChanging: false }));
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setPasswordForm(prev => ({ ...prev, isChanging: true }));

    try {
      console.log('🔒 Updating password...');

      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });

      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        isChanging: false,
        showCurrent: false,
        showNew: false,
        showConfirm: false
      });

    } catch (error) {
      console.error('❌ Password change error:', error);
      toast({
        title: "Password Change Failed",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setPasswordForm(prev => ({ ...prev, isChanging: false }));
    }
  };

  const handleSendVerification = async () => {
    setVerificationForm(prev => ({ ...prev, isSending: true }));

    try {
      console.log('📨 Sending verification email...');

      // Send verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentUser?.email || ''
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Verification Email Sent",
        description: `A verification email has been sent to ${currentUser?.email}`,
      });

      setVerificationForm({
        isSending: false,
        lastSent: new Date()
      });

    } catch (error) {
      console.error('❌ Verification email error:', error);
      toast({
        title: "Failed to Send Verification",
        description: error instanceof Error ? error.message : "Failed to send verification email",
        variant: "destructive",
      });
      setVerificationForm(prev => ({ ...prev, isSending: false }));
    }
  };

  const getVerificationCooldown = () => {
    if (!verificationForm.lastSent) return 0;
    const now = new Date().getTime();
    const lastSent = verificationForm.lastSent.getTime();
    const cooldown = 60 * 1000; // 60 seconds
    const remaining = Math.max(0, cooldown - (now - lastSent));
    return Math.ceil(remaining / 1000);
  };

  const handleMemberUpdate = (updatedMember: Member) => {
    setMember(updatedMember);
  };

  const getDaysUntilExpiry = () => {
    if (!member) return 0;
    const expiry = new Date(member.expiry_date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'unknown';
    switch (normalizedStatus) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'expired': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'suspended': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'pending': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'unknown';
    switch (normalizedStatus) {
      case 'active': return <Activity className="h-3 w-3" />;
      case 'expired': return <AlertTriangle className="h-3 w-3" />;
      case 'suspended': return <Clock className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Loading Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black py-20 px-4">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-2xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-400 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-xl mb-2">Loading your dashboard...</p>
            <p className="text-gray-300">Authenticating and fetching your membership data</p>
            <div className="mt-4 text-sm text-gray-400">
              <p>• Verifying authentication</p>
              <p>• Setting up API access</p>
              <p>• Loading membership details</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (authError || !member) {
    return (
      <div className="min-h-screen bg-background">
        {/* Error Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black py-20 px-4 min-h-screen flex items-center">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-400 rounded-full filter blur-2xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-orange-400 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              {authError.includes('log in') || authError.includes('Authentication') ? (
                <Shield className="h-10 w-10 text-red-400" />
              ) : (
                <User className="h-10 w-10 text-orange-400" />
              )}
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {authError.includes('log in') || authError.includes('Authentication') ? 'Authentication Required' : 'Membership Setup Needed'}
            </h2>
            <div className="text-gray-300 mb-8 max-w-2xl mx-auto space-y-3">
              {authError.split('\n').map((line, index) => (
                <p key={index} className={index === 0 ? 'text-lg' : 'text-sm'}>
                  {line.trim()}
                </p>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={refreshData} className="transform hover:scale-105 transition-all duration-300">
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </Button>
              {authError.includes('log in') || authError.includes('Authentication') ? (
                <Button size="lg" variant="outline" asChild className="transform hover:scale-105 transition-all duration-300 text-white border-white hover:bg-white hover:text-gray-900">
                  <a href="/login">
                    <LogOut className="h-5 w-5 mr-2" />
                    Go to Login
                  </a>
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="outline" onClick={handleSignOut} className="transform hover:scale-105 transition-all duration-300 text-white border-white hover:bg-white hover:text-gray-900">
                    <LogOut className="h-5 w-5 mr-2" />
                    Sign Out
                  </Button>
                  <Button size="lg" variant="outline" asChild className="transform hover:scale-105 transition-all duration-300 text-white border-white hover:bg-white hover:text-gray-900">
                    <a href="/contact">
                      <User className="h-5 w-5 mr-2" />
                      Contact Support
                    </a>
                  </Button>
                </>
              )}
            </div>
            
            {currentUser?.email && !authError.includes('Authentication') && (
              <div className="mt-8 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-gray-300">
                  <strong>Logged in as:</strong> {currentUser.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  User ID: {currentUser.id}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  If this email should have a membership, please contact support with this information.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black py-16 px-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-400 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-3/4 left-1/3 w-28 h-28 bg-green-400 rounded-full filter blur-2xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white">
            <div className="animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome back, <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{member.first_name}</span>!
              </h1>
              <p className="text-xl text-gray-300 mb-4">Manage your membership and stay on track with your fitness goals</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  <span className="text-green-400">Secure Member Portal</span>
                </div>
                {currentUser && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{currentUser.email}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-in-delay">
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(member?.status || 'unknown')} px-4 py-2 text-sm font-medium`}>
                  {getStatusIcon(member?.status || 'unknown')}
                  <span className="ml-2">{(member?.status || 'Unknown').charAt(0).toUpperCase() + (member?.status || 'unknown').slice(1)}</span>
                </Badge>
                <Badge variant="outline" className="px-4 py-2 text-sm border-white/20 text-white">
                  <Star className="h-3 w-3 mr-2" />
                  {member?.package_type || 'N/A'} • {member?.package_name || 'No Package'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshData} disabled={loading} className="text-white border-white/20 hover:bg-white/10">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="text-white border-white/20 hover:bg-white/10">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* Verification Banner */}
        {verificationStatus && !verificationStatus.isVerified && (
          <div className="-mt-8 relative z-10 mb-6">
            <VerificationBanner 
              userEmail={verificationStatus.email}
              isVerified={verificationStatus.isVerified}
              onVerificationComplete={() => {
                setVerificationStatus(prev => ({ ...prev, isVerified: true }));
              }}
            />
          </div>
        )}

        {/* Animated Stats Section */}
        <section className="py-16 -mt-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Membership Status</CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <User className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize group-hover:text-primary transition-colors duration-300">
                  {member?.status || 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {member?.is_verified ? 'Verified Account' : 'Pending Verification'}
                </p>
              </CardContent>
            </Card>

            <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold group-hover:scale-110 transition-transform duration-300 ${
                  daysUntilExpiry > 30 ? 'text-green-600' : 
                  daysUntilExpiry > 7 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {animatedStats.daysRemaining > 0 ? animatedStats.daysRemaining : 0}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  Until membership expires
                </p>
              </CardContent>
            </Card>

            <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Package</CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                  ${member?.package_price ? animatedStats.price.toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {member?.package_name || 'No Package Selected'}
                </p>
              </CardContent>
            </Card>

            <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                  {animatedStats.memberSince}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {new Date(member.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Enhanced Expiry Warning */}
        {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
          <section className="pb-6">
            <Card className="border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardContent className="flex items-center gap-4 pt-6 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Your membership expires in {daysUntilExpiry} day{daysUntilExpiry > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Contact our staff to renew your membership and continue enjoying all benefits.
                  </p>
                </div>
                <Button variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-500 hover:text-white transition-all duration-300">
                  Renew Now
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Enhanced Main Content */}
        <section className="py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 p-1 bg-muted/50">
              <TabsTrigger value="overview" className="relative">
                <User className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="profile" className="relative">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="membership" className="relative">
                <CreditCard className="h-4 w-4 mr-2" />
                Membership
              </TabsTrigger>
              <TabsTrigger value="settings" className="relative">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      Quick Actions
                    </CardTitle>
                    <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                      Manage your account efficiently
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 relative z-10">
                    <button 
                      onClick={() => setActiveTab('profile')} 
                      className="w-full p-4 text-left border rounded-xl hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group/item"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium group-hover/item:text-primary transition-colors duration-300">Update Profile</p>
                            <p className="text-sm text-muted-foreground">Edit your personal information</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover/item:text-primary group-hover/item:translate-x-1 transition-all duration-300" />
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('membership')} 
                      className="w-full p-4 text-left border rounded-xl hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group/item"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300">
                            <CreditCard className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium group-hover/item:text-primary transition-colors duration-300">View Membership Details</p>
                            <p className="text-sm text-muted-foreground">Check your package and renewals</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover/item:text-primary group-hover/item:translate-x-1 transition-all duration-300" />
                      </div>
                    </button>
                    
                    <div className="w-full p-4 border rounded-xl bg-muted/30 group/item">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-lg flex items-center justify-center">
                            <Settings className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">Account Settings</p>
                            <p className="text-sm text-muted-foreground">Password, email & security settings</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      Membership Summary
                      <Badge variant="outline" className="text-xs">Live Data</Badge>
                    </CardTitle>
                    <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                      Your current membership details from database
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Package</span>
                          <span className="text-sm font-semibold">{member?.package_name || 'No Package'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
                          <span className="text-sm font-semibold capitalize">{member?.package_type || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</span>
                          <span className="text-sm font-bold text-green-600">${member?.package_price || '0.00'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</span>
                          <span className="text-sm font-semibold">
                            {member?.start_date ? new Date(member.start_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expires</span>
                          <span className="text-sm font-semibold">
                            {member?.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                          <Badge variant={member?.is_verified ? "default" : "secondary"} className="w-fit">
                            {member?.is_verified ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Membership Progress */}
              <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    Membership Progress
                  </CardTitle>
                  <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                    Track your membership journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Membership Duration</span>
                      <span className="font-semibold">
                        {member?.start_date ? 
                          Math.floor((new Date().getTime() - new Date(member.start_date).getTime()) / (1000 * 60 * 60 * 24)) 
                          : 0} days active
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-blue-500 h-2 rounded-full transition-all duration-500 group-hover:shadow-lg"
                        style={{
                          width: `${Math.min(100, Math.max(0, 100 - (daysUntilExpiry / 365) * 100))}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Started: {member?.start_date ? new Date(member.start_date).toLocaleDateString() : 'N/A'}</span>
                      <span>Expires: {member?.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-8">
              {/* Account Security */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Email Management */}
                <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      Email Settings
                    </CardTitle>
                    <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                      Manage your email address and verification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    {/* Current Email */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Current Email</Label>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{currentUser?.email || 'Loading...'}</span>
                        <Badge variant={currentUser?.email_confirmed_at ? "default" : "secondary"} className="ml-auto">
                          {currentUser?.email_confirmed_at ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Verified</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" />Unverified</>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Verification Section */}
                    {!currentUser?.email_confirmed_at && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              Email Verification Required
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              Please verify your email address to secure your account and receive important updates.
                            </p>
                            <Button 
                              size="sm" 
                              className="mt-3"
                              onClick={handleSendVerification}
                              disabled={verificationForm.isSending || getVerificationCooldown() > 0}
                            >
                              {verificationForm.isSending ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : getVerificationCooldown() > 0 ? (
                                `Resend in ${getVerificationCooldown()}s`
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  {verificationForm.lastSent ? 'Resend Verification' : 'Send Verification'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Change Email Form */}
                    <div className="space-y-4 border-t pt-4">
                      <Label className="text-sm font-medium">Change Email Address</Label>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="newEmail" className="text-sm">New Email</Label>
                          <Input
                            id="newEmail"
                            type="email"
                            value={emailForm.newEmail}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                            placeholder="Enter new email address"
                            disabled={emailForm.isChanging}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="confirmEmail" className="text-sm">Confirm New Email</Label>
                          <Input
                            id="confirmEmail"
                            type="email"
                            value={emailForm.confirmEmail}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, confirmEmail: e.target.value }))}
                            placeholder="Confirm new email address"
                            disabled={emailForm.isChanging}
                          />
                        </div>
                        
                        <Button 
                          onClick={handleEmailChange}
                          disabled={emailForm.isChanging || !emailForm.newEmail || emailForm.newEmail !== emailForm.confirmEmail}
                          className="w-full"
                        >
                          {emailForm.isChanging ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Updating Email...
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" />
                              Update Email
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Password Management */}
                <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                        <Lock className="h-5 w-5 text-white" />
                      </div>
                      Password Security
                    </CardTitle>
                    <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                      Update your account password
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    {/* Password Change Form */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={passwordForm.showCurrent ? "text" : "password"}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Enter current password"
                            disabled={passwordForm.isChanging}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setPasswordForm(prev => ({ ...prev, showCurrent: !prev.showCurrent }))}
                            disabled={passwordForm.isChanging}
                          >
                            {passwordForm.showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={passwordForm.showNew ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter new password (min. 6 characters)"
                            disabled={passwordForm.isChanging}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setPasswordForm(prev => ({ ...prev, showNew: !prev.showNew }))}
                            disabled={passwordForm.isChanging}
                          >
                            {passwordForm.showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={passwordForm.showConfirm ? "text" : "password"}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm new password"
                            disabled={passwordForm.isChanging}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setPasswordForm(prev => ({ ...prev, showConfirm: !prev.showConfirm }))}
                            disabled={passwordForm.isChanging}
                          >
                            {passwordForm.showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Password Requirements */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Password requirements:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                          <li className={passwordForm.newPassword.length >= 6 ? 'text-green-600' : ''}>
                            At least 6 characters
                          </li>
                          <li className={passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword ? 'text-green-600' : ''}>
                            Passwords match
                          </li>
                        </ul>
                      </div>
                      
                      <Button 
                        onClick={handlePasswordChange}
                        disabled={
                          passwordForm.isChanging || 
                          !passwordForm.currentPassword || 
                          !passwordForm.newPassword || 
                          passwordForm.newPassword !== passwordForm.confirmPassword ||
                          passwordForm.newPassword.length < 6
                        }
                        className="w-full"
                      >
                        {passwordForm.isChanging ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Updating Password...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Account Security Info */}
              <Card className="gym-card-gradient border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    Account Security
                  </CardTitle>
                  <CardDescription>
                    Tips to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-600">✅ Security Best Practices</h4>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li>• Use a strong, unique password</li>
                        <li>• Keep your email address verified</li>
                        <li>• Don't share your login credentials</li>
                        <li>• Sign out from shared devices</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-blue-600">📧 Email Notifications</h4>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li>• Membership expiry reminders</li>
                        <li>• Password change confirmations</li>
                        <li>• Account security alerts</li>
                        <li>• Promotional offers (optional)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <MemberProfile member={member} />
            </TabsContent>

            <TabsContent value="membership">
              <MemberMembership member={member} onMemberUpdate={handleMemberUpdate} />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s both;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .delay-2000 {
          animation-delay: 2s;
        }
        
        /* Professional hover animations */
        .group:hover .transform {
          transform: translateY(-2px);
        }
        
        /* Smooth transitions for all interactive elements */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default MemberDashboard;