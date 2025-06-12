
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Clock,
  Settings
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
  const [branch, setBranch] = useState<Branch | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
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

  useEffect(() => {
    if (authenticatedStaff && branchId) {
      fetchData();
    }
  }, [branchId, authenticatedStaff]);

  const fetchData = async () => {
    if (!branchId) return;
    
    try {
      const [branchData, membersData, staffData, checkInsData] = await Promise.all([
        db.branches.getById(branchId),
        db.members.getByBranch(branchId),
        db.staff.getByBranch(branchId),
        db.checkIns.getTodayByBranch(branchId)
      ]);

      if (branchData.data) setBranch(branchData.data);
      if (membersData.data) setMembers(membersData.data);
      if (staffData.data) setStaff(staffData.data);
      if (checkInsData.data) setCheckIns(checkInsData.data);
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
    
    const activeMembers = members.filter(m => m.status === 'active').length;
    const expiredMembers = members.filter(m => m.status === 'expired').length;
    const expiringMembers = members.filter(m => {
      const expiryDate = new Date(m.expiry_date);
      return m.status === 'active' && expiryDate <= nextWeek && expiryDate > now;
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
      todayCheckIns: checkIns.length
    };
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = `${member.first_name} ${member.last_name} ${member.email} ${member.phone}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter ||
      (statusFilter === 'expiring' && isExpiringSoon(member));
    return matchesSearch && matchesStatus;
  });

  const isExpiringSoon = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return member.status === 'active' && expiryDate <= nextWeek && expiryDate > now;
  };

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
    }
  };

  const handleAuthentication = (staff: any) => {
    setAuthenticatedStaff(staff);
    setShowAuthModal(false);
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
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">
                {authenticatedStaff?.first_name} {authenticatedStaff?.last_name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {authenticatedStaff?.role?.replace('_', ' ')} • Just now
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setAuthenticatedStaff(null);
                setShowAuthModal(true);
              }}
              className="mt-1"
            >
              Switch User
            </Button>
          </div>
        </div>

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
          <TabsList className="grid w-full grid-cols-3 lg:w-96">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
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
              {filteredMembers.map((member) => (
                <Card key={member.id} className="border-border hover:border-primary transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {member.first_name} {member.last_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusBadgeColor(member.status)}>
                            {member.status}
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
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start"
                              onClick={() => handleMemberAction(member, 'renew')}
                            >
                              Renew Membership
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
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleMemberAction(member, 'view')}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => handleMemberAction(member, 'renew')}>
                        Renew
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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

          <TabsContent value="checkins" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Today's Check-ins</CardTitle>
                <p className="text-muted-foreground">Members who checked in today</p>
              </CardHeader>
              <CardContent>
                {checkIns.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No check-ins today</h3>
                    <p className="text-muted-foreground">
                      Check-ins will appear here as members visit the gym
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checkIns.map((checkIn) => (
                      <div key={checkIn.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {checkIn.members?.first_name} {checkIn.members?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Checked in at {checkIn.check_in_time}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Present
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
};

export default StaffDashboard;
