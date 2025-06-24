import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  Search,
  Plus,
  MoreVertical,
  Crown,
  Shield,
  User,
  Eye,
  UserPlus,
  CheckCircle,
  Settings,
  Building2,
  Trash2,
  Package as PackageIcon,
  XCircle,
  Edit,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { db, getAuthHeaders, setStaffSessionToken, isAuthenticated } from '@/lib/supabase';
import { AddNewMemberModal } from '@/components/staff/AddNewMemberModal';
import { AddExistingMemberModal } from '@/components/staff/AddExistingMemberModal';
import { ViewMemberModal } from '@/components/staff/ViewMemberModal';
import RenewMemberModal from '@/components/staff/RenewMemberModal';
import { StaffManagement } from '@/components/staff/StaffManagement';
import StaffAuthModal from '@/components/staff/StaffAuthModal';
import AnalyticsTab from '@/components/staff/AnalyticsTab';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Member, BranchStaff, Package } from '@/types';

const StaffDashboard = () => {
  const { branchId } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [showViewMember, setShowViewMember] = useState(false);
  const [showRenewMember, setShowRenewMember] = useState(false);
  
  // Authentication states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<any>(null);
  const [loginMethod, setLoginMethod] = useState<'pin' | 'credentials' | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Package management states
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    type: 'individual' as 'individual' | 'couple' | 'family',
    price: '',
    duration_months: '',
    max_members: '1',
    features: [] as string[]
  });

  // Helper function to get the ACTUAL status of a member based on expiry date
  const getActualMemberStatus = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    
    if (expiryDate < now) {
      return 'expired';
    }
    
    if (member.status === 'suspended') {
      return 'suspended';
    }
    
    return 'active';
  };

  // Helper function to determine if member can be renewed
  const canRenewMember = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    
    return member.status === 'expired' || expiryDate < now;
  };

  const isExpiringSoon = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return member.status === 'active' && expiryDate <= nextWeek && expiryDate > now;
  };

  const getDaysUntilExpiry = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Authentication check effect
  useEffect(() => {
    console.log('🔍 StaffDashboard: Checking authentication state...');
    
    const branchSession = localStorage.getItem('branch_session');
    const locationState = location.state;
    
    if (branchSession) {
      try {
        const sessionData = JSON.parse(branchSession);
        console.log('🏢 Found branch session:', sessionData);
        
        if (sessionData.branchId === branchId && sessionData.userType === 'branch_staff') {
          console.log('✅ Valid branch session found, creating backend session...');
          createBranchSession(sessionData);
          return;
        } else {
          console.log('⚠️ Branch session branch ID mismatch or invalid type');
          localStorage.removeItem('branch_session');
        }
      } catch (error) {
        console.error('❌ Error parsing branch session:', error);
        localStorage.removeItem('branch_session');
      }
    }
    
    if (locationState?.authenticated && locationState?.branchData) {
      console.log('🚀 Authenticated via navigation state, creating backend session...');
      const sessionData = {
        sessionToken: `branch_${Date.now()}`,
        branchId: branchId,
        branchName: locationState.branchData.name || 'Unknown Branch',
        branchEmail: locationState.branchData.branch_email,
        loginTime: new Date().toISOString(),
        userType: 'branch_staff',
        authMethod: 'credentials'
      };
      
      localStorage.setItem('branch_session', JSON.stringify(sessionData));
      createBranchSession(sessionData);
      return;
    }
    
    console.log('❌ No valid authentication found, showing auth modal');
    setShowAuthModal(true);
    
  }, [branchId, location.state]);

  // Add this new function to create backend session for branch authentication
  const createBranchSession = async (sessionData: any) => {
    try {
      // Create a session token for branch authentication
      const branchSessionToken = `branch_${sessionData.branchId}_${Date.now()}`;
      
      // Store the session token
      setStaffSessionToken(branchSessionToken);
      
      // Set authenticated state
      setAuthenticatedStaff({
        id: 'branch_staff',
        first_name: 'Branch',
        last_name: 'Staff',
        role: 'manager',
        branch_id: branchId,
        email: sessionData.branchEmail,
        login_method: 'credentials'
      });
      setLoginMethod('credentials');
      setShowAuthModal(false);
      
      console.log('✅ Branch session created with token:', branchSessionToken);
    } catch (error) {
      console.error('❌ Error creating branch session:', error);
      setShowAuthModal(true);
    }
  };

  // Data fetching effect
  useEffect(() => {
    if (authenticatedStaff && branchId) {
      console.log('📊 Authenticated staff found, fetching dashboard data...');
      fetchData();
    }
  }, [branchId, authenticatedStaff]);

  const fetchData = async () => {
    if (!branchId) return;
    
    try {
      const [branchData, membersData, staffData, packagesData] = await Promise.all([
        db.branches.getById(branchId),
        db.members.getByBranch(branchId),
        db.staff.getByBranch(branchId),
        fetchBranchPackages(branchId)
      ]);

      if (branchData.data) setBranch(branchData.data);
      if (membersData.data) setMembers(membersData.data);
      if (staffData.data) setStaff(staffData.data);
      if (packagesData.data) setPackages(packagesData.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchPackages = async (branchId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        return { data: result.data, error: null };
      } else {
        return { data: null, error: result.error };
      }
    } catch (error) {
      console.error('Error fetching branch packages:', error);
      return { data: null, error: 'Failed to fetch packages' };
    }
  };

  const getStatsData = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const activeMembers = members.filter(m => getActualMemberStatus(m) === 'active').length;
    const expiredMembers = members.filter(m => canRenewMember(m)).length;
    const expiringMembers = members.filter(m => {
      const expiryDate = new Date(m.expiry_date);
      return getActualMemberStatus(m) === 'active' && expiryDate <= nextWeek && expiryDate > now;
    }).length;

    const monthlyRevenue = members
      .filter(m => {
        const memberDate = new Date(m.created_at);
        return memberDate >= thisMonth;
      })
      .reduce((sum, m) => sum + m.package_price, 0);

    const newMembersThisMonth = members.filter(m => {
      const memberDate = new Date(m.created_at);
      return memberDate >= thisMonth;
    }).length;

    const retentionRate = members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0;
    const seniorStaffCount = staff.filter(s => s.role === 'senior_staff').length;

    return {
      totalMembers: members.length,
      activeMembers,
      expiredMembers,
      expiringMembers,
      totalStaff: staff.length,
      totalPackages: packages.length,
      activePackages: packages.filter(p => p.is_active).length,
      monthlyRevenue,
      newMembersThisMonth,
      retentionRate,
      seniorStaffCount,
      todayCheckIns: 0
    };
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = `${member.first_name} ${member.last_name} ${member.email} ${member.phone}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'expired') {
      matchesStatus = canRenewMember(member);
    } else if (statusFilter === 'expiring') {
      matchesStatus = isExpiringSoon(member);
    } else if (statusFilter === 'active') {
      matchesStatus = getActualMemberStatus(member) === 'active';
    } else {
      matchesStatus = getActualMemberStatus(member) === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'suspended': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager': return Crown;
      case 'senior_staff': return Shield;
      default: return User;
    }
  };

  const handleMemberAction = (member: Member, action: string) => {
    setSelectedMember(member);
    switch (action) {
      case 'view':
        setShowViewMember(true);
        break;
      case 'renew':
        setShowRenewMember(true);
        break;
      case 'delete':
        setMemberToDelete(member);
        setDeleteConfirmOpen(true);
        break;
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    // Check authentication before making request
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/${memberToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        
        let errorMessage = `Failed to delete member (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.status === 'success') {
        console.log('✅ Member deleted successfully');
        
        if (branchId) {
          const { data } = await db.members.getByBranch(branchId);
          if (data) setMembers(data);
        }
        
        setDeleteConfirmOpen(false);
        setMemberToDelete(null);

        toast({
          title: "Member Deleted",
          description: `${memberToDelete.first_name} ${memberToDelete.last_name} has been deleted successfully`,
        });
      } else {
        console.error('❌ Failed to delete member:', result.error);
        throw new Error(result.error || 'Failed to delete member');
      }
    } catch (error) {
      console.error('❌ Error deleting member:', error);
      toast({
        title: "Error",
        description: `Failed to delete member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleAuthentication = (staff: any) => {
    console.log('🔐 PIN authentication successful:', staff);
    setAuthenticatedStaff(staff);
    setLoginMethod('pin');
    setShowAuthModal(false);
    
    const existingSession = localStorage.getItem('branch_session');
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        sessionData.staffInfo = staff;
        sessionData.authMethod = 'pin';
        localStorage.setItem('branch_session', JSON.stringify(sessionData));
        window.dispatchEvent(new Event('storage'));
      } catch (error) {
        console.error('Error updating session with staff info:', error);
      }
    } else {
      const sessionData = {
        sessionToken: `pin_${Date.now()}`,
        branchId: branchId,
        branchName: branch?.name || 'Unknown Branch',
        branchEmail: staff.email,
        loginTime: new Date().toISOString(),
        userType: 'branch_staff',
        authMethod: 'pin',
        staffInfo: staff
      };
      localStorage.setItem('branch_session', JSON.stringify(sessionData));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleLogout = () => {
    console.log('🔐 Logging out from staff dashboard...');
    
    localStorage.removeItem('branch_session');
    window.dispatchEvent(new Event('storage'));
    
    setAuthenticatedStaff(null);
    setLoginMethod(null);
    setShowAuthModal(true);
    
    window.location.href = '/login';
  };

  // Package management functions
  const resetPackageForm = () => {
    setPackageForm({
      name: '',
      type: 'individual',
      price: '',
      duration_months: '',
      max_members: '1',
      features: []
    });
  };

  const validatePackageForm = () => {
    if (!packageForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Package name is required",
        variant: "destructive",
      });
      return false;
    }
    if (!packageForm.price || parseFloat(packageForm.price) < 0) {
      toast({
        title: "Validation Error",
        description: "Valid price is required",
        variant: "destructive",
      });
      return false;
    }
    if (!packageForm.duration_months || parseInt(packageForm.duration_months) < 1) {
      toast({
        title: "Validation Error",
        description: "Duration must be at least 1 month",
        variant: "destructive",
      });
      return false;
    }
    if (!packageForm.max_members || parseInt(packageForm.max_members) < 1 || parseInt(packageForm.max_members) > 10) {
      toast({
        title: "Validation Error",
        description: "Max members must be between 1 and 10",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleAddPackage = async () => {
    alert("DEBUG: Function is running!"); // ADD THIS LINE FIRST
    console.log("🔍 DEBUG: Function started"); // ADD THIS LINE TOO
    if (!validatePackageForm() || !branchId) return;

    // DEBUG: Check what's happening in getAuthHeaders
    console.log('🔍 DEBUG: Checking authentication...');
    
    // Check what's in localStorage
    const branchSession = localStorage.getItem('branch_session');
    const staffToken = localStorage.getItem('staff_session_token');
    
    console.log('📱 Staff token in localStorage:', staffToken ? 'EXISTS' : 'MISSING');
    console.log('🏢 Branch session in localStorage:', branchSession ? 'EXISTS' : 'MISSING');
    
    if (branchSession) {
      try {
        const parsed = JSON.parse(branchSession);
        console.log('🎫 Session token in branch_session:', parsed.sessionToken ? 'EXISTS' : 'MISSING');
        console.log('🎫 Actual token value:', parsed.sessionToken);
      } catch (e) {
        console.error('❌ Error parsing branch session:', e);
      }
    }
    
    // Check what getAuthHeaders returns
    const headers = getAuthHeaders();
    console.log('📤 Generated headers:', headers);
    console.log('🔍 Has Authorization header:', !!headers.Authorization);
    console.log('🔍 Has X-Session-Token header:', !!headers['X-Session-Token']);
    
    if (!headers.Authorization && !headers['X-Session-Token']) {
      console.error('❌ NO AUTH HEADERS GENERATED!');
      toast({
        title: "Debug: Authentication Headers Missing",
        description: "No auth headers generated. Check console for details.",
        variant: "destructive",
      });
      return;
    }

    // Check authentication before making request
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      setShowAuthModal(true);
      return;
    }

    try {
      console.log('🔧 Adding package with auth headers...');
      const authHeaders = getAuthHeaders();
      console.log('📤 Request headers being sent:', Object.keys(authHeaders));

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          branch_id: branchId,
          name: packageForm.name,
          type: packageForm.type,
          price: parseFloat(packageForm.price),
          duration_months: parseInt(packageForm.duration_months),
          max_members: parseInt(packageForm.max_members),
          features: packageForm.features.length > 0 ? packageForm.features : ['Gym Access', 'Locker Room']
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        console.error('❌ Package creation failed:', response.status, result);
        throw new Error(result.error || `HTTP ${response.status}: Failed to create package`);
      }

      toast({
        title: "Package Added",
        description: `${packageForm.name} has been added successfully`,
      });

      resetPackageForm();
      setIsAddPackageOpen(false);
      
      // Refresh packages
      const packagesData = await fetchBranchPackages(branchId);
      if (packagesData.data) setPackages(packagesData.data);

    } catch (error) {
      console.error('Error adding package:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add package",
        variant: "destructive",
      });
    }
  };
    const handleEditPackage = (pkg: Package) => {
      setSelectedPackage(pkg);
      setPackageForm({
        name: pkg.name,
        type: pkg.type,
        price: pkg.price.toString(),
        duration_months: pkg.duration_months.toString(),
        max_members: pkg.max_members.toString(),
        features: pkg.features
      });
      setIsEditPackageOpen(true);
    };

    const handleUpdatePackage = async () => {
      if (!validatePackageForm() || !selectedPackage) return;

      // Check authentication before making request
      if (!isAuthenticated()) {
        toast({
          title: "Authentication Required",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        setShowAuthModal(true);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/${selectedPackage.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: packageForm.name,
            type: packageForm.type,
            price: parseFloat(packageForm.price),
            duration_months: parseInt(packageForm.duration_months),
            max_members: parseInt(packageForm.max_members),
            features: packageForm.features
          }),
        });

        const result = await response.json();

        if (!response.ok || result.status !== 'success') {
          throw new Error(result.error || 'Failed to update package');
        }

        toast({
          title: "Package Updated",
          description: `${packageForm.name} has been updated successfully`,
        });

        resetPackageForm();
        setSelectedPackage(null);
        setIsEditPackageOpen(false);
        
        if (branchId) {
          const packagesData = await fetchBranchPackages(branchId);
          if (packagesData.data) setPackages(packagesData.data);
        }

      } catch (error) {
        console.error('Error updating package:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update package",
          variant: "destructive",
        });
      }
    };

  const handleTogglePackageStatus = async (id: string, currentStatus: boolean) => {
    // Check authentication before making request
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          is_active: !currentStatus
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.error || 'Failed to update package');
      }

      toast({
        title: "Package Updated",
        description: `Package ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      
      if (branchId) {
        const packagesData = await fetchBranchPackages(branchId);
        if (packagesData.data) setPackages(packagesData.data);
      }

    } catch (error) {
      console.error('Error updating package:', error);
      toast({
        title: "Error",
        description: "Failed to update package",
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async (id: string, packageName: string) => {
    if (!confirm(`Are you sure you want to delete the package "${packageName}"? This action cannot be undone.`)) {
      return;
    }

    // Check authentication before making request
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.error || 'Failed to delete package');
      }

      toast({
        title: "Package Deleted",
        description: `${packageName} has been deleted successfully`,
      });
      
      if (branchId) {
        const packagesData = await fetchBranchPackages(branchId);
        if (packagesData.data) setPackages(packagesData.data);
      }

    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Error",
        description: "Failed to delete package",
        variant: "destructive",
      });
    }
  };

  const stats = getStatsData();

  // Loading state management
  if (!authenticatedStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {showAuthModal ? (
          <>
            <StaffAuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onAuthenticated={handleAuthentication}
              branchId={branchId || ''}
            />
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Staff Authentication Required</h2>
              <p className="text-muted-foreground">Please authenticate to access the staff dashboard</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.href = '/login'}
              >
                ← Back to Login
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-muted rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Website
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Dumbbell className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">{branch?.name} - Staff Dashboard</h1>
                <p className="text-muted-foreground">Branch Management Portal</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              {loginMethod === 'credentials' ? (
                <Building2 className="h-4 w-4 text-green-500" />
              ) : (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
              <span className="font-medium">
                {authenticatedStaff?.first_name} {authenticatedStaff?.last_name}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {loginMethod === 'credentials' ? (
                <>
                  <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                    Branch Login
                  </Badge>
                  <span className="ml-2">Manager Access</span>
                </>
              ) : (
                <>
                  {authenticatedStaff?.role?.replace('_', ' ')} • PIN Auth
                </>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              {loginMethod === 'pin' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setAuthenticatedStaff(null);
                    setShowAuthModal(true);
                  }}
                >
                  Switch User
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Authentication Method Notice */}
        {loginMethod === 'credentials' && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">
                  Authenticated via Branch Credentials
                </span>
                <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                  Manager Access
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  <p className="text-xs text-green-500">+{stats.newMembersThisMonth} this month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Members</p>
                  <p className="text-2xl font-bold text-green-500">{stats.activeMembers}</p>
                  <p className="text-xs text-green-500">{stats.retentionRate}% retention</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserX className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Expired Members</p>
                  <p className="text-2xl font-bold text-red-500">{stats.expiredMembers}</p>
                  <p className="text-xs text-muted-foreground">Need renewal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.expiringMembers}</p>
                  <p className="text-xs text-yellow-500">Next 7 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <PackageIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Branch Packages</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.activePackages}</p>
                  <p className="text-xs text-muted-foreground">{stats.totalPackages} total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-primary">${stats.monthlyRevenue.toFixed(2)}</p>
                  <p className="text-xs text-green-500">+8% vs last month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            {/* Members Header Card */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Member Management</CardTitle>
                    <p className="text-muted-foreground">Manage all branch members, renewals, and registrations</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddExisting(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Existing Member
                    </Button>
                    <Button onClick={() => setShowAddNew(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Member
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 bg-background border-border">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="expired">Expired Only</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchData}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Members Table */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Members List ({filteredMembers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Member</th>
                        <th className="text-left p-3">Contact</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Package</th>
                        <th className="text-left p-3">Expiry</th>
                        <th className="text-left p-3">Price</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => {
                        const actualStatus = getActualMemberStatus(member);
                        const daysUntilExpiry = getDaysUntilExpiry(member);
                        
                        return (
                          <tr key={member.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{member.first_name} {member.last_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {member.is_verified && (
                                    <Badge variant="secondary" className="text-xs mr-1">
                                      Verified
                                    </Badge>
                                  )}
                                  ID: {member.national_id}
                                </p>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                <p>{member.email}</p>
                                <p className="text-muted-foreground">{member.phone}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <Badge className={getStatusBadgeColor(actualStatus)}>
                                  {actualStatus}
                                </Badge>
                                {isExpiringSoon(member) && (
                                  <Badge variant="destructive" className="text-xs">
                                    Expiring Soon
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{member.package_name}</p>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {member.package_type}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="text-sm">{new Date(member.expiry_date).toLocaleDateString()}</p>
                                {daysUntilExpiry > 0 ? (
                                  <p className="text-xs text-green-600">{daysUntilExpiry} days left</p>
                                ) : (
                                  <p className="text-xs text-red-600">Expired {Math.abs(daysUntilExpiry)} days ago</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-primary">${member.package_price}</p>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMemberAction(member, 'view')}
                                  className="px-2"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canRenewMember(member) && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMemberAction(member, 'renew')}
                                    className="px-2 bg-green-600 hover:bg-green-700"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleMemberAction(member, 'delete')}
                                  className="px-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Empty State */}
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No members found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'Try adjusting your search or filter criteria'
                          : 'Get started by adding your first member'
                        }
                      </p>
                      {!searchTerm && statusFilter === 'all' && (
                        <Button onClick={() => setShowAddNew(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Member
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Package Management</h2>
                <p className="text-muted-foreground">Manage membership packages for this branch</p>
              </div>
              <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Package</DialogTitle>
                    <DialogDescription>Create a new membership package for {branch?.name}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="packageName">Package Name *</Label>
                      <Input
                        id="packageName"
                        value={packageForm.name}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Premium Monthly"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="packageType">Type *</Label>
                        <Select 
                          value={packageForm.type} 
                          onValueChange={(value: 'individual' | 'couple' | 'family') => {
                            const defaultMaxMembers = value === 'individual' ? '1' : 
                                                     value === 'couple' ? '2' : '4';
                            setPackageForm(prev => ({ 
                              ...prev, 
                              type: value,
                              max_members: defaultMaxMembers
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="couple">Couple</SelectItem>
                            <SelectItem value="family">Family</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="packageMaxMembers">Max Members *</Label>
                        <Input
                          id="packageMaxMembers"
                          type="number"
                          min="1"
                          max="10"
                          value={packageForm.max_members}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, max_members: e.target.value }))}
                          placeholder="1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {packageForm.type === 'individual' && 'Usually 1 person'}
                          {packageForm.type === 'couple' && 'Usually 2 people'}
                          {packageForm.type === 'family' && 'Usually 3-6 people'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="packagePrice">Price ($) *</Label>
                        <Input
                          id="packagePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={packageForm.price}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="49.99"
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageDuration">Duration (months) *</Label>
                        <Input
                          id="packageDuration"
                          type="number"
                          min="1"
                          value={packageForm.duration_months}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, duration_months: e.target.value }))}
                          placeholder="1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="packageFeatures">Features (comma-separated)</Label>
                      <Textarea
                        id="packageFeatures"
                        value={packageForm.features.join(', ')}
                        onChange={(e) => setPackageForm(prev => ({ 
                          ...prev, 
                          features: e.target.value.split(',').map(f => f.trim()).filter(f => f.length > 0)
                        }))}
                        placeholder="Gym Access, Locker Room, Group Classes"
                        rows={3}
                      />
                    </div>
                    {/* Package Summary */}
                    {packageForm.name && packageForm.max_members && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <h4 className="font-medium mb-2">Package Summary</h4>
                        <p className="text-sm text-muted-foreground">
                          <strong>{packageForm.name}</strong> - {packageForm.type} package for up to{' '}
                          <strong className="text-primary">{packageForm.max_members} people</strong>
                          {packageForm.price && ` at $${packageForm.price}`}
                          {packageForm.duration_months && ` for ${packageForm.duration_months} month${parseInt(packageForm.duration_months) > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsAddPackageOpen(false);
                        resetPackageForm();
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddPackage}>
                        Add Package
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{pkg.name}</span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pkg.is_active}
                          onCheckedChange={() => handleTogglePackageStatus(pkg.id, pkg.is_active)}
                        />
                        <Badge variant={pkg.is_active ? "default" : "secondary"}>
                          {pkg.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {pkg.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription className="text-2xl font-bold text-primary">
                      ${pkg.price}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Type:</span>
                      <span className="font-semibold capitalize">{pkg.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Max Members:</span>
                      <span className="font-semibold text-primary">{pkg.max_members} people</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Duration:</span>
                      <span className="font-semibold">{pkg.duration_months} month{pkg.duration_months > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pkg.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleEditPackage(pkg)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State for Packages */}
            {packages.length === 0 && (
              <div className="text-center py-12">
                <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No packages found</h3>
                <p className="text-muted-foreground mb-4">Create your first membership package for this branch</p>
                <Button onClick={() => setIsAddPackageOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Package
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <StaffManagement staff={staff} branchId={branchId!} onStaffUpdate={() => {
              if (branchId) {
                db.staff.getByBranch(branchId).then(({ data }) => {
                  if (data) setStaff(data);
                });
              }
            }} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab branchId={branchId!} branchName={branch?.name || 'Branch'} />
          </TabsContent>
        </Tabs>

        {/* Edit Package Dialog */}
        <Dialog open={isEditPackageOpen} onOpenChange={setIsEditPackageOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <DialogDescription>Update package details for {selectedPackage?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editPackageName">Package Name *</Label>
                <Input
                  id="editPackageName"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Premium Monthly"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPackageType">Type *</Label>
                  <Select 
                    value={packageForm.type} 
                    onValueChange={(value: 'individual' | 'couple' | 'family') => {
                      setPackageForm(prev => ({ ...prev, type: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="couple">Couple</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editPackageMaxMembers">Max Members *</Label>
                  <Input
                    id="editPackageMaxMembers"
                    type="number"
                    min="1"
                    max="10"
                    value={packageForm.max_members}
                    onChange={(e) => setPackageForm(prev => ({ ...prev, max_members: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPackagePrice">Price ($) *</Label>
                  <Input
                    id="editPackagePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={packageForm.price}
                    onChange={(e) => setPackageForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="49.99"
                  />
                </div>
                <div>
                  <Label htmlFor="editPackageDuration">Duration (months) *</Label>
                  <Input
                    id="editPackageDuration"
                    type="number"
                    min="1"
                    value={packageForm.duration_months}
                    onChange={(e) => setPackageForm(prev => ({ ...prev, duration_months: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editPackageFeatures">Features (comma-separated)</Label>
                <Textarea
                  id="editPackageFeatures"
                  value={packageForm.features.join(', ')}
                  onChange={(e) => setPackageForm(prev => ({ 
                    ...prev, 
                    features: e.target.value.split(',').map(f => f.trim()).filter(f => f.length > 0)
                  }))}
                  placeholder="Gym Access, Locker Room, Group Classes"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsEditPackageOpen(false);
                  setSelectedPackage(null);
                  resetPackageForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePackage}>
                  Update Package
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <AddNewMemberModal 
          open={showAddNew} 
          onOpenChange={setShowAddNew}
          branchId={branchId!}
          onMemberAdded={() => {
            if (branchId) {
              db.members.getByBranch(branchId).then(({ data }) => {
                if (data) setMembers(data);
              });
            }
          }}
        />

        <AddExistingMemberModal 
          open={showAddExisting} 
          onOpenChange={setShowAddExisting}
          branchId={branchId!}
          onMemberAdded={() => {
            if (branchId) {
              db.members.getByBranch(branchId).then(({ data }) => {
                if (data) setMembers(data);
              });
            }
          }}
        />

        {selectedMember && (
          <>
            <ViewMemberModal 
              open={showViewMember} 
              onOpenChange={setShowViewMember}
              member={selectedMember}
            />

            <RenewMemberModal 
              isOpen={showRenewMember} 
              onClose={() => setShowRenewMember(false)}
              member={selectedMember}
              branchId={branchId!}
              onRenewalComplete={() => {
                if (branchId) {
                  db.members.getByBranch(branchId).then(({ data }) => {
                    if (data) setMembers(data);
                  });
                }
              }}
            />
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Delete Member
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this member? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {memberToDelete && (
              <div className="py-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Member Details:</h4>
                  <div><strong>Name:</strong> {memberToDelete.first_name} {memberToDelete.last_name}</div>
                  <div><strong>Email:</strong> {memberToDelete.email}</div>
                  <div><strong>Phone:</strong> {memberToDelete.phone}</div>
                  <div className="flex items-center gap-2">
                    <strong>Status:</strong>
                    <Badge className={getStatusBadgeColor(getActualMemberStatus(memberToDelete))}>
                      {getActualMemberStatus(memberToDelete)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setMemberToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteMember}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StaffDashboard;