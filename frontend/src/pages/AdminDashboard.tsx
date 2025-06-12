
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
import { 
  Building2, 
  Users, 
  Package, 
  Handshake, 
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
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';

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
  created_at: string;
}

interface Package {
  id: string;
  name: string;
  type: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
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

const AdminDashboard = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [gymStaff, setGymStaff] = useState<GymStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Form states
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isAddPartnershipOpen, setIsAddPartnershipOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    hours: '6:00 AM - 10:00 PM',
    facilities: [] as string[]
  });

  const [packageForm, setPackageForm] = useState({
    name: '',
    type: 'individual',
    price: '',
    duration_months: '',
    features: [] as string[]
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

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [branchesData, packagesData, partnershipsData, staffData] = await Promise.all([
        db.branches.getAll(),
        db.packages.getAll(),
        db.partnerships.getAll(),
        db.gymStaff.getDisplayed()
      ]);

      setBranches(branchesData.data || []);
      setPackages(packagesData.data || []);
      setPartnerships(partnershipsData.data || []);
      setGymStaff(staffData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    try {
      const newBranch = {
        ...branchForm,
        facilities: branchForm.facilities.length > 0 ? branchForm.facilities : ['Cardio Area', 'Weight Training']
      };
      
      const { data, error } = await db.branches.create(newBranch);
      
      if (error) throw error;

      toast({
        title: "Branch Added",
        description: `${branchForm.name} has been added successfully`,
      });

      setBranchForm({
        name: '',
        address: '',
        phone: '',
        email: '',
        hours: '6:00 AM - 10:00 PM',
        facilities: []
      });
      setIsAddBranchOpen(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding branch:', error);
      toast({
        title: "Error",
        description: "Failed to add branch",
        variant: "destructive",
      });
    }
  };

  const handleAddPackage = async () => {
    try {
      const newPackage = {
        ...packageForm,
        price: parseFloat(packageForm.price),
        duration_months: parseInt(packageForm.duration_months),
        features: packageForm.features.length > 0 ? packageForm.features : ['Gym Access', 'Locker Room']
      };
      
      const { data, error } = await db.packages.create(newPackage);
      
      if (error) throw error;

      toast({
        title: "Package Added",
        description: `${packageForm.name} has been added successfully`,
      });

      setPackageForm({
        name: '',
        type: 'individual',
        price: '',
        duration_months: '',
        features: []
      });
      setIsAddPackageOpen(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding package:', error);
      toast({
        title: "Error",
        description: "Failed to add package",
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

  const handleDeleteBranch = async (id: string) => {
    try {
      const { error } = await db.branches.delete(id);
      if (error) throw error;
      
      toast({
        title: "Branch Deleted",
        description: "Branch has been deleted successfully",
      });
      fetchAllData();
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast({
        title: "Error",
        description: "Failed to delete branch",
        variant: "destructive",
      });
    }
  };

  const handleTogglePackageStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await db.packages.update(id, { is_active: !currentStatus });
      if (error) throw error;
      
      toast({
        title: "Package Updated",
        description: `Package ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchAllData();
    } catch (error) {
      console.error('Error updating package:', error);
      toast({
        title: "Error",
        description: "Failed to update package",
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
          <Badge variant="outline" className="px-4 py-2">
            <Shield className="h-4 w-4 mr-2" />
            Admin Panel
          </Badge>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branches.length}</div>
              <p className="text-xs text-muted-foreground">
                Active gym locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {branches.reduce((sum, branch) => sum + branch.member_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all branches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {packages.filter(p => p.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available membership plans
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partnerships</CardTitle>
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {partnerships.filter(p => p.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active business partnerships
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Statistics</CardTitle>
                  <CardDescription>Overall system performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <span className="text-2xl font-bold text-green-600">$24,850</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Memberships</span>
                    <span className="text-2xl font-bold">
                      {branches.reduce((sum, branch) => sum + branch.member_count, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Monthly Growth</span>
                    <span className="text-2xl font-bold text-blue-600">+12.5%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('branches')}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Manage Branches
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('packages')}>
                    <Package className="h-4 w-4 mr-2" />
                    Manage Packages
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('partnerships')}>
                    <Handshake className="h-4 w-4 mr-2" />
                    Manage Partnerships
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Branch Management</h2>
              <Dialog open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Branch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Branch</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="branchName">Branch Name</Label>
                      <Input
                        id="branchName"
                        value={branchForm.name}
                        onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Downtown Branch"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branchAddress">Address</Label>
                      <Textarea
                        id="branchAddress"
                        value={branchForm.address}
                        onChange={(e) => setBranchForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="123 Main St, City, State"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="branchPhone">Phone</Label>
                        <Input
                          id="branchPhone"
                          value={branchForm.phone}
                          onChange={(e) => setBranchForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div>
                        <Label htmlFor="branchEmail">Email</Label>
                        <Input
                          id="branchEmail"
                          value={branchForm.email}
                          onChange={(e) => setBranchForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="branch@gym.com"
                        />
                      </div>
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
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddBranchOpen(false)}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((branch) => (
                <Card key={branch.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {branch.name}
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteBranch(branch.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>{branch.address}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Members:</span>
                      <span className="font-semibold">{branch.member_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Staff:</span>
                      <span className="font-semibold">{branch.staff_count}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Hours:</span>
                      <div>{branch.hours}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {branch.facilities.map((facility, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Package Management</h2>
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
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="packageName">Package Name</Label>
                      <Input
                        id="packageName"
                        value={packageForm.name}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Premium Monthly"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="packageType">Type</Label>
                        <Select value={packageForm.type} onValueChange={(value) => setPackageForm(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="couple">Couple</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="packagePrice">Price ($)</Label>
                        <Input
                          id="packagePrice"
                          type="number"
                          value={packageForm.price}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="49.99"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="packageDuration">Duration (months)</Label>
                      <Input
                        id="packageDuration"
                        type="number"
                        value={packageForm.duration_months}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, duration_months: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddPackageOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddPackage} disabled={!packageForm.name || !packageForm.price || !packageForm.duration_months}>
                        Add Package
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {pkg.name}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Partnerships Tab */}
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

          {/* Staff Tab */}
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
                        <Badge key={index} variant="outline" className="text-xs">
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
      </div>
    </div>
  );
};

export default AdminDashboard;
