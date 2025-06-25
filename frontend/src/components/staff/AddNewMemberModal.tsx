import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, Phone, MapPin, User, CreditCard, Calendar, Shield, 
  Package, UserPlus, Search, X, Users, Check, CheckCircle, Copy
} from 'lucide-react';
import { db, getAuthHeaders } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Package as PackageType, BranchStaff, Member } from '@/types';

interface AddNewMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
}

type Step = 'package' | 'members' | 'payment' | 'verification' | 'success';

interface MemberFormData {
  id?: string;
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
  // Helper function to safely get property from member
  const getMemberProperty = (member: Member, property: string): string => {
    return (member as Record<string, any>)[property] || '';
  };

  const [currentStep, setCurrentStep] = useState<Step>('package');
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<any[]>([]);
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
      // FIXED: Safe property handling
      const safeDuration = selectedPackage.duration_months || 1;
      const safePrice = selectedPackage.price || 0;
      
      setPaymentInfo(prev => ({
        ...prev,
        duration: safeDuration,
        price: safePrice
      }));
      initializeMemberForms();
    }
  }, [selectedPackage]);

  // FIXED: Updated API endpoint and added authentication
  const fetchPackages = async () => {
    try {
      // FIXED: Use correct endpoint with authentication
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        // Filter to only show active packages
        const activePackages = (result.data || []).filter((pkg: PackageType) => pkg.is_active);
        setPackages(activePackages);
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
      case 'family': return 4;
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
    
    return matchesSearch && !selectedExistingMembers.some(selected => selected.id === member.id);
  });

  const updateMemberForm = (updates: Partial<MemberFormData>) => {
    setMemberForms(prev => prev.map((form, index) => 
      index === currentMemberIndex ? { ...form, ...updates } : form
    ));
  };

  // FIXED: Safe property access for member properties
  const selectExistingMember = (member: Member) => {
    const updatedForms = [...memberForms];
    updatedForms[currentMemberIndex] = {
      id: member.id,
      isExisting: true,
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      phone: member.phone,
      address: getMemberProperty(member, 'address'),
      emergencyContact: getMemberProperty(member, 'emergency_contact'),
      emergencyPhone: getMemberProperty(member, 'emergency_phone'),
      nationalId: member.national_id
    };
    
    setMemberForms(updatedForms);
    setSelectedExistingMembers(prev => [...prev, member]);
    setExistingMemberSearch('');
  };

  const removeSelectedMember = (memberId: string) => {
    setSelectedExistingMembers(prev => prev.filter(m => m.id !== memberId));
    
    const updatedForms = [...memberForms];
    const memberIndex = updatedForms.findIndex(form => form.id === memberId);
    if (memberIndex !== -1) {
      updatedForms[memberIndex] = {
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
      setMemberForms(updatedForms);
    }
  };

  const validateCurrentMember = (): boolean => {
    const member = memberForms[currentMemberIndex];
    if (!member) return false;

    if (member.isExisting) return true;

    const required = ['firstName', 'lastName', 'email', 'phone', 'nationalId'];
    return required.every(field => member[field as keyof MemberFormData]?.toString().trim() !== '');
  };

  const validatePaymentInfo = (): boolean => {
    return paymentInfo.duration > 0 && paymentInfo.price > 0 && paymentInfo.paymentMethod !== '';
  };

  const handleSubmit = async () => {
    if (!selectedPackage || !verification.staffId || !verification.pin) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Verify staff PIN first
      const { isValid } = await db.staff.verifyPin(verification.staffId, verification.pin);
      
      if (!isValid) {
        toast({
          title: "Invalid PIN",
          description: "The entered PIN is incorrect",
          variant: "destructive"
        });
        return;
      }

      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + paymentInfo.duration);

      const accounts = [];

      // Process each member
      for (let i = 0; i < memberForms.length; i++) {
        const memberForm = memberForms[i];
        
        if (memberForm.isExisting && memberForm.id) {
          // Update existing member
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
          // Create new member with automatic account creation
          const memberData = {
            branch_id: branchId,
            first_name: memberForm.firstName,
            last_name: memberForm.lastName,
            email: memberForm.email,
            phone: memberForm.phone,
            national_id: memberForm.nationalId,
            status: 'active' as const,
            package_type: selectedPackage!.type,
            package_name: selectedPackage!.name,
            package_price: paymentInfo.price,
            start_date: startDate.toISOString().split('T')[0],
            expiry_date: expiryDate.toISOString().split('T')[0],
            is_verified: false,
            is_existing_member: false,
            processed_by_staff_id: verification.staffId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error, data } = await db.members.create(memberData);
          if (error) throw error;
          
          // Store account info for display
          if (data && data.account) {
            accounts.push({
              member: memberForm,
              account: data.account
            });
          }
        }
      }

      // Log the action via API
      const logResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/action-logs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staff_id: verification.staffId,
          action_type: 'MEMBER_ADDED',
          description: `Added ${memberForms.length} member(s) with ${selectedPackage!.name} package`,
          created_at: new Date().toISOString()
        }),
      });

      // Log action creation is not critical, so don't fail if it errors
      if (!logResponse.ok) {
        console.warn('Failed to create action log, but member creation was successful');
      }

      setCreatedAccounts(accounts);
      setCurrentStep('success');

      const memberNames = memberForms.map(m => `${m.firstName} ${m.lastName}`).join(', ');
      toast({
        title: "Members Added",
        description: `${memberNames} ${memberForms.length > 1 ? 'have' : 'has'} been successfully added with login accounts`
      });

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
    setVerification({ staffId: '', pin: '' });
    setExistingMemberSearch('');
    setCreatedAccounts([]);
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
                        {/* FIXED: Safe price display */}
                        <p className="text-2xl font-bold text-primary">${pkg.price || 'N/A'}</p>
                        {/* FIXED: Safe duration display */}
                        <p className="text-sm text-muted-foreground">{pkg.duration_months || 1} month(s)</p>
                        <div className="space-y-1">
                          {/* FIXED: Safe features display */}
                          {pkg.features && pkg.features.slice(0, 3).map((feature, index) => (
                            <p key={index} className="text-xs text-muted-foreground">• {feature}</p>
                          ))}
                          {pkg.features && pkg.features.length > 3 && (
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
          </div>
        );

      case 'members':
        if (!selectedPackage || memberForms.length === 0) return null;
        
        const currentMember = memberForms[currentMemberIndex];
        const totalMembers = memberForms.length;
        const memberLabel = selectedPackage.type === 'couple' 
          ? (currentMemberIndex === 0 ? 'Partner 1' : 'Partner 2')
          : selectedPackage.type === 'family'
          ? `Family Member ${currentMemberIndex + 1}`
          : 'Member';

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">
                Add {memberLabel} ({currentMemberIndex + 1} of {totalMembers})
              </h3>
              <p className="text-muted-foreground">Enter member information or select existing member</p>
            </div>

            <Tabs defaultValue="new" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">New Member</TabsTrigger>
                <TabsTrigger value="existing">Existing Member</TabsTrigger>
              </TabsList>
              
              <TabsContent value="new" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={currentMember?.firstName || ''}
                      onChange={(e) => updateMemberForm({ firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={currentMember?.lastName || ''}
                      onChange={(e) => updateMemberForm({ lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentMember?.email || ''}
                      onChange={(e) => updateMemberForm({ email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={currentMember?.phone || ''}
                      onChange={(e) => updateMemberForm({ phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nationalId">National ID *</Label>
                  <Input
                    id="nationalId"
                    value={currentMember?.nationalId || ''}
                    onChange={(e) => updateMemberForm({ nationalId: e.target.value })}
                    placeholder="Enter national ID number"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={currentMember?.address || ''}
                    onChange={(e) => updateMemberForm({ address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={currentMember?.emergencyContact || ''}
                      onChange={(e) => updateMemberForm({ emergencyContact: e.target.value })}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={currentMember?.emergencyPhone || ''}
                      onChange={(e) => updateMemberForm({ emergencyPhone: e.target.value })}
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    className="pl-10"
                    placeholder="Search existing members..."
                    value={existingMemberSearch}
                    onChange={(e) => setExistingMemberSearch(e.target.value)}
                  />
                </div>

                {selectedExistingMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Members:</Label>
                    {selectedExistingMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{member.first_name} {member.last_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSelectedMember(member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {existingMemberSearch && (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchingMembers ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Searching members...</p>
                      </div>
                    ) : filteredExistingMembers.length > 0 ? (
                      filteredExistingMembers.map((member) => (
                        <Card key={member.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectExistingMember(member)}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{member.first_name} {member.last_name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                              <Badge variant="outline">{member.status}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No members found</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Payment Information</h3>
              <p className="text-muted-foreground">Configure membership duration and payment details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (months)</Label>
                <Input
                  id="duration"
                  type="number"
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
                    <p><span className="text-muted-foreground">Duration:</span> {paymentInfo.duration} month{paymentInfo.duration > 1 ? 's' : ''}</p>
                    <p><span className="text-muted-foreground">Total Price:</span> ${paymentInfo.price}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Staff Verification</h3>
              <p className="text-muted-foreground">Verify staff authorization for member registration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="staff">Authorizing Staff *</Label>
                <Select value={verification.staffId} onValueChange={(value) => setVerification(prev => ({ ...prev, staffId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pin">Staff PIN *</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  value={verification.pin}
                  onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value }))}
                  maxLength={4}
                />
              </div>
            </div>

            {/* Final Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Registration Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Package: {selectedPackage?.name}</p>
                  <p className="text-sm text-muted-foreground">Type: {getPackageTypeLabel(selectedPackage?.type || '')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Members ({memberForms.length}):</p>
                  {memberForms.map((member, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      • {member.firstName} {member.lastName} {member.isExisting ? '(Existing)' : '(New)'}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium">Duration: {paymentInfo.duration} month{paymentInfo.duration > 1 ? 's' : ''}</p>
                  <p className="text-sm font-medium">Total: ${paymentInfo.price}</p>
                  <p className="text-sm font-medium">Payment: {paymentInfo.paymentMethod}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6 text-center">
            <div>
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-green-700">Members Successfully Added!</h3>
              <p className="text-muted-foreground">All members have been registered and their accounts are ready</p>
            </div>

            {createdAccounts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {createdAccounts.map((account, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg space-y-2">
                      <p className="font-medium">{account.member.firstName} {account.member.lastName}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-muted-foreground">Email:</span> {account.account.email}</p>
                        <p><span className="text-muted-foreground">Password:</span> {account.account.password}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`Email: ${account.account.email}\nPassword: ${account.account.password}`);
                          toast({ title: "Copied to clipboard!" });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Details
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const steps = ['package', 'members', 'payment', 'verification'];
    return steps.indexOf(currentStep) + 1;
  };

  const getTotalSteps = () => {
    return currentStep === 'success' ? 5 : 4;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'package': return 'Select a membership package';
      case 'members': return 'Add member information';
      case 'payment': return 'Configure payment details';
      case 'verification': return 'Staff verification required';
      case 'success': return 'Members successfully added';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'package': return selectedPackage !== null;
      case 'members': return validateCurrentMember();
      case 'payment': return validatePaymentInfo();
      case 'verification': return verification.staffId && verification.pin;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'package':
        if (selectedPackage) {
          setCurrentStep('members');
        }
        break;
      case 'members':
        if (validateCurrentMember()) {
          if (currentMemberIndex < memberForms.length - 1) {
            setCurrentMemberIndex(prev => prev + 1);
          } else {
            setCurrentStep('payment');
          }
        }
        break;
      case 'payment':
        if (validatePaymentInfo()) {
          setCurrentStep('verification');
        }
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'members':
        if (currentMemberIndex > 0) {
          setCurrentMemberIndex(prev => prev - 1);
        } else {
          setCurrentStep('package');
        }
        break;
      case 'payment':
        setCurrentStep('members');
        setCurrentMemberIndex(memberForms.length - 1);
        break;
      case 'verification':
        setCurrentStep('payment');
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member - Step {getStepNumber()} of {getTotalSteps()}</DialogTitle>
          <p className="text-muted-foreground">{getStepTitle()}</p>
        </DialogHeader>

        <div className="space-y-6">
          {currentStep !== 'success' && (
            <div className="flex space-x-2">
              {['package', 'members', 'payment', 'verification'].map((step, index) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded ${
                    ['package', 'members', 'payment', 'verification'].indexOf(currentStep) >= index
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}

          {renderStepContent()}

          {currentStep !== 'success' && (
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
                  {loading ? 'Creating Members & Accounts...' : 'Create Members'}
                </Button>
              ) : currentStep === 'members' ? (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};