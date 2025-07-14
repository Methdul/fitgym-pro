import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';  // ✅ ADDED: For staff view detection
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';  // ✅ ADDED: For staff banner
import { User, CreditCard, Calendar, Settings, AlertTriangle, Shield, Activity, TrendingUp, Clock, Star, ChevronRight, RefreshCw, LogOut, Mail, Lock, CheckCircle, XCircle, Eye, EyeOff, Send } from 'lucide-react';
import MemberProfile from '@/components/member/MemberProfile';
import MemberMembership from '@/components/member/MemberMembership';
import { VerificationBanner } from '@/components/VerificationBanner';
import { useToast } from '@/hooks/use-toast';
import { db, auth, supabase } from '@/lib/supabase';
import { Member } from '@/types';

const MemberDashboard = () => {
  // ✅ ADDED: Staff view detection
  const { memberId } = useParams();
  const [searchParams] = useSearchParams();
  const isStaffView = searchParams.get('staffView') === 'true';

  // Your existing state (unchanged)
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

  // Account Settings State (unchanged)
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

  // ✅ MODIFIED: Updated useEffect to handle staff view
  useEffect(() => {
    console.log('🔄 Initializing member dashboard...');
    console.log('🎯 Staff view mode:', isStaffView);
    if (isStaffView) {
      console.log('👤 Member ID from URL:', memberId);
    }
    
    // Add a small delay to ensure auth system is fully initialized
    const initTimer = setTimeout(() => {
      initializeDashboard();
    }, 100);
    
    return () => clearTimeout(initTimer);
  }, [memberId, isStaffView]); // ✅ ADDED: Dependencies for staff view

  // Listen for auth changes (email verification completion)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.email);
        
        if (event === 'USER_UPDATED' && session?.user) {
          const newEmail = session.user.email;
          const oldEmail = currentUser?.email;
          
          // Check if email actually changed and is different
          if (newEmail && oldEmail && newEmail !== oldEmail) {
            console.log('📧 Email verification completed:', oldEmail, '→', newEmail);
            
            // NOW update database tables to match the verified auth email
            try {
              if (member) {
                console.log('🔄 Updating database with verified email...');
                
                // Update member table
                const { error: memberError } = await supabase
                  .from('members')
                  .update({ email: newEmail })
                  .eq('id', member.id);
                
                if (!memberError) {
                  console.log('✅ Updated member email after verification');
                }

                // Update users table
                const { error: userError } = await supabase
                  .from('users')
                  .update({ email: newEmail })
                  .eq('auth_user_id', session.user.id);
                
                if (!userError) {
                  console.log('✅ Updated user email after verification');
                }

                // Update local state
                setMember(prev => prev ? { ...prev, email: newEmail } : null);
                setCurrentUser(session.user);

                toast({
                  title: "Email Updated Successfully! ✅",
                  description: `Your email has been changed to ${newEmail} and is now active for login.`,
                });
              }
            } catch (error) {
              console.error('❌ Error updating database after verification:', error);
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [member, currentUser]);

  // ✅ MODIFIED: Updated initialization to handle both regular and staff view
  const initializeDashboard = async () => {
    try {
      if (isStaffView && memberId) {
        // ✅ STAFF VIEW: Fetch specific member data by ID
        console.log('🔧 Staff view: Fetching member data for ID:', memberId);
        await fetchMemberDataById(memberId);
      } else {
        // ✅ REGULAR VIEW: Your existing logic (unchanged)
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
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            console.log('🔐 Valid Supabase session found, storing for API calls');
            
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

        await new Promise(resolve => setTimeout(resolve, 100));
        await fetchMemberData(user.id);
      }
    } catch (error) {
      console.error('❌ Dashboard initialization error:', error);
      setAuthError('Failed to initialize dashboard. Please try again.');
      setLoading(false);
    }
  };

  // ✅ ADDED: New function to fetch member data by ID for staff view
  const fetchMemberDataById = async (memberIdToFetch: string) => {
    try {
      console.log('📊 Fetching member data by ID:', memberIdToFetch);
      
      // Try direct API call for staff view
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/${memberIdToFetch}?refresh=${Date.now()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getStaffAuthHeaders()
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data) {
          console.log('✅ Member data fetched successfully:', result.data);
          setMember(result.data);
          setAuthError('');
          
          // Trigger animation for staff view
          setTimeout(() => {
            const expiryDate = new Date(result.data.expiry_date);
            const today = new Date();
            const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const memberSinceYear = new Date(result.data.created_at).getFullYear();
            
            setAnimatedStats({
              daysRemaining: Math.max(0, daysRemaining),
              price: parseFloat(result.data.package_price || 0),
              memberSince: memberSinceYear
            });
          }, 500);
          
          setLoading(false);
          return;
        }
      }

      // Fallback: Try direct Supabase query
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberIdToFetch)
        .order('updated_at', { ascending: false })
        .single();

      if (!memberError && memberData) {
        console.log('✅ Found member via direct Supabase query');
        setMember(memberData);
        setAuthError('');
        
        // Trigger animation
        setTimeout(() => {
          const expiryDate = new Date(memberData.expiry_date);
          const today = new Date();
          const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const memberSinceYear = new Date(memberData.created_at).getFullYear();
          
          setAnimatedStats({
            daysRemaining: Math.max(0, daysRemaining),
            price: parseFloat(memberData.package_price || 0),
            memberSince: memberSinceYear
          });
        }, 500);
      } else {
        throw new Error(memberError?.message || 'Member not found');
      }
    } catch (error) {
      console.error('❌ Error fetching member data by ID:', error);
      setAuthError(`Failed to load member data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADDED: Helper function for staff auth headers
  const getStaffAuthHeaders = () => {
    const staffSession = localStorage.getItem('branchSession');
    if (staffSession) {
      try {
        const session = JSON.parse(staffSession);
        return {
          'Authorization': `Bearer ${session.sessionToken}`,
          'X-Branch-ID': session.branchId
        };
      } catch (e) {
        console.warn('Could not parse staff session');
      }
    }
    
    const userSession = localStorage.getItem('user_session');
    if (userSession) {
      try {
        const session = JSON.parse(userSession);
        return {
          'Authorization': `Bearer ${session.access_token}`
        };
      } catch (e) {
        console.warn('Could not parse user session');
      }
    }
    
    return {};
  };

  // Your existing animate stats effect (unchanged)
  useEffect(() => {
    if (member && !isStaffView) { // Only animate for regular view to avoid conflicts
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
  }, [member, isStaffView]);

  // Your existing fetchMemberData function (unchanged)
  const fetchMemberData = async (userId: string) => {
    try {
      console.log('🔍 Fetching member data for user:', userId);
      console.log('📧 User email:', currentUser?.email || 'Loading...');
      
      // Debug: Check what auth tokens we have
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('auth') || key.includes('session') || key.includes('token')
      );
      console.log('🔐 Available auth keys:', authKeys);
      
      // Skip API lookup - go straight to direct Supabase query
      console.log('🔄 Using direct Supabase query (skipping API)...');
      let memberData = null;
      let memberError = { message: 'Skipping API - using direct query' };

      // Always use direct Supabase query
      if (true) { // Always use direct query instead of API
        console.log('🔄 Using direct Supabase query...');
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

      // ✅ REPAIR: Handle existing split-brain email cases
      // First, get userEmail from the current context
      const userEmail = currentUser?.email || 'Unknown email';

      if (!memberData && userEmail && userEmail !== 'Unknown email') {
        console.log('🔧 Attempting to repair split-brain email case...');
        
        try {
          // Try to find member by checking various combinations
          const { data: potentialMembers } = await supabase
            .from('members')
            .select('*')
            .or(`email.ilike.${userEmail},user_id.eq.${userId}`);
          
          if (potentialMembers && potentialMembers.length > 0) {
            const memberToRepair = potentialMembers[0];
            console.log('🔧 Found member to repair:', memberToRepair.email, '(auth email:', userEmail, ')');
            
            // If emails don't match, fix the member email to match auth
            if (memberToRepair.email !== userEmail) {
              console.log('🔧 Repairing member email to match auth...');
              const { error: repairError } = await supabase
                .from('members')
                .update({ 
                  email: userEmail,
                  user_id: userId 
                })
                .eq('id', memberToRepair.id);
              
              if (!repairError) {
                memberData = { ...memberToRepair, email: userEmail, user_id: userId };
                console.log('✅ Repair successful - member email synchronized');
                
                toast({
                  title: "Account Synchronized",
                  description: "Your account has been automatically synchronized.",
                });
              }
            } else {
              memberData = memberToRepair;
              console.log('✅ Found member via repair lookup');
            }
          }
        } catch (repairError) {
          console.log('⚠️ Repair attempt failed:', repairError);
        }
      }

      if (!memberData) {
        console.log('❌ No member record found for user:', userId, 'or email:', userEmail);
        
        setAuthError(
          `No membership found for your account (${userEmail}). This could mean your membership hasn't been set up yet, your account needs to be linked to your membership, or there's a data synchronization issue. Please contact support to resolve this issue.`
        );
        setLoading(false);
        return;
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

  // Your existing functions (unchanged)
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
    console.log('🔄 Force refreshing member dashboard data...');
    
    setLoading(true);
    setAuthError('');
    
    // ✅ FORCE REFRESH: Clear all cached data first
    setMember(null);
    setAnimatedStats({ daysRemaining: 0, price: 0, memberSince: 0 });
    
    if (isStaffView && memberId) {
      // ✅ FORCE REFRESH: Add cache-busting for staff view
      await fetchMemberDataById(memberId);
    } else {
      // Clear any stale session data
      localStorage.removeItem('user_session');
      localStorage.removeItem('access_token');
      
      // Wait a bit for any pending auth operations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Re-initialize everything
      await initializeDashboard();
    }
    
    // ✅ SUCCESS FEEDBACK
    toast({
      title: "Data Refreshed",
      description: "All membership information has been updated from the database.",
    });
  };

  // ✅ PHASE 4: Enhanced refresh method for real-time updates
  // ✅ PHASE 4: Enhanced refresh method for real-time updates
  const refreshMemberData = async () => {
    console.log('🔄 Refreshing member data only...');
    
    try {
      // Clear any cached data first
      setMember(null);
      setAnimatedStats({ daysRemaining: 0, price: 0, memberSince: 0 });
      
      if (isStaffView && memberId) {
        await fetchMemberDataById(memberId);
      } else if (currentUser) {
        await fetchMemberData(currentUser.id);
      }
      
      toast({
        title: "Data Refreshed",
        description: "Membership information has been updated.",
      });
    } catch (error) {
      console.error('❌ Error refreshing member data:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh membership data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ✅ UPDATED: Enhanced email change to update all related tables
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
      console.log('📧 Starting SAFE email update from', currentUser?.email, 'to', emailForm.newEmail);
      
      // ✅ STEP 1: Send verification email ONLY (do not update database yet)
      const { data, error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      });

      if (error) {
        throw error;
      }

      console.log('✅ Verification email sent - database will update after verification');

      // ✅ STEP 2: Show verification-pending message (no database updates)
      toast({
        title: "Email Verification Required",
        description: `Please check your inbox at ${emailForm.newEmail} and click the verification link. Your account will be updated automatically after verification.`,
      });

      // ✅ STEP 3: Clear form but don't update database or local state yet
      setEmailForm({
        newEmail: '',
        confirmEmail: '',
        isChanging: false
      });

      // Note: Database updates will happen automatically when verification completes

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

  // ✅ REPLACED: Password reset via email link instead of current password
  const handlePasswordReset = async () => {
    if (!currentUser?.email) {
      toast({
        title: "Error",
        description: "No email address found for password reset",
        variant: "destructive",
      });
      return;
    }

    setPasswordForm(prev => ({ ...prev, isChanging: true }));

    try {
      console.log('🔒 Sending password reset email to:', currentUser.email);

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password Reset Email Sent",
        description: `A password reset link has been sent to ${currentUser.email}. Please check your inbox and follow the instructions to reset your password.`,
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
      console.error('❌ Password reset error:', error);
      toast({
        title: "Password Reset Failed",
        description: error instanceof Error ? error.message : "Failed to send password reset email",
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

  // ✅ MODIFIED: Updated to handle staff view
  const handleMemberUpdate = (updatedMember: Member) => {
    // Force complete data refresh instead of just updating state
    console.log('🔄 Member updated, forcing complete refresh...');
    
    // Clear current data to force fresh fetch
    setMember(null);
    setAnimatedStats({ daysRemaining: 0, price: 0, memberSince: 0 });
    
    // Refresh after a short delay
    setTimeout(async () => {
      await refreshMemberData();
    }, 500);
    
    if (!isStaffView) {
      toast({
        title: "Profile Updated",
        description: "Your member profile has been updated successfully.",
      });
    }
  };

  // ✅ ADDED: Function to get actual member status based on expiry date
  const getActualMemberStatus = (member: Member) => {
    if (!member) return 'unknown';
    
    const today = new Date();
    const expiryDate = new Date(member.expiry_date);
    
    // If membership is expired (past expiry date)
    if (expiryDate < today) {
      return 'expired';
    }
    
    // If database status is suspended, keep it
    if (member.status === 'suspended') {
      return 'suspended';
    }
    
    // If not expired and not suspended, it's active
    return 'active';
  };

  // Your existing helper functions (unchanged)
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

  // Your existing loading state (unchanged)
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
            <p className="text-xl mb-2">
              {isStaffView ? 'Loading member dashboard...' : 'Loading your dashboard...'}
            </p>
            <p className="text-gray-300">
              {isStaffView ? 'Fetching member information' : 'Authenticating and fetching your membership data'}
            </p>
            {!isStaffView && (
              <div className="mt-4 text-sm text-gray-400">
                <p>• Verifying authentication</p>
                <p>• Setting up API access</p>
                <p>• Loading membership details</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // Your existing error state (unchanged)
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
              {authError.includes('log in') || authError.includes('Authentication') ? 'Authentication Required' : 
               isStaffView ? 'Member Access Error' : 'Membership Setup Needed'}
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
              {(authError.includes('log in') || authError.includes('Authentication')) && !isStaffView ? (
                <Button size="lg" variant="outline" asChild className="transform hover:scale-105 transition-all duration-300 text-white border-white hover:bg-white hover:text-gray-900">
                  <a href="/login">
                    <LogOut className="h-5 w-5 mr-2" />
                    Go to Login
                  </a>
                </Button>
              ) : !isStaffView ? (
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
              ) : null}
            </div>
            
            {currentUser?.email && !authError.includes('Authentication') && !isStaffView && (
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
      {/* ✅ ADDED: Staff View Banner */}
      {isStaffView && (
        <Alert className="m-4 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Staff View - Read Only Mode</strong>
            <br />
            You are viewing this member's dashboard. All editing capabilities are disabled.
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ MODIFIED: Hero Section with staff view support */}
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
                {isStaffView ? (
                  <>
                    <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                      {member.first_name} {member.last_name}
                    </span>'s Dashboard
                  </>
                ) : (
                  <>
                    Welcome back, <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{member.first_name}</span>!
                  </>
                )}
              </h1>
              <p className="text-xl text-gray-300 mb-4">
                {isStaffView 
                  ? 'Viewing member profile and membership information'
                  : 'Manage your membership and stay on track with your fitness goals'
                }
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  <span className="text-green-400">
                    {isStaffView ? 'Staff Portal Access' : 'Secure Member Portal'}
                  </span>
                </div>
                {currentUser && !isStaffView && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{currentUser.email}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-in-delay">
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(getActualMemberStatus(member) || 'unknown')} px-4 py-2 text-sm font-medium`}>
                  {getStatusIcon(getActualMemberStatus(member) || 'unknown')}
                  <span className="ml-2">{(getActualMemberStatus(member) || 'Unknown').charAt(0).toUpperCase() + (getActualMemberStatus(member) || 'unknown').slice(1)}</span>
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
                {!isStaffView && (
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="text-white border-white/20 hover:bg-white/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* Verification Banner - Only show in regular member view */}
        {!isStaffView && verificationStatus && !verificationStatus.isVerified && (
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

        {/* Your existing animated stats section (unchanged) */}
        <section className="py-16 -mt-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Membership Status</CardTitle>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                  getActualMemberStatus(member) === 'expired' 
                    ? 'bg-gradient-to-br from-red-500 to-red-600'
                    : getActualMemberStatus(member) === 'suspended'
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                    : 'bg-gradient-to-br from-green-500 to-teal-600'
                }`}>
                  <User className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold capitalize group-hover:text-primary transition-colors duration-300 ${
                  getActualMemberStatus(member) === 'expired' ? 'text-red-600' :
                  getActualMemberStatus(member) === 'suspended' ? 'text-yellow-600' :
                  getActualMemberStatus(member) === 'active' ? 'text-green-600' : ''
                }`}>
                  {getActualMemberStatus(member) || 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {member?.is_verified ? 'Verified Account' : 'Pending Verification'}
                </p>
              </CardContent>
            </Card>

            <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                  getActualMemberStatus(member) === 'expired' 
                    ? 'bg-gradient-to-br from-red-500 to-red-600' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold group-hover:scale-110 transition-transform duration-300 ${
                  getActualMemberStatus(member) === 'expired' ? 'text-red-600' :
                  daysUntilExpiry > 30 ? 'text-green-600' : 
                  daysUntilExpiry > 7 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {getActualMemberStatus(member) === 'expired' ? 'EXPIRED' : (animatedStats.daysRemaining > 0 ? animatedStats.daysRemaining : 0)}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {getActualMemberStatus(member) === 'expired' 
                    ? `${Math.abs(daysUntilExpiry)} days ago`
                    : 'Until membership expires'
                  }
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

        {/* Enhanced Expiry Warning - Only show when 7 days or less remaining */}
        {!isStaffView && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
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
              </CardContent>
            </Card>
          </section>
        )}

        {/* ✅ NEW: Expired Membership Warning */}
        {!isStaffView && getActualMemberStatus(member) === 'expired' && (
          <section className="pb-6">
            <Card className="border-red-500/20 bg-gradient-to-r from-red-500/5 via-red-600/5 to-red-700/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardContent className="flex items-center gap-4 pt-6 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    Your membership has expired {Math.abs(daysUntilExpiry)} day{Math.abs(daysUntilExpiry) > 1 ? 's' : ''} ago
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Please contact our staff to renew your membership and regain access to all facilities and benefits.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ✅ MODIFIED: Enhanced Main Content with staff view support */}
        <section className="py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* ✅ MODIFIED: Conditional tabs for staff view */}
            <TabsList className={`grid w-full ${isStaffView ? 'grid-cols-2' : 'grid-cols-4'} p-1 bg-muted/50`}>
              <TabsTrigger value="overview" className="relative">
                <User className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="profile" className="relative">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              {/* Hide membership and settings tabs in staff view */}
              {!isStaffView && (
                <>
                  <TabsTrigger value="membership" className="relative">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Membership
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="relative">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Your existing tab contents with minimal modifications */}
            <TabsContent value="overview" className="space-y-8">
              {/* Your existing overview content (unchanged) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      {isStaffView ? 'Member Actions' : 'Quick Actions'}
                    </CardTitle>
                    <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                      {isStaffView ? 'View member information' : 'Manage your account efficiently'}
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
                            <p className="font-medium group-hover/item:text-primary transition-colors duration-300">
                              {isStaffView ? 'View Profile' : 'Update Profile'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isStaffView ? 'View member personal information' : 'Edit your personal information'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover/item:text-primary group-hover/item:translate-x-1 transition-all duration-300" />
                      </div>
                    </button>
                    
                    {!isStaffView && (
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
                    )}
                    
                    {!isStaffView && (
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
                          <Badge variant="secondary" className="text-xs">Available</Badge>
                        </div>
                      </div>
                    )}
                    
                    {isStaffView && (
                      <div className="w-full p-4 border rounded-xl bg-blue-50 dark:bg-blue-950/30 group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center">
                            <Shield className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-blue-800 dark:text-blue-200">Staff View Active</p>
                            <p className="text-sm text-blue-600 dark:text-blue-300">You are viewing this member's information in read-only mode</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Your existing membership summary card (unchanged) */}
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
                      {isStaffView ? "Member's current membership details" : "Your current membership details from database"}
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

              {/* Your existing membership progress card (unchanged) */}
              <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    Membership Progress
                  </CardTitle>
                  <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                    {getActualMemberStatus(member) === 'expired' 
                      ? (isStaffView ? "Member's expired membership" : "Your expired membership") 
                      : (isStaffView ? "Track member's membership journey" : "Track your membership journey")
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>
                        {getActualMemberStatus(member) === 'expired' ? 'Membership Period' : 'Membership Duration'}
                      </span>
                      <span className="font-semibold">
                        {getActualMemberStatus(member) === 'expired' ? (
                          <span className="text-red-600 font-bold">EXPIRED</span>
                        ) : (
                          <>
                            {member?.start_date ? 
                              Math.floor((new Date().getTime() - new Date(member.start_date).getTime()) / (1000 * 60 * 60 * 24)) 
                              : 0} days since start
                          </>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 group-hover:shadow-lg ${
                          getActualMemberStatus(member) === 'expired' 
                            ? 'bg-gradient-to-r from-red-500 to-red-600' 
                            : 'bg-gradient-to-r from-primary to-blue-500'
                        }`}
                        style={{
                          width: `${(() => {
                            if (!member?.start_date || !member?.expiry_date) return 0;
                            
                            const startDate = new Date(member.start_date);
                            const expiryDate = new Date(member.expiry_date);
                            const currentDate = new Date();
                            
                            // Calculate total membership duration in days
                            const totalDuration = Math.ceil((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            // Calculate days elapsed since start
                            const daysElapsed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            // If expired, show 100% in red
                            if (getActualMemberStatus(member) === 'expired') {
                              return 100;
                            }
                            
                            // Calculate progress percentage
                            const progress = Math.min(100, Math.max(0, (daysElapsed / totalDuration) * 100));
                            
                            return progress;
                          })()}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Started: {member?.start_date ? new Date(member.start_date).toLocaleDateString() : 'N/A'}</span>
                      <span className={getActualMemberStatus(member) === 'expired' ? 'text-red-600 font-medium' : ''}>
                        {getActualMemberStatus(member) === 'expired' ? 'Expired: ' : 'Expires: '}
                        {member?.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

              <TabsContent value="settings" className="space-y-8">
                {/* Account Security */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Email Management Card */}
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

                  {/* ✅ NEW: Simple Password Reset Card */}
                  <Card className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <CardHeader className="relative z-10">
                      <CardTitle className="flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white" />
                        </div>
                        Password Reset
                      </CardTitle>
                      <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                        Reset your account password via email
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                      {/* Current Email Display */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Password Reset Email</Label>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{currentUser?.email || 'Loading...'}</span>
                        </div>
                      </div>

                      {/* Password Reset Instructions */}
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Secure Password Reset
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Click the button below to receive a secure password reset link via email. This ensures your account security.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reset Button */}
                      <Button 
                        onClick={handlePasswordReset}
                        disabled={passwordForm.isChanging}
                        className="w-full"
                        variant="outline"
                      >
                        {passwordForm.isChanging ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Sending Reset Link...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Password Reset Link
                          </>
                        )}
                      </Button>

                      {/* Security Note */}
                      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                        <p className="font-medium mb-1">🔒 Security Note:</p>
                        <p>The reset link will be valid for 24 hours and can only be used once. If you don't receive the email, check your spam folder.</p>
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

            {/* ✅ MODIFIED: Tab contents with isReadOnly props */}
            <TabsContent value="profile">
              <MemberProfile member={member} isReadOnly={isStaffView} />
            </TabsContent>

            {!isStaffView && (
              <TabsContent value="membership">
                <MemberMembership member={member} onMemberUpdate={handleMemberUpdate} isReadOnly={isStaffView} />
              </TabsContent>
            )}
          </Tabs>
        </section>
      </div>

      {/* Your existing custom CSS (unchanged) */}
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