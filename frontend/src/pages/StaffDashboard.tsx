import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Trash2
} from 'lucide-react';
import { db } from '@/lib/supabase';
import { AddNewMemberModal } from '@/components/staff/AddNewMemberModal';
import { AddExistingMemberModal } from '@/components/staff/AddExistingMemberModal';
import { ViewMemberModal } from '@/components/staff/ViewMemberModal';
import RenewMemberModal from '@/components/staff/RenewMemberModal';
import { StaffManagement } from '@/components/staff/StaffManagement';
import StaffAuthModal from '@/components/staff/StaffAuthModal';
import type { Branch, Member, BranchStaff } from '@/types';

const StaffDashboard = () => {
  const { branchId } = useParams();
  const location = useLocation();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [showViewMember, setShowViewMember] = useState(false);
  const [showRenewMember, setShowRenewMember] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<any>(null);
  const [loginMethod, setLoginMethod] = useState<'pin' | 'credentials' | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Helper function to get the ACTUAL status of a member based on expiry date
  const getActualMemberStatus = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    
    // If expiry date has passed, member is actually expired regardless of database status
    if (expiryDate < now) {
      return 'expired';
    }
    
    // If member is suspended in database, keep that status
    if (member.status === 'suspended') {
      return 'suspended';
    }
    
    // Otherwise, member is active
    return 'active';
  };

  // Helper function to determine if member can be renewed - DEFINED EARLY
  const canRenewMember = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    
    // Member can be renewed if:
    // 1. Status is explicitly 'expired', OR
    // 2. Expiry date has passed (regardless of status)
    return member.status === 'expired' || expiryDate < now;
  };

  const isExpiringSoon = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return member.status === 'active' && expiryDate <= nextWeek && expiryDate > now;
  };

  useEffect(() => {
    // Check if user came from branch credential login
    const branchSession = localStorage.getItem('branch_session');
    const locationState = location.state;
    
    if (branchSession) {
      try {
        const sessionData = JSON.parse(branchSession);
        console.log('🏢 Found branch session:', sessionData);
        
        if (sessionData.branchId === branchId && sessionData.userType === 'branch_staff') {
          // Auto-authenticate with branch credentials
          setAuthenticatedStaff({
            id: 'branch_staff',
            first_name: 'Branch',
            last_name: 'Staff',
            role: 'manager', // Branch credential users get manager level access
            branch_id: branchId,
            email: sessionData.branchEmail,
            login_method: 'credentials'
          });
          setLoginMethod('credentials');
          setShowAuthModal(false);
          console.log('✅ Auto-authenticated via branch credentials');
        }
      } catch (error) {
        console.error('❌ Error parsing branch session:', error);
        localStorage.removeItem('branch_session'); // Clear invalid session
      }
    }
    
    // Also check location state from navigation
    if (locationState?.authenticated && locationState?.branchData) {
      console.log('🚀 Authenticated via navigation state');
      setAuthenticatedStaff({
        id: 'branch_staff',
        first_name: 'Branch',
        last_name: 'Staff',
        role: 'manager',
        branch_id: branchId,
        email: locationState.branchData.branch_email,
        login_method: 'credentials'
      });
      setLoginMethod('credentials');
      setShowAuthModal(false);
    }
  }, [branchId, location.state]);

  useEffect(() => {
    if (authenticatedStaff && branchId) {
      fetchData();
    }
  }, [branchId, authenticatedStaff]);

  const fetchData = async () => {
    if (!branchId) return;
    
    try {
      const [branchData, membersData, staffData] = await Promise.all([
        db.branches.getById(branchId),
        db.members.getByBranch(branchId),
        db.staff.getByBranch(branchId)
      ]);

      if (branchData.data) setBranch(branchData.data);
      if (membersData.data) setMembers(membersData.data);
      if (staffData.data) setStaff(staffData.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatsData = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Use actual status calculation for more accurate stats
    const activeMembers = members.filter(m => getActualMemberStatus(m) === 'active').length;
    const expiredMembers = members.filter(m => canRenewMember(m)).length; // Use canRenewMember for consistency
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
      monthlyRevenue,
      newMembersThisMonth,
      retentionRate,
      seniorStaffCount,
      todayCheckIns: 0 // Disabled check-ins feature
    };
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = `${member.first_name} ${member.last_name} ${member.email} ${member.phone}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'expired') {
      // Use the same logic as canRenewMember for expired filter
      matchesStatus = canRenewMember(member);
    } else if (statusFilter === 'expiring') {
      matchesStatus = isExpiringSoon(member);
    } else if (statusFilter === 'active') {
      // Use actual status for active filter
      matchesStatus = getActualMemberStatus(member) === 'active';
    } else {
      // For other statuses (suspended), use the actual status
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

    try {
      // Get auth token if available (for development, this might be optional based on your middleware)
      const authToken = localStorage.getItem('access_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add auth header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Use full backend URL - your backend runs on port 5001
      const response = await fetch(`http://localhost:5001/api/members/${memberToDelete.id}`, {
        method: 'DELETE',
        headers,
      });

      // Check if response is ok first
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        
        // Try to get error message from response
        let errorMessage = `Failed to delete member (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response isn't JSON, use status text
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.status === 'success') {
        // Show success message
        console.log('✅ Member deleted successfully');
        
        // Refresh members data
        if (branchId) {
          const { data } = await db.members.getByBranch(branchId);
          if (data) setMembers(data);
        }
        
        // Close dialog and reset state
        setDeleteConfirmOpen(false);
        setMemberToDelete(null);
      } else {
        console.error('❌ Failed to delete member:', result.error);
        throw new Error(result.error || 'Failed to delete member');
      }
    } catch (error) {
      console.error('❌ Error deleting member:', error);
      // Keep dialog open so user knows something went wrong
      alert(`Failed to delete member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAuthentication = (staff: any) => {
    setAuthenticatedStaff(staff);
    setLoginMethod('pin');
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    // Clear branch session if exists
    localStorage.removeItem('branch_session');
    
    // Reset authentication state
    setAuthenticatedStaff(null);
    setLoginMethod(null);
    setShowAuthModal(true);
    
    // Navigate back to login
    window.location.href = '/login';
  };

  const stats = getStatsData();

  if (showAuthModal || !authenticatedStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
                <CheckCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Check-ins</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.todayCheckIns}</p>
                  <p className="text-xs text-muted-foreground">Members visited</p>
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
          <TabsList className="grid w-full grid-cols-2 lg:w-64">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
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
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => {
                const actualStatus = getActualMemberStatus(member);
                return (
                  <Card key={member.id} className="border-border hover:border-primary transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {member.first_name} {member.last_name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusBadgeColor(actualStatus)}>
                              {actualStatus}
                            </Badge>
                            {member.is_verified && (
                              <Badge variant="secondary" className="text-xs">
                                Verified
                              </Badge>
                            )}
                            {isExpiringSoon(member) && (
                              <Badge variant="destructive" className="text-xs">
                                Expiring Soon
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-auto">
                            <div className="space-y-2">
                              <Button 
                                variant="ghost" 
                                className="w-full justify-start"
                                onClick={() => handleMemberAction(member, 'view')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Button>
                              {/* Only show Renew option for expired members */}
                              {canRenewMember(member) && (
                                <Button 
                                  variant="ghost" 
                                  className="w-full justify-start"
                                  onClick={() => handleMemberAction(member, 'renew')}
                                >
                                  Renew Membership
                                </Button>
                              )}
                              {/* Delete option - always available for staff */}
                              <Button 
                                variant="ghost" 
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleMemberAction(member, 'delete')}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Member
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Email:</span> {member.email}</p>
                        <p><span className="text-muted-foreground">Phone:</span> {member.phone}</p>
                        <p><span className="text-muted-foreground">Package:</span> {member.package_name}</p>
                        <p><span className="text-muted-foreground">Expires:</span> {new Date(member.expiry_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={canRenewMember(member) ? "flex-1" : "w-full"} 
                          onClick={() => handleMemberAction(member, 'view')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {/* Only show Renew button for expired members */}
                        {canRenewMember(member) && (
                          <Button 
                            size="sm" 
                            className="flex-1" 
                            onClick={() => handleMemberAction(member, 'renew')}
                          >
                            Renew
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

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
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <StaffManagement staff={staff} branchId={branchId!} onStaffUpdate={() => {
              // Refresh staff data
              if (branchId) {
                db.staff.getByBranch(branchId).then(({ data }) => {
                  if (data) setStaff(data);
                });
              }
            }} />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <AddNewMemberModal 
          open={showAddNew} 
          onOpenChange={setShowAddNew}
          branchId={branchId!}
          onMemberAdded={() => {
            // Refresh members data
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
            // Refresh members data
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
              onRenewalComplete={() => {
                // Refresh members data
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