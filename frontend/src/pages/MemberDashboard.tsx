
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CreditCard, Calendar, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import MemberProfile from '@/components/member/MemberProfile';
import MemberMembership from '@/components/member/MemberMembership';
import MemberCheckIns from '@/components/member/MemberCheckIns';
import MemberReports from '@/components/member/MemberReports';
import MemberCheckIn from '@/components/member/MemberCheckIn';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';
import { Member } from '@/types';

const MemberDashboard = () => {
  const [member, setMember] = useState<Member | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Mock member ID - in real app, this would come from authentication
  const mockMemberId = 'mock-member-id';

  useEffect(() => {
    fetchMemberData();
    fetchBranches();
  }, []);

  const fetchMemberData = async () => {
    try {
      // Mock member data since we don't have real authentication yet
      const mockMember: Member = {
        id: mockMemberId,
        branch_id: '550e8400-e29b-41d4-a716-446655440001',
        user_id: 'mock-user-id',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@email.com',
        phone: '+1 (555) 123-4567',
        national_id: '123456789',
        status: 'active',
        package_type: 'individual',
        package_name: 'Premium Monthly',
        package_price: 79.99,
        start_date: '2024-01-01',
        expiry_date: '2024-12-31',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      setMember(mockMember);
    } catch (error) {
      console.error('Error fetching member data:', error);
      toast({
        title: "Error",
        description: "Failed to load member data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await db.branches.getAll();
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
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
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold mb-2">Member Not Found</h2>
          <p className="text-muted-foreground">Please contact support for assistance.</p>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {member.first_name}!</h1>
            <p className="text-muted-foreground">Manage your membership and track your fitness journey</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(member.status)}>
              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            </Badge>
            <Badge variant="outline">
              {member.package_type} • {member.package_name}
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membership Status</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{member.status}</div>
              <p className="text-xs text-muted-foreground">
                {member.is_verified ? 'Verified Account' : 'Pending Verification'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                daysUntilExpiry > 30 ? 'text-green-600' : 
                daysUntilExpiry > 7 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {daysUntilExpiry > 0 ? daysUntilExpiry : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Until membership expires
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Package</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${member.package_price}</div>
              <p className="text-xs text-muted-foreground">
                {member.package_name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Since</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(member.created_at).getFullYear()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(member.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expiry Warning */}
        {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  Your membership expires in {daysUntilExpiry} day{daysUntilExpiry > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-yellow-700">
                  Contact our staff to renew your membership and continue enjoying all benefits.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="membership">Membership</TabsTrigger>
            <TabsTrigger value="checkin">Check-In</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common member tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button 
                    onClick={() => setActiveTab('checkin')} 
                    className="w-full p-3 text-left border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Check In to Gym</p>
                        <p className="text-sm text-muted-foreground">Log your gym visit today</p>
                      </div>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('membership')} 
                    className="w-full p-3 text-left border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">View Membership Details</p>
                        <p className="text-sm text-muted-foreground">Check your package and renewals</p>
                      </div>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('reports')} 
                    className="w-full p-3 text-left border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Submit Report</p>
                        <p className="text-sm text-muted-foreground">Report issues or feedback</p>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Membership Summary</CardTitle>
                  <CardDescription>Your current membership details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Package:</span>
                    <span className="text-sm">{member.package_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm capitalize">{member.package_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Price:</span>
                    <span className="text-sm font-bold">${member.package_price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Expires:</span>
                    <span className="text-sm">{new Date(member.expiry_date).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <MemberProfile member={member} />
          </TabsContent>

          <TabsContent value="membership">
            <MemberMembership member={member} onMemberUpdate={handleMemberUpdate} />
          </TabsContent>

          <TabsContent value="checkin">
            <MemberCheckIn memberId={member.id} branches={branches} />
          </TabsContent>

          <TabsContent value="history">
            <MemberCheckIns memberId={member.id} />
          </TabsContent>

          <TabsContent value="reports">
            <MemberReports memberId={member.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MemberDashboard;
