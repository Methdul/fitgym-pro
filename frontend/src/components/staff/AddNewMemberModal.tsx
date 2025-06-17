import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, Phone, MapPin, User, CreditCard, Calendar, Shield, 
  Package, UserPlus, Search, X, Users, Check, Eye, EyeOff
} from 'lucide-react';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Package as PackageType, BranchStaff, Member } from '@/types';

interface AddNewMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
}

type Step = 'package' | 'members' | 'payment' | 'account' | 'verification';

interface MemberFormData {
  id?: string; // For existing members
  isExisting: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  nationalId: string;
}

export const AddNewMemberModal = ({ open, onOpenChange, branchId, onMemberAdded }: AddNewMemberModalProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('package');
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const { toast } = useToast();

  // Form state
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [memberForms, setMemberForms] = useState<MemberFormData[]>([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [existingMemberSearch, setExistingMemberSearch] = useState('');
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<Member[]>([]);

  const [paymentInfo, setPaymentInfo] = useState({
    duration: 1,
    price: 0,
    paymentMethod: ''
  });

  const [accountOptions, setAccountOptions] = useState({
    createAccount: true
  });

  const [verification, setVerification] = useState({
    staffId: '',
    pin: ''
  });

  useEffect(() => {
    if (open) {
      fetchPackages();
      fetchStaff();
      fetchExistingMembers();
    }
  }, [open, branchId]);

  useEffect(() => {
    if (selectedPackage) {
      setPaymentInfo(prev => ({
        ...prev,
        duration: selectedPackage.duration_months,
        price: selectedPackage.price
      }));
      initializeMemberForms();
    }
  }, [selectedPackage]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}/active`);
      const result = await response.json();
      
      if (result.status === 'success') {
        setPackages(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching branch packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages for this branch",
        variant: "destructive",
      });
      setPackages([]);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await db.staff.getByBranch(branchId);
      if (data) setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchExistingMembers = async () => {
    try {
      setSearchingMembers(true);
      const { data } = await db.members.getByBranch(branchId);
      if (data) {
        // Only include active members for selection
        const activeMembers = data.filter(member => {
          const now = new Date();
          const expiryDate = new Date(member.expiry_date);
          return member.status === 'active' && expiryDate > now;
        });
        setExistingMembers(activeMembers);
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
    } finally {
      setSearchingMembers(false);
    }
  };

  const initializeMemberForms = () => {
    if (!selectedPackage) return;

    const memberCount = getMemberCountForPackage(selectedPackage.type);
    const initialForms: MemberFormData[] = [];

    for (let i = 0; i < memberCount; i++) {
      initialForms.push({
        isExisting: false,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        nationalId: ''
      });
    }

    setMemberForms(initialForms);
    setCurrentMemberIndex(0);
    setSelectedExistingMembers([]);
  };

  const getMemberCountForPackage = (packageType: string): number => {
    switch (packageType) {
      case 'individual': return 1;
      case 'couple': return 2;
      case 'family': return 4; // Max 4 for family
      default: return 1;
    }
  };

  const getPackageTypeLabel = (packageType: string): string => {
    switch (packageType) {
      case 'individual': return 'Individual (1 Member)';
      case 'couple': return 'Couple (2 Members)';
      case 'family': return 'Family (Up to 4 Members)';
      default: return packageType.charAt(0).toUpperCase() + packageType.slice(1);
    }
  };

  const filteredExistingMembers = existingMembers.filter(member => {
    const searchLower = existingMemberSearch.toLowerCase();
    const matchesSearch = (
      member.first_name.toLowerCase().includes(searchLower) ||
      member.last_name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.phone.includes(existingMemberSearch)
    );
    
    // Exclude members that are already selected in other forms
    const isAlreadySelected = memberForms.some((form, index) => 
      index !== currentMemberIndex && form.isExisting && form.id === member.id
    );
    
    return matchesSearch && !isAlreadySelected;
  });

  const updateMemberForm = (index: number, field: keyof MemberFormData, value: string | boolean) => {
    setMemberForms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const selectExistingMember = (index: number, member: Member) => {
    setMemberForms(prev => {
      const updated = [...prev];
      updated[index] = {
        id: member.id,
        isExisting: true,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        phone: member.phone,
        address: '', // We don't have address in member data
        emergencyContact: '',
        emergencyPhone: '',
        nationalId: member.national_id
      };
      return updated;
    });

    // Add to selected existing members for tracking
    setSelectedExistingMembers(prev => {
      const updated = [...prev];
      updated[index] = member;
      return updated;
    });
  };

  const clearMemberForm = (index: number) => {
    setMemberForms(prev => {
      const updated = [...prev];
      updated[index] = {
        isExisting: false,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        nationalId: ''
      };
      return updated;
    });

    setSelectedExistingMembers(prev => {
      const updated = [...prev];
      updated[index] = undefined!;
      return updated.filter(Boolean);
    });
  };

  const validatePackageSelection = () => {
    return selectedPackage !== null;
  };

  const validateMemberForm = (index: number) => {
    const member = memberForms[index];
    if (!member) return false;
    
    if (!member.isExisting) {
      return member.firstName && member.lastName && member.email && 
             member.phone && member.address && member.emergencyContact && 
             member.emergencyPhone;
    }
    return true; // Existing members are already validated
  };

  const validateAllMemberForms = () => {
    for (let i = 0; i < memberForms.length; i++) {
      if (!validateMemberForm(i)) {
        return false;
      }
    }
    return true;
  };

  const canProceedFromCurrentMember = () => {
    return validateMemberForm(currentMemberIndex);
  };

  const handleNextMember = () => {
    if (!canProceedFromCurrentMember()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields for this member",
        variant: "destructive"
      });
      return;
    }

    if (currentMemberIndex < memberForms.length - 1) {
      setCurrentMemberIndex(currentMemberIndex + 1);
      setExistingMemberSearch(''); // Clear search for next member
    }
  };

  const handlePreviousMember = () => {
    if (currentMemberIndex > 0) {
      setCurrentMemberIndex(currentMemberIndex - 1);
      setExistingMemberSearch(''); // Clear search when going back
    }
  };

  const validatePaymentInfo = () => {
    return paymentInfo.paymentMethod !== '';
  };

  const handleNext = () => {
    if (currentStep === 'package' && !validatePackageSelection()) {
      toast({
        title: "Package Required",
        description: "Please select a membership package",
        variant: "destructive"
      });
      return;
    }

    if (currentStep === 'members' && !validateAllMemberForms()) {
      toast({
        title: "Missing Information",
        description: "Please complete all member forms before proceeding",
        variant: "destructive"
      });
      return;
    }

    if (currentStep === 'payment' && !validatePaymentInfo()) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    const steps: Step[] = ['package', 'members', 'payment', 'account', 'verification'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      // Reset member index when leaving members step
      if (currentStep === 'members') {
        setCurrentMemberIndex(0);
      }
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['package', 'members', 'payment', 'account', 'verification'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!verification.staffId || !verification.pin) {
      toast({
        title: "Verification Required",
        description: "Please select staff member and enter PIN",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Verify staff PIN
      const { isValid } = await db.staff.verifyPin(verification.staffId, verification.pin);
      
      if (!isValid) {
        toast({
          title: "Invalid PIN",
          description: "The entered PIN is incorrect",
          variant: "destructive"
        });
        return;
      }

      // Calculate dates
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + paymentInfo.duration);

      // Process each member
      for (let i = 0; i < memberForms.length; i++) {
        const memberForm = memberForms[i];
        
        if (memberForm.isExisting && memberForm.id) {
          // Update existing member with new package info
          const updateData = {
            status: 'active' as const,
            package_type: selectedPackage!.type,
            package_name: selectedPackage!.name,
            package_price: paymentInfo.price,
            start_date: startDate.toISOString().split('T')[0],
            expiry_date: expiryDate.toISOString().split('T')[0],
            processed_by_staff_id: verification.staffId,
            updated_at: new Date().toISOString()
          };

          const { error } = await db.members.update(memberForm.id, updateData);
          if (error) throw error;
        } else {
          // Create new member
          const memberData = {
            branch_id: branchId,
            first_name: memberForm.firstName,
            last_name: memberForm.lastName,
            email: memberForm.email,
            phone: memberForm.phone,
            national_id: memberForm.nationalId || Math.random().toString().substring(2, 12),
            status: 'active' as const,
            package_type: selectedPackage!.type,
            package_name: selectedPackage!.name,
            package_price: paymentInfo.price,
            start_date: startDate.toISOString().split('T')[0],
            expiry_date: expiryDate.toISOString().split('T')[0],
            is_verified: accountOptions.createAccount,
            processed_by_staff_id: verification.staffId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error } = await db.members.create(memberData);
          if (error) throw error;
        }
      }

      // Log the action
      await db.actionLogs.create({
        staff_id: verification.staffId,
        action_type: 'MEMBER_ADDED',
        description: `Added ${memberForms.length} member(s) with ${selectedPackage!.name} package`,
        created_at: new Date().toISOString()
      });

      const memberNames = memberForms.map(m => `${m.firstName} ${m.lastName}`).join(', ');
      toast({
        title: "Members Added",
        description: `${memberNames} ${memberForms.length > 1 ? 'have' : 'has'} been successfully added`
      });

      // Reset form
      resetForm();
      onOpenChange(false);
      onMemberAdded();
    } catch (error) {
      console.error('Error adding members:', error);
      toast({
        title: "Error",
        description: "Failed to add members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('package');
    setSelectedPackage(null);
    setMemberForms([]);
    setCurrentMemberIndex(0);
    setSelectedExistingMembers([]);
    setPaymentInfo({ duration: 1, price: 0, paymentMethod: '' });
    setAccountOptions({ createAccount: true });
    setVerification({ staffId: '', pin: '' });
    setExistingMemberSearch('');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'package':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Select Membership Package</h3>
              <p className="text-muted-foreground">Choose the package type and plan</p>
            </div>

            {packages.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading available packages...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {packages.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedPackage?.id === pkg.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        <Badge variant={pkg.type === 'couple' ? 'secondary' : pkg.type === 'family' ? 'default' : 'outline'}>
                          {getPackageTypeLabel(pkg.type)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-primary">${pkg.price}</p>
                        <p className="text-sm text-muted-foreground">{pkg.duration_months} month(s)</p>
                        <div className="space-y-1">
                          {pkg.features.slice(0, 3).map((feature, index) => (
                            <p key={index} className="text-xs text-muted-foreground">• {feature}</p>
                          ))}
                          {pkg.features.length > 3 && (
                            <p className="text-xs text-muted-foreground">• +{pkg.features.length - 3} more features</p>
                          )}
                        </div>
                        {selectedPackage?.id === pkg.id && (
                          <div className="flex items-center gap-1 text-primary pt-2">
                            <Check className="h-4 w-4" />
                            <span className="text-sm font-medium">Selected</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {packages.length === 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-yellow-700">
                    No active packages available for this branch. Please contact an administrator to add packages.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'members':
        if (!selectedPackage || memberForms.length === 0) return null;
        
        const currentMember = memberForms[currentMemberIndex];
        const totalMembers = memberForms.length;
        const memberLabel = selectedPackage.type === 'couple' 
          ? (currentMemberIndex === 0 ? 'Primary Member' : 'Partner')
          : selectedPackage.type === 'family' 
          ? (currentMemberIndex === 0 ? 'Primary Member' : `Family Member ${currentMemberIndex + 1}`)
          : 'Member';
        
        return (
          <div className="space-y-6">
            {/* Header with Progress */}
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">{memberLabel}</h3>
              <p className="text-muted-foreground">
                Member {currentMemberIndex + 1} of {totalMembers}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="outline">
                  {selectedPackage.name} - {getPackageTypeLabel(selectedPackage.type)}
                </Badge>
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center space-x-2">
              {Array.from({ length: totalMembers }).map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentMemberIndex
                      ? 'bg-primary'
                      : validateMemberForm(index)
                      ? 'bg-green-500'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Single Member Form */}
            <Card className="border-border max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">
                  {memberLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* New vs Existing Member Selection */}
                {selectedPackage.type !== 'individual' && !currentMember.isExisting && (
                  <div>
                    <Tabs defaultValue="new" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="new">New Member</TabsTrigger>
                        <TabsTrigger value="existing">Existing Member</TabsTrigger>
                      </TabsList>
                      <TabsContent value="existing" className="space-y-4 mt-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search existing members..."
                            value={existingMemberSearch}
                            onChange={(e) => setExistingMemberSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto border rounded-md">
                          {filteredExistingMembers.length > 0 ? (
                            filteredExistingMembers.map((member) => (
                              <div
                                key={member.id}
                                className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                                onClick={() => selectExistingMember(currentMemberIndex, member)}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{member.first_name} {member.last_name}</p>
                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {member.package_name}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center text-muted-foreground">
                              {searchingMembers ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  Loading...
                                </div>
                              ) : (
                                'No active members found'
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Member Form Content */}
                {currentMember.isExisting ? (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Check className="h-5 w-5 text-green-700" />
                      <span className="font-semibold text-green-900">Existing Member Selected</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clearMemberForm(currentMemberIndex)}
                        className="ml-auto border-green-300 text-green-700 hover:bg-green-200"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-600 font-medium">Name</p>
                        <p className="font-semibold text-green-900">{currentMember.firstName} {currentMember.lastName}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Email</p>
                        <p className="font-semibold text-green-900">{currentMember.email}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Phone</p>
                        <p className="font-semibold text-green-900">{currentMember.phone}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">National ID</p>
                        <p className="font-semibold text-green-900">{currentMember.nationalId}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={currentMember.firstName}
                          onChange={(e) => updateMemberForm(currentMemberIndex, 'firstName', e.target.value)}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={currentMember.lastName}
                          onChange={(e) => updateMemberForm(currentMemberIndex, 'lastName', e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          className="pl-10"
                          value={currentMember.email}
                          onChange={(e) => updateMemberForm(currentMemberIndex, 'email', e.target.value)}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          className="pl-10"
                          value={currentMember.phone}
                          onChange={(e) => updateMemberForm(currentMemberIndex, 'phone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          className="pl-10"
                          value={currentMember.address}
                          onChange={(e) => updateMemberForm(currentMemberIndex, 'address', e.target.value)}
                          placeholder="123 Main St, City, State"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergencyContact">Emergency Contact *</Label>
                        <Input
                          id="emergencyContact"
                          value={currentMember.emergencyContact}
                          onChange={(e) => updateMemberForm(currentMemberIndex, 'emergencyContact', e.target.value)}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyPhone">Emergency Phone *</Label>
                        <Input
                          id="emergencyPhone"
                          value={currentMember.emergencyPhone}
                          onChange={(e) => updateMemberForm(currentMemberIndex, 'emergencyPhone', e.target.value)}
                          placeholder="+1 (555) 987-6543"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Member Navigation */}
                {totalMembers > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handlePreviousMember}
                      disabled={currentMemberIndex === 0}
                    >
                      Previous Member
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      {currentMemberIndex + 1} of {totalMembers}
                    </span>
                    
                    {currentMemberIndex < totalMembers - 1 ? (
                      <Button
                        onClick={handleNextMember}
                        disabled={!canProceedFromCurrentMember()}
                      >
                        Next Member
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          if (canProceedFromCurrentMember()) {
                            setCurrentStep('payment');
                            setCurrentMemberIndex(0);
                          }
                        }}
                        disabled={!validateAllMemberForms()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Continue to Payment
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (months)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={paymentInfo.duration}
                  onChange={(e) => setPaymentInfo(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentInfo.price}
                  onChange={(e) => setPaymentInfo(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentInfo.paymentMethod} onValueChange={(value) => setPaymentInfo(prev => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </div>
                  </SelectItem>
                  <SelectItem value="cash">Cash Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedPackage && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Package Summary</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Package:</span> {selectedPackage.name}</p>
                    <p><span className="text-muted-foreground">Type:</span> {getPackageTypeLabel(selectedPackage.type)}</p>
                    <p><span className="text-muted-foreground">Members:</span> {memberForms.length}</p>
                    <p><span className="text-muted-foreground">Duration:</span> {paymentInfo.duration} month(s)</p>
                    <p><span className="text-muted-foreground">Total Price:</span> ${paymentInfo.price}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'account':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createAccount"
                checked={accountOptions.createAccount}
                onCheckedChange={(checked) => setAccountOptions({ createAccount: !!checked })}
              />
              <Label htmlFor="createAccount">Create login accounts for new members</Label>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Account Options</h4>
                <div className="space-y-2 text-sm">
                  {accountOptions.createAccount ? (
                    <>
                      <p className="text-green-600">✓ New members will receive email verification</p>
                      <p className="text-green-600">✓ Can access member dashboard</p>
                      <p className="text-green-600">✓ Can manage their profile online</p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">• Database records only</p>
                      <p className="text-muted-foreground">• No online access</p>
                      <p className="text-muted-foreground">• Staff can create accounts later</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Staff Verification Required</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please verify your identity to complete the member registration
                </p>
              </CardContent>
            </Card>

            <div>
              <Label htmlFor="staffMember">Select Your Name</Label>
              <Select value={verification.staffId} onValueChange={(value) => setVerification(prev => ({ ...prev, staffId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.first_name} {staffMember.last_name} ({staffMember.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pin">4-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={verification.pin}
                onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder="Enter your PIN"
              />
            </div>

            {verification.staffId && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <User className="h-4 w-4" />
                Staff member selected
              </div>
            )}

            {selectedPackage && memberForms.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 text-green-800">Registration Summary</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <p><strong>Package:</strong> {selectedPackage.name}</p>
                    <p><strong>Members:</strong> {memberForms.map(m => `${m.firstName} ${m.lastName}`).join(', ')}</p>
                    <p><strong>Duration:</strong> {paymentInfo.duration} months</p>
                    <p><strong>Total:</strong> ${paymentInfo.price}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'package': return 'Package Selection';
      case 'members': 
        if (memberForms.length > 1) {
          const memberLabel = selectedPackage?.type === 'couple' 
            ? (currentMemberIndex === 0 ? 'Primary Member' : 'Partner')
            : selectedPackage?.type === 'family' 
            ? (currentMemberIndex === 0 ? 'Primary Member' : `Family Member ${currentMemberIndex + 1}`)
            : `Member ${currentMemberIndex + 1}`;
          return `${memberLabel} (${currentMemberIndex + 1}/${memberForms.length})`;
        }
        return 'Member Information';
      case 'payment': return 'Duration & Payment';
      case 'account': return 'Account Options';
      case 'verification': return 'Staff Verification';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'package': return validatePackageSelection();
      case 'members': return validateAllMemberForms();
      case 'payment': return validatePaymentInfo();
      case 'account': return true;
      case 'verification': return verification.staffId && verification.pin;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member - Step {['package', 'members', 'payment', 'account', 'verification'].indexOf(currentStep) + 1} of 5</DialogTitle>
          <p className="text-muted-foreground">{getStepTitle()}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="flex space-x-2">
            {['package', 'members', 'payment', 'account', 'verification'].map((step, index) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded ${
                  ['package', 'members', 'payment', 'account', 'verification'].indexOf(currentStep) >= index
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={currentStep === 'package'}
              className="flex-1"
            >
              Back
            </Button>
            {currentStep === 'verification' ? (
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !canProceed()} 
                className="flex-1"
              >
                {loading ? 'Creating Members...' : 'Create Members'}
              </Button>
            ) : currentStep === 'members' ? (
              // Members step uses internal navigation, hide main Next button
              <div className="flex-1" />
            ) : (
              <Button 
                onClick={handleNext} 
                disabled={!canProceed()} 
                className="flex-1"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};