import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Building2, 
  Users, 
  Heart, 
  UserPlus, 
  Plus, 
  Edit, 
  Trash2, 
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  Activity,
  Shield,
  CheckCircle,
  XCircle,
  Key,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, supabase } from '@/lib/supabase';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  member_count: number;
  staff_count: number;
  facilities: string[];
  branch_email?: string | null;
  branch_password_hash?: string | null;
  is_active: boolean;
  created_at: string;
}

interface Member {
  id: string;
  branch_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  membership_status?: string;
  status?: string;
  created_at: string;
}

interface Partnership {
  id: string;
  name: string;
  category: string;
  description: string;
  benefits: string;
  website_url: string;
  is_active: boolean;
}

interface GymStaff {
  id: string;
  name: string;
  role: string;
  specialization: string;
  experience_years: number;
  certifications: string[];
  is_displayed: boolean;
}

interface BranchWithRealCounts extends Branch {
  real_member_count: number;
  real_staff_count: number;
}

const AdminDashboard = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesWithCounts, setBranchesWithCounts] = useState<BranchWithRealCounts[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [gymStaff, setGymStaff] = useState<GymStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Form states
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isAddPartnershipOpen, setIsAddPartnershipOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddCredentialsOpen, setIsAddCredentialsOpen] = useState(false);
  const [isDeleteBranchOpen, setIsDeleteBranchOpen] = useState(false);

  // Selected items for edit/delete
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Branch form with credentials
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    hours: '6:00 AM - 10:00 PM',
    facilities: [] as string[],
    branch_email: '',
    branch_password: '',
    confirm_password: ''
  });

  const [partnershipForm, setPartnershipForm] = useState({
    name: '',
    category: 'food',
    description: '',
    benefits: '',
    website_url: ''
  });

  const [staffForm, setStaffForm] = useState({
    name: '',
    role: '',
    specialization: '',
    experience_years: '',
    certifications: [] as string[]
  });

  const [credentialsForm, setCredentialsForm] = useState({
    branch_email: '',
    branch_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Calculate real member and staff counts
  const calculateRealCounts = async (branchesData: Branch[]) => {
    console.log('🔄 Calculating real member and staff counts...');
    
    try {
      // Fetch all members with error handling
      const { data: membersData, error: membersError } = await db.members.getAll();
      if (membersError) {
        console.error('Error fetching members:', membersError);
        // Fallback to stored counts
        return branchesData.map(branch => ({
          ...branch,
          real_member_count: branch.member_count || 0,
          real_staff_count: branch.staff_count || 0
        }));
      }

      // Fetch all staff with error handling
      const { data: staffData, error: staffError } = await db.staff.getAll();
      if (staffError) {
        console.error('Error fetching staff:', staffError);
      }

      const members = membersData || [];
      const staff = staffData || [];

      console.log('📊 Found data:', {
        totalMembers: members.length,
        totalStaff: staff.length,
        branches: branchesData.length
      });

      setAllMembers(members);

      // Calculate counts per branch
      const branchesWithRealCounts = branchesData.map(branch => {
        // Count active members for this branch
        // Handle different possible field names and statuses
        const branchMembers = members.filter(member => {
          const matchesBranch = member.branch_id === branch.id;
          const isActive = member.membership_status === 'active' || 
                          member.membership_status === 'Active' ||
                          member.status === 'active' ||
                          member.status === 'Active' ||
                          !member.membership_status; // If no status field, assume active
          return matchesBranch && isActive;
        });
        
        // Count staff for this branch
        const branchStaff = staff.filter(staffMember => 
          staffMember.branch_id === branch.id
        );

        const realMemberCount = branchMembers.length;
        const realStaffCount = branchStaff.length;

        console.log(`🏢 ${branch.name}: ${realMemberCount} members, ${realStaffCount} staff`);

        return {
          ...branch,
          real_member_count: realMemberCount,
          real_staff_count: realStaffCount
        };
      });

      return branchesWithRealCounts;
    } catch (error) {
      console.error('Error calculating real counts:', error);
      // Fallback to stored counts
      return branchesData.map(branch => ({
        ...branch,
        real_member_count: branch.member_count || 0,
        real_staff_count: branch.staff_count || 0
      }));
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching all admin dashboard data...');
      
      const [branchesData, partnershipsData, staffData] = await Promise.all([
        supabase.from('branches').select('*').order('id'),
        db.partnerships.getAll(),
        db.gymStaff.getDisplayed()
      ]);

      console.log('📊 Raw branches data:', branchesData.data?.length || 0);

      if (branchesData.error) {
        throw branchesData.error;
      }

      const sortedBranches = (branchesData.data || []).sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setBranches(sortedBranches);

      // Calculate real member and staff counts
      const branchesWithRealCounts = await calculateRealCounts(sortedBranches);
      setBranchesWithCounts(branchesWithRealCounts);

      setPartnerships(partnershipsData.data || []);
      setGymStaff(staffData.data || []);

      console.log('✅ Admin dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from real data
  const totalMembers = branchesWithCounts.reduce((sum, branch) => sum + (branch.real_member_count || 0), 0);
  const totalStaff = branchesWithCounts.reduce((sum, branch) => sum + (branch.real_staff_count || 0), 0);
  const activePartnerships = partnerships.filter(p => p.is_active).length;

  const resetBranchForm = () => {
    setBranchForm({
      name: '',
      address: '',
      phone: '',
      email: '',
      hours: '6:00 AM - 10:00 PM',
      facilities: [],
      branch_email: '',
      branch_password: '',
      confirm_password: ''
    });
  };

  const resetCredentialsForm = () => {
    setCredentialsForm({
      branch_email: '',
      branch_password: '',
      confirm_password: ''
    });
  };

  const validateBranchForm = () => {
    if (!branchForm.name || !branchForm.address || !branchForm.phone || !branchForm.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }

    if (branchForm.branch_email && !branchForm.branch_password) {
      toast({
        title: "Validation Error",
        description: "Branch password is required when branch email is provided",
        variant: "destructive",
      });
      return false;
    }

    if (branchForm.branch_password && branchForm.branch_password !== branchForm.confirm_password) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return false;
    }

    if (branchForm.branch_password && branchForm.branch_password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Branch password must be at least 6 characters",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const validateCredentialsForm = () => {
    if (!credentialsForm.branch_email || !credentialsForm.branch_password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all credential fields",
        variant: "destructive",
      });
      return false;
    }

    if (credentialsForm.branch_password !== credentialsForm.confirm_password) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return false;
    }

    if (credentialsForm.branch_password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleAddBranch = async () => {
    if (!validateBranchForm()) return;

    try {
      let result;
      
      if (branchForm.branch_email && branchForm.branch_password) {
        const { data, error } = await supabase.rpc('create_branch_with_credentials', {
          p_name: branchForm.name,
          p_address: branchForm.address,
          p_phone: branchForm.phone,
          p_email: branchForm.email,
          p_branch_email: branchForm.branch_email,
          p_branch_password: branchForm.branch_password,
          p_hours: branchForm.hours,
          p_facilities: branchForm.facilities.length > 0 ? branchForm.facilities : ['Cardio Area', 'Weight Training']
        });

        if (error) throw error;
        result = data;
      } else {
        const newBranch = {
          ...branchForm,
          facilities: branchForm.facilities.length > 0 ? branchForm.facilities : ['Cardio Area', 'Weight Training']
        };
        
        const { data, error } = await db.branches.create(newBranch);
        if (error) throw error;
        result = data;
      }

      toast({
        title: "Branch Added",
        description: `${branchForm.name} has been added successfully`,
      });

      resetBranchForm();
      setIsAddBranchOpen(false);
      
      setTimeout(() => {
        fetchAllData();
      }, 500);
    } catch (error) {
      console.error('Error adding branch:', error);
      toast({
        title: "Error",
        description: "Failed to add branch",
        variant: "destructive",
      });
    }
  };

  const handleEditBranch = () => {
    if (!selectedBranch) return;
    
    setBranchForm({
      name: selectedBranch.name,
      address: selectedBranch.address,
      phone: selectedBranch.phone,
      email: selectedBranch.email,
      hours: selectedBranch.hours,
      facilities: selectedBranch.facilities,
      branch_email: selectedBranch.branch_email || '',
      branch_password: '',
      confirm_password: ''
    });
    setIsEditBranchOpen(true);
  };

  const handleUpdateBranch = async () => {
    if (!selectedBranch || !validateBranchForm()) return;

    try {
      const updateData: any = {
        name: branchForm.name,
        address: branchForm.address,
        phone: branchForm.phone,
        email: branchForm.email,
        hours: branchForm.hours,
        facilities: branchForm.facilities
      };

      if (branchForm.branch_email) {
        updateData.branch_email = branchForm.branch_email;
        
        if (branchForm.branch_password) {
          const { data, error } = await supabase.rpc('add_branch_credentials', {
            p_branch_id: selectedBranch.id,
            p_branch_email: branchForm.branch_email,
            p_branch_password: branchForm.branch_password
          });

          if (error) throw error;
        }
      }

      const { error } = await db.branches.update(selectedBranch.id, updateData);
      if (error) throw error;

      toast({
        title: "Branch Updated",
        description: `${branchForm.name} has been updated successfully`,
      });

      resetBranchForm();
      setSelectedBranch(null);
      setIsEditBranchOpen(false);
      
      setTimeout(() => {
        fetchAllData();
      }, 500);
    } catch (error) {
      console.error('Error updating branch:', error);
      toast({
        title: "Error",
        description: "Failed to update branch",
        variant: "destructive",
      });
    }
  };

  const handleAddCredentials = async () => {
    if (!selectedBranch || !validateCredentialsForm()) return;

    try {
      const { data, error } = await supabase.rpc('add_branch_credentials', {
        p_branch_id: selectedBranch.id,
        p_branch_email: credentialsForm.branch_email,
        p_branch_password: credentialsForm.branch_password
      });

      if (error) throw error;

      toast({
        title: "Credentials Added",
        description: `Staff login credentials added to ${selectedBranch.name}`,
      });

      resetCredentialsForm();
      setSelectedBranch(null);
      setIsAddCredentialsOpen(false);
      
      setTimeout(() => {
        fetchAllData();
      }, 500);
    } catch (error) {
      console.error('Error adding credentials:', error);
      toast({
        title: "Error",
        description: "Failed to add credentials",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBranch = async () => {
    if (!selectedBranch) return;

    const expectedText = `${selectedBranch.name}delete`;
    if (deleteConfirmText !== expectedText) {
      toast({
        title: "Confirmation Error",
        description: `Please type "${expectedText}" to confirm deletion`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await db.branches.delete(selectedBranch.id);
      if (error) throw error;
      
      toast({
        title: "Branch Deleted",
        description: `${selectedBranch.name} has been deleted successfully`,
      });
      
      setSelectedBranch(null);
      setDeleteConfirmText('');
      setIsDeleteBranchOpen(false);
      
      setTimeout(() => {
        fetchAllData();
      }, 500);
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast({
        title: "Error",
        description: "Failed to delete branch",
        variant: "destructive",
      });
    }
  };

  const handleAddPartnership = async () => {
    try {
      const { data, error } = await db.partnerships.create(partnershipForm);
      
      if (error) throw error;

      toast({
        title: "Partnership Added",
        description: `${partnershipForm.name} has been added successfully`,
      });

      setPartnershipForm({
        name: '',
        category: 'food',
        description: '',
        benefits: '',
        website_url: ''
      });
      setIsAddPartnershipOpen(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding partnership:', error);
      toast({
        title: "Error",
        description: "Failed to add partnership",
        variant: "destructive",
      });
    }
  };

  const handleAddStaff = async () => {
    try {
      const newStaff = {
        ...staffForm,
        experience_years: parseInt(staffForm.experience_years) || 0,
        certifications: staffForm.certifications.length > 0 ? staffForm.certifications : ['Certified Trainer']
      };
      
      const { data, error } = await db.gymStaff.create(newStaff);
      
      if (error) throw error;

      toast({
        title: "Staff Added",
        description: `${staffForm.name} has been added successfully`,
      });

      setStaffForm({
        name: '',
        role: '',
        specialization: '',
        experience_years: '',
        certifications: []
      });
      setIsAddStaffOpen(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding staff:', error);
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      });
    }
  };

  const handleTogglePartnershipStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await db.partnerships.update(id, { is_active: !currentStatus });
      if (error) throw error;
      
      toast({
        title: "Partnership Updated",
        description: `Partnership ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchAllData();
    } catch (error) {
      console.error('Error updating partnership:', error);
      toast({
        title: "Error",
        description: "Failed to update partnership",
        variant: "destructive",
      });
    }
  };

  const handleToggleStaffDisplay = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await db.gymStaff.update(id, { is_displayed: !currentStatus });
      if (error) throw error;
      
      toast({
        title: "Staff Updated",
        description: `Staff member ${!currentStatus ? 'displayed' : 'hidden'} successfully`,
      });
      fetchAllData();
    } catch (error) {
      console.error('Error updating staff:', error);
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage your gym system</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchAllData} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <Badge variant="outline" className="px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              Admin Panel
            </Badge>
          </div>
        </div>

        {/* Overview Cards with Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branchesWithCounts.length}</div>
              <p className="text-xs text-muted-foreground">
                Active gym locations
              </p>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalMembers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Active across all branches
              </p>
              {allMembers.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Real-time count from database
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalStaff}</div>
              <p className="text-xs text-muted-foreground">
                Branch staff members
              </p>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partnerships</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePartnerships}</div>
              <p className="text-xs text-muted-foreground">
                Active business partnerships
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>

          {/* Overview Tab with Real Statistics */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Real-Time Statistics</CardTitle>
                  <CardDescription>Live data from your gym system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Members</span>
                    <span className="text-2xl font-bold text-green-600">{totalMembers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Staff</span>
                    <span className="text-2xl font-bold text-blue-600">{totalStaff}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Branches</span>
                    <span className="text-2xl font-bold">{branchesWithCounts.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg Members/Branch</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {branchesWithCounts.length > 0 ? Math.round(totalMembers / branchesWithCounts.length) : 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Branch Performance</CardTitle>
                  <CardDescription>Top performing branches by membership</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {branchesWithCounts
                    .sort((a, b) => b.real_member_count - a.real_member_count)
                    .slice(0, 5)
                    .map((branch, index) => (
                      <div key={branch.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                          <span className="text-sm font-medium">{branch.name}</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {branch.real_member_count} members
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">
                    Data Accuracy
                  </span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  All member and staff counts are calculated in real-time from the database for maximum accuracy.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branches Tab with Real Member Counts */}
          <TabsContent value="branches" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Branch Management</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchAllData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Counts
                </Button>
                <Dialog open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Branch
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Branch</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="branchName">Branch Name *</Label>
                          <Input
                            id="branchName"
                            value={branchForm.name}
                            onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Downtown Branch"
                          />
                        </div>
                        <div>
                          <Label htmlFor="branchPhone">Phone *</Label>
                          <Input
                            id="branchPhone"
                            value={branchForm.phone}
                            onChange={(e) => setBranchForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="branchAddress">Address *</Label>
                        <Textarea
                          id="branchAddress"
                          value={branchForm.address}
                          onChange={(e) => setBranchForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="123 Main St, City, State"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="branchEmail">Contact Email *</Label>
                          <Input
                            id="branchEmail"
                            value={branchForm.email}
                            onChange={(e) => setBranchForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="contact@branch.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="branchHours">Operating Hours</Label>
                          <Input
                            id="branchHours"
                            value={branchForm.hours}
                            onChange={(e) => setBranchForm(prev => ({ ...prev, hours: e.target.value }))}
                            placeholder="6:00 AM - 10:00 PM"
                          />
                        </div>
                      </div>

                      {/* Staff Login Credentials Section */}
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lock className="h-4 w-4" />
                          <Label className="text-sm font-medium">Staff Login Credentials (Optional)</Label>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create email/password for staff to access this branch dashboard
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="branchStaffEmail">Staff Login Email</Label>
                            <Input
                              id="branchStaffEmail"
                              type="email"
                              value={branchForm.branch_email}
                              onChange={(e) => setBranchForm(prev => ({ ...prev, branch_email: e.target.value }))}
                              placeholder="staff@downtown.fitgym.com"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="branchStaffPassword">Staff Password</Label>
                              <div className="relative">
                                <Input
                                  id="branchStaffPassword"
                                  type={showPassword ? "text" : "password"}
                                  value={branchForm.branch_password}
                                  onChange={(e) => setBranchForm(prev => ({ ...prev, branch_password: e.target.value }))}
                                  placeholder="Min. 6 characters"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="branchConfirmPassword">Confirm Password</Label>
                              <div className="relative">
                                <Input
                                  id="branchConfirmPassword"
                                  type={showConfirmPassword ? "text" : "password"}
                                  value={branchForm.confirm_password}
                                  onChange={(e) => setBranchForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                                  placeholder="Confirm password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setIsAddBranchOpen(false);
                          resetBranchForm();
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddBranch} disabled={!branchForm.name || !branchForm.address}>
                          Add Branch
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Branch Cards with Real Member Counts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branchesWithCounts.map((branch, index) => {
                const uniqueKey = `branch-${branch.id}-${branch.branch_email || 'no-email'}-${index}`;
                
                return (
                  <Card key={uniqueKey} className="relative">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{branch.name}</span>
                        <div className="flex gap-1">
                          {!branch.branch_email && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedBranch(branches.find(b => b.id === branch.id) || null);
                                setIsAddCredentialsOpen(true);
                              }}
                              title="Add Staff Credentials"
                            >
                              <Key className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedBranch(branches.find(b => b.id === branch.id) || null);
                              handleEditBranch();
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedBranch(branches.find(b => b.id === branch.id) || null);
                              setIsDeleteBranchOpen(true);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription className="text-xs">{branch.address}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Members:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-600">{branch.real_member_count}</span>
                          <Badge variant="outline" className="text-xs">Real-time</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Staff:</span>
                        <span className="font-semibold text-blue-600">{branch.real_staff_count}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Hours:</span>
                        <div className="text-xs">{branch.hours}</div>
                      </div>
                      
                      {/* Staff Login Status */}
                      <div className="border-t pt-2 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Staff Login:
                          </span>
                          <Badge variant={branch.branch_email ? "default" : "secondary"} className="text-xs">
                            {branch.branch_email ? (
                              <><CheckCircle className="h-3 w-3 mr-1" />Enabled</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" />Not Set</>
                            )}
                          </Badge>
                        </div>
                        
                        {branch.branch_email ? (
                          <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-2 border-green-500">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-green-600 flex-shrink-0" />
                              <span className="text-green-700 dark:text-green-300 font-mono text-[11px] break-all">
                                {branch.branch_email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground bg-orange-50 dark:bg-orange-900/20 p-2 rounded border-l-2 border-orange-500">
                            No staff login configured
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {branch.facilities.slice(0, 2).map((facility, facilityIndex) => (
                          <Badge key={`${branch.id}-facility-${facilityIndex}-${facility}`} variant="secondary" className="text-xs">
                            {facility}
                          </Badge>
                        ))}
                        {branch.facilities.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{branch.facilities.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Partnerships Tab - Keep existing implementation */}
          <TabsContent value="partnerships" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Partnership Management</h2>
              <Dialog open={isAddPartnershipOpen} onOpenChange={setIsAddPartnershipOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Partnership
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Partnership</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="partnerName">Partner Name</Label>
                      <Input
                        id="partnerName"
                        value={partnershipForm.name}
                        onChange={(e) => setPartnershipForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Healthy Cafe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partnerCategory">Category</Label>
                      <Select value={partnershipForm.category} onValueChange={(value) => setPartnershipForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="wellness">Wellness</SelectItem>
                          <SelectItem value="automotive">Automotive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="partnerDescription">Description</Label>
                      <Textarea
                        id="partnerDescription"
                        value={partnershipForm.description}
                        onChange={(e) => setPartnershipForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the partner"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partnerBenefits">Member Benefits</Label>
                      <Textarea
                        id="partnerBenefits"
                        value={partnershipForm.benefits}
                        onChange={(e) => setPartnershipForm(prev => ({ ...prev, benefits: e.target.value }))}
                        placeholder="10% discount on all items"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partnerWebsite">Website URL (optional)</Label>
                      <Input
                        id="partnerWebsite"
                        value={partnershipForm.website_url}
                        onChange={(e) => setPartnershipForm(prev => ({ ...prev, website_url: e.target.value }))}
                        placeholder="https://partner.com"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddPartnershipOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddPartnership} disabled={!partnershipForm.name || !partnershipForm.description}>
                        Add Partnership
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partnerships.map((partnership) => (
                <Card key={partnership.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {partnership.name}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={partnership.is_active}
                          onCheckedChange={() => handleTogglePartnershipStatus(partnership.id, partnership.is_active)}
                        />
                        <Badge variant={partnership.is_active ? "default" : "secondary"}>
                          {partnership.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {partnership.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription className="capitalize">{partnership.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{partnership.description}</p>
                    <div className="text-sm">
                      <span className="font-semibold text-green-600">Benefits:</span>
                      <div>{partnership.benefits}</div>
                    </div>
                    {partnership.website_url && (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={partnership.website_url} target="_blank" rel="noopener noreferrer">
                          Visit Website
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Staff Tab - Keep existing implementation */}
          <TabsContent value="staff" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Staff Management</h2>
              <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="staffName">Full Name</Label>
                      <Input
                        id="staffName"
                        value={staffForm.name}
                        onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="staffRole">Role</Label>
                        <Input
                          id="staffRole"
                          value={staffForm.role}
                          onChange={(e) => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                          placeholder="Personal Trainer"
                        />
                      </div>
                      <div>
                        <Label htmlFor="staffExperience">Experience (years)</Label>
                        <Input
                          id="staffExperience"
                          type="number"
                          value={staffForm.experience_years}
                          onChange={(e) => setStaffForm(prev => ({ ...prev, experience_years: e.target.value }))}
                          placeholder="5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="staffSpecialization">Specialization</Label>
                      <Input
                        id="staffSpecialization"
                        value={staffForm.specialization}
                        onChange={(e) => setStaffForm(prev => ({ ...prev, specialization: e.target.value }))}
                        placeholder="Strength Training"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddStaff} disabled={!staffForm.name || !staffForm.role}>
                        Add Staff
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gymStaff.map((staff) => (
                <Card key={staff.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {staff.name}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={staff.is_displayed}
                          onCheckedChange={() => handleToggleStaffDisplay(staff.id, staff.is_displayed)}
                        />
                        <Badge variant={staff.is_displayed ? "default" : "secondary"}>
                          {staff.is_displayed ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {staff.is_displayed ? "Displayed" : "Hidden"}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>{staff.role}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Specialization:</span>
                      <span className="font-semibold">{staff.specialization}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Experience:</span>
                      <span className="font-semibold">{staff.experience_years} years</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {staff.certifications.map((cert, index) => (
                        <Badge key={`${staff.id}-cert-${index}`} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Keep all existing dialogs (Edit Branch, Add Credentials, Delete Branch) */}
        {/* Edit Branch Dialog */}
        <Dialog open={isEditBranchOpen} onOpenChange={setIsEditBranchOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Branch - {selectedBranch?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editBranchName">Branch Name *</Label>
                  <Input
                    id="editBranchName"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Downtown Branch"
                  />
                </div>
                <div>
                  <Label htmlFor="editBranchPhone">Phone *</Label>
                  <Input
                    id="editBranchPhone"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editBranchAddress">Address *</Label>
                <Textarea
                  id="editBranchAddress"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editBranchEmail">Contact Email *</Label>
                  <Input
                    id="editBranchEmail"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@branch.com"
                  />
                </div>
                <div>
                  <Label htmlFor="editBranchHours">Operating Hours</Label>
                  <Input
                    id="editBranchHours"
                    value={branchForm.hours}
                    onChange={(e) => setBranchForm(prev => ({ ...prev, hours: e.target.value }))}
                    placeholder="6:00 AM - 10:00 PM"
                  />
                </div>
              </div>

              {/* Staff Login Credentials Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="h-4 w-4" />
                  <Label className="text-sm font-medium">Staff Login Credentials</Label>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="editBranchStaffEmail">Staff Login Email</Label>
                    <Input
                      id="editBranchStaffEmail"
                      type="email"
                      value={branchForm.branch_email}
                      onChange={(e) => setBranchForm(prev => ({ ...prev, branch_email: e.target.value }))}
                      placeholder="staff@downtown.fitgym.com"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editBranchStaffPassword">New Password (optional)</Label>
                      <div className="relative">
                        <Input
                          id="editBranchStaffPassword"
                          type={showPassword ? "text" : "password"}
                          value={branchForm.branch_password}
                          onChange={(e) => setBranchForm(prev => ({ ...prev, branch_password: e.target.value }))}
                          placeholder="Leave empty to keep current"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="editBranchConfirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="editBranchConfirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={branchForm.confirm_password}
                          onChange={(e) => setBranchForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                          placeholder="Confirm new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsEditBranchOpen(false);
                  setSelectedBranch(null);
                  resetBranchForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateBranch} disabled={!branchForm.name || !branchForm.address}>
                  Update Branch
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Credentials Dialog */}
        <Dialog open={isAddCredentialsOpen} onOpenChange={setIsAddCredentialsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Staff Credentials - {selectedBranch?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create email/password for staff to access this branch dashboard
              </p>
              
              <div>
                <Label htmlFor="credentialsEmail">Staff Login Email *</Label>
                <Input
                  id="credentialsEmail"
                  type="email"
                  value={credentialsForm.branch_email}
                  onChange={(e) => setCredentialsForm(prev => ({ ...prev, branch_email: e.target.value }))}
                  placeholder="staff@branch.fitgym.com"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="credentialsPassword">Password *</Label>
                  <div className="relative">
                    <Input
                      id="credentialsPassword"
                      type={showPassword ? "text" : "password"}
                      value={credentialsForm.branch_password}
                      onChange={(e) => setCredentialsForm(prev => ({ ...prev, branch_password: e.target.value }))}
                      placeholder="Min. 6 characters"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="credentialsConfirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="credentialsConfirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={credentialsForm.confirm_password}
                      onChange={(e) => setCredentialsForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      placeholder="Confirm password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsAddCredentialsOpen(false);
                  setSelectedBranch(null);
                  resetCredentialsForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleAddCredentials} disabled={!credentialsForm.branch_email || !credentialsForm.branch_password}>
                  Add Credentials
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Branch Dialog */}
        <AlertDialog open={isDeleteBranchOpen} onOpenChange={setIsDeleteBranchOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Branch</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the branch "{selectedBranch?.name}" and all associated data.
                <br /><br />
                <strong>To confirm deletion, type: "{selectedBranch?.name}delete"</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type "${selectedBranch?.name}delete" to confirm`}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setIsDeleteBranchOpen(false);
                setSelectedBranch(null);
                setDeleteConfirmText('');
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBranch}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteConfirmText !== `${selectedBranch?.name}delete`}
              >
                Delete Branch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminDashboard;