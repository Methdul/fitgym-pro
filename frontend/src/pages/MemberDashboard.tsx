import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, CreditCard, Calendar, Settings, AlertTriangle, Shield, Activity, TrendingUp, Clock, Star, ChevronRight, RefreshCw } from 'lucide-react';
import MemberProfile from '@/components/member/MemberProfile';
import MemberMembership from '@/components/member/MemberMembership';
import { VerificationBanner } from '@/components/VerificationBanner';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';
import { Member } from '@/types';

const MemberDashboard = () => {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [animatedStats, setAnimatedStats] = useState({
    daysRemaining: 0,
    price: 0,
    memberSince: 0
  });
  const { toast } = useToast();

  // Mock member ID - in real app, this would come from authentication
  const mockMemberId = 'mock-member-id';

  useEffect(() => {
    fetchMemberData();
    
    // Get verification status from localStorage
    const status = localStorage.getItem('user_verification_status');
    if (status) {
      setVerificationStatus(JSON.parse(status));
    }
  }, []);

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
      case 'active': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'expired': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'suspended': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-3 w-3" />;
      case 'expired': return <AlertTriangle className="h-3 w-3" />;
      case 'suspended': return <Clock className="h-3 w-3" />;
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
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </section>
      </div>
    );
  }

  if (!member) {
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
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Member Not Found</h2>
            <p className="text-gray-300 mb-8">Please contact support for assistance.</p>
            <Button size="lg" onClick={fetchMemberData} className="transform hover:scale-105 transition-all duration-300">
              <RefreshCw className="h-5 w-5 mr-2" />
              Try Again
            </Button>
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
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span className="text-green-400">Secure Member Portal</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-in-delay">
              <Badge className={`${getStatusColor(member.status)} px-4 py-2 text-sm font-medium`}>
                {getStatusIcon(member.status)}
                <span className="ml-2">{member.status.charAt(0).toUpperCase() + member.status.slice(1)}</span>
              </Badge>
              <Badge variant="outline" className="px-4 py-2 text-sm border-white/20 text-white">
                <Star className="h-3 w-3 mr-2" />
                {member.package_type} • {member.package_name}
              </Badge>
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
                  {member.status}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {member.is_verified ? 'Verified Account' : 'Pending Verification'}
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
                  ${animatedStats.price.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {member.package_name}
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
            <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50">
              <TabsTrigger value="overview" className="relative">
                <User className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="profile" className="relative">
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="membership" className="relative">
                <CreditCard className="h-4 w-4 mr-2" />
                Membership
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
                    </CardTitle>
                    <CardDescription className="group-hover:text-foreground transition-colors duration-300">
                      Your current membership details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Package</span>
                          <span className="text-sm font-semibold">{member.package_name}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
                          <span className="text-sm font-semibold capitalize">{member.package_type}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</span>
                          <span className="text-sm font-bold text-green-600">${member.package_price}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</span>
                          <span className="text-sm font-semibold">{new Date(member.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expires</span>
                          <span className="text-sm font-semibold">{new Date(member.expiry_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                          <Badge variant={member.is_verified ? "default" : "secondary"} className="w-fit">
                            {member.is_verified ? "Verified" : "Unverified"}
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
                        {Math.floor((new Date().getTime() - new Date(member.start_date).getTime()) / (1000 * 60 * 60 * 24))} days active
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
                      <span>Started: {new Date(member.start_date).toLocaleDateString()}</span>
                      <span>Expires: {new Date(member.expiry_date).toLocaleDateString()}</span>
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
      <style jsx>{`
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