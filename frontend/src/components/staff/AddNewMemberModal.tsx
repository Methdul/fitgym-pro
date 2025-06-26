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
  Package, UserPlus, Search, X, Users, Check, CheckCircle, Copy, AlertTriangle
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
    if (open && branchId) {
      fetchPackages();
      fetchStaff();
      // Don't fetch existing members immediately - only when needed
    }
  }, [open, branchId]);

  // Fetch existing members when couple/family package is selected
  useEffect(() => {
    if (selectedPackage && selectedPackage.max_members > 1 && existingMembers.length === 0) {
      fetchExistingMembers();
    }
  }, [selectedPackage]);

  useEffect(() => {
    if (selectedPackage) {
      const safeDuration = selectedPackage.duration_months || 1;
      const safePrice = selectedPackage.price || 0;
      
      setPaymentInfo({
        duration: safeDuration,
        price: safePrice,
        paymentMethod: ''
      });
      
      // Initialize member forms based on package type
      const memberCount = selectedPackage.max_members || 1;
      const initialForms: MemberFormData[] = Array.from({ length: memberCount }, () => ({
        isExisting: false,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        nationalId: ''
      }));
      
      setMemberForms(initialForms);
      setCurrentMemberIndex(0);
      setSelectedExistingMembers([]);
    }
  }, [selectedPackage]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setPackages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/staff/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setStaff(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchExistingMembers = async () => {
    // Validate branchId before making request
    if (!branchId || branchId.trim() === '') {
      console.warn('Cannot fetch existing members: branchId is missing');
      return;
    }

    setSearchingMembers(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          branchId: branchId.trim(),
          searchTerm: '',
          statusFilter: 'all' // Include all members, including expired ones
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setExistingMembers(data.data || []);
      } else {
        // Log the actual error for debugging
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch existing members:', response.status, errorData);
        
        // Don't show error toast for this background operation
        // Just set empty array and continue
        setExistingMembers([]);
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
      // Set empty array on error so the component still works
      setExistingMembers([]);
    } finally {
      setSearchingMembers(false);
    }
  };

  // Get expired members for couple/family packages
  const getExpiredMembers = () => {
    const now = new Date();
    return existingMembers.filter(member => {
      const expiryDate = new Date(member.expiry_date);
      return expiryDate < now || member.status === 'expired';
    });
  };

  const getFilteredExistingMembers = () => {
    // For couple/family packages, always show expired members first
    if (selectedPackage && selectedPackage.max_members > 1) {
      const expiredMembers = getExpiredMembers();
      
      if (!existingMemberSearch.trim()) {
        return expiredMembers.slice(0, 10); // Show expired members by default
      }
      
      // If searching, filter expired members + search all members
      const searchLower = existingMemberSearch.toLowerCase();
      const allFilteredMembers = existingMembers.filter(member => {
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        const matchesSearch = fullName.includes(searchLower) || 
                             member.email.toLowerCase().includes(searchLower) ||
                             (member.phone && member.phone.includes(existingMemberSearch));
        
        const isNotSelected = !selectedExistingMembers.some(selected => selected.id === member.id);
        return matchesSearch && isNotSelected;
      });
      
      return allFilteredMembers.slice(0, 10);
    }
    
    // For individual packages, use normal search behavior
    if (!existingMemberSearch.trim()) return [];
    
    return existingMembers.filter(member => {
      const searchLower = existingMemberSearch.toLowerCase();
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(searchLower) || 
                           member.email.toLowerCase().includes(searchLower) ||
                           (member.phone && member.phone.includes(existingMemberSearch));
      
      // Don't show already selected members
      const isNotSelected = !selectedExistingMembers.some(selected => selected.id === member.id);
      
      return matchesSearch && isNotSelected;
    }).slice(0, 10); // Limit results for better UX
  };

  const getMemberStatus = (member: Member) => {
    const now = new Date();
    const expiryDate = new Date(member.expiry_date);
    
    if (member.status === 'suspended') return { status: 'suspended', color: 'yellow' };
    if (expiryDate < now) return { status: 'expired', color: 'red' };
    return { status: 'active', color: 'green' };
  };

  const currentMember = memberForms[currentMemberIndex];
  const totalMembers = selectedPackage?.max_members || 1;
  const filteredExistingMembers = getFilteredExistingMembers();

  const updateMemberForm = (updates: Partial<MemberFormData>) => {
    setMemberForms(prev => prev.map((form, index) => 
      index === currentMemberIndex ? { ...form, ...updates } : form
    ));
  };

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
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/create-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          branchId,
          packageId: selectedPackage?.id,
          members: memberForms,
          paymentInfo,
          staffVerification: verification
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create members');
      }

      const result = await response.json();
      setCreatedAccounts(result.data.accounts || []);
      setCurrentStep('success');

      toast({
        title: "Success! 🎉",
        description: `${memberForms.length} member${memberForms.length > 1 ? 's' : ''} ${memberForms.length > 1 ? 'have' : 'has'} been successfully added with login accounts`
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
    setExistingMembers([]); // Clear existing members cache
    setPaymentInfo({ duration: 1, price: 0, paymentMethod: '' });
    setVerification({ staffId: '', pin: '' });
    setExistingMemberSearch('');
    setCreatedAccounts([]);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'package':
        return (
          <div className="space-y-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto p-2">
                {packages.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedPackage?.id === pkg.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg' 
                        : 'border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        <Badge 
                          variant={pkg.type === 'couple' ? 'secondary' : pkg.type === 'family' ? 'default' : 'outline'}
                          className="capitalize"
                        >
                          {pkg.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">${pkg.price}</span>
                        <span className="text-sm text-muted-foreground">
                          /{pkg.duration_months} {pkg.duration_months === 1 ? 'month' : 'months'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Up to {pkg.max_members} member{pkg.max_members > 1 ? 's' : ''}</span>
                      </div>
                      
                      {pkg.features && pkg.features.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Features:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {pkg.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-500" />
                                {feature}
                              </li>
                            ))}
                            {pkg.features.length > 3 && (
                              <li className="text-xs text-muted-foreground">
                                +{pkg.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {selectedPackage?.id === pkg.id && (
                        <div className="flex items-center gap-2 text-sm text-primary font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Selected
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'members':
        const memberLabel = selectedPackage?.type === 'couple' 
          ? (currentMemberIndex === 0 ? 'Partner 1' : 'Partner 2')
          : selectedPackage?.type === 'family'
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

            {/* Member Navigation */}
            {totalMembers > 1 && (
              <div className="flex justify-center gap-2 mb-6">
                {Array.from({ length: totalMembers }).map((_, index) => (
                  <Button
                    key={index}
                    variant={index === currentMemberIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentMemberIndex(index)}
                    className="w-10 h-10 rounded-full"
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            )}

            <Tabs defaultValue={selectedPackage?.max_members > 1 ? "existing" : "new"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">New Member</TabsTrigger>
                <TabsTrigger 
                  value="existing"
                  onClick={() => {
                    // Fetch existing members when tab is clicked (if not already fetched)
                    if (existingMembers.length === 0 && !searchingMembers) {
                      fetchExistingMembers();
                    }
                  }}
                >
                  Existing Member
                  {selectedPackage?.max_members > 1 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {getExpiredMembers().length} expired
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="new" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={currentMember?.firstName || ''}
                      onChange={(e) => updateMemberForm({ firstName: e.target.value })}
                      placeholder="Enter first name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={currentMember?.lastName || ''}
                      onChange={(e) => updateMemberForm({ lastName: e.target.value })}
                      placeholder="Enter last name"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentMember?.email || ''}
                      onChange={(e) => updateMemberForm({ email: e.target.value })}
                      placeholder="Enter email address"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={currentMember?.phone || ''}
                      onChange={(e) => updateMemberForm({ phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="nationalId">National ID *</Label>
                    <Input
                      id="nationalId"
                      value={currentMember?.nationalId || ''}
                      onChange={(e) => updateMemberForm({ nationalId: e.target.value })}
                      placeholder="Enter national ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={currentMember?.address || ''}
                      onChange={(e) => updateMemberForm({ address: e.target.value })}
                      placeholder="Enter address"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={currentMember?.emergencyContact || ''}
                      onChange={(e) => updateMemberForm({ emergencyContact: e.target.value })}
                      placeholder="Emergency contact name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={currentMember?.emergencyPhone || ''}
                      onChange={(e) => updateMemberForm({ emergencyPhone: e.target.value })}
                      placeholder="Emergency contact phone"
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-6">
                {/* Show expired members notice for couple/family packages */}
                {selectedPackage?.max_members > 1 && getExpiredMembers().length > 0 && (
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <h4 className="font-medium text-orange-800">Expired Members Available</h4>
                      </div>
                      <p className="text-sm text-orange-700">
                        {getExpiredMembers().length} expired member{getExpiredMembers().length !== 1 ? 's' : ''} can be added to this {selectedPackage.type} package.
                        You can select them below to renew their membership.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    className="pl-10"
                    placeholder={selectedPackage?.max_members > 1 ? "Search members or view expired members below..." : "Search by name, email, or phone..."}
                    value={existingMemberSearch}
                    onChange={(e) => setExistingMemberSearch(e.target.value)}
                  />
                </div>

                {selectedExistingMembers.length > 0 && (
                  <div className="space-y-3">
                    <Label>Selected Members:</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedExistingMembers.map((member) => {
                        const memberStatus = getMemberStatus(member);
                        return (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium">{member.first_name} {member.last_name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  memberStatus.color === 'green' ? 'border-green-500 text-green-700' :
                                  memberStatus.color === 'red' ? 'border-red-500 text-red-700' :
                                  'border-yellow-500 text-yellow-700'
                                }`}
                              >
                                {memberStatus.status}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSelectedMember(member.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show available members */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchingMembers ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Searching members...</p>
                    </div>
                  ) : filteredExistingMembers.length > 0 ? (
                    <>
                      {/* Show section header for couple/family packages */}
                      {selectedPackage?.max_members > 1 && !existingMemberSearch && (
                        <div className="mb-3">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Expired Members Available for Renewal:
                          </Label>
                        </div>
                      )}
                      {filteredExistingMembers.map((member) => {
                        const memberStatus = getMemberStatus(member);
                        return (
                          <Card 
                            key={member.id} 
                            className={`cursor-pointer transition-colors ${
                              memberStatus.status === 'expired' 
                                ? 'hover:bg-red-50 border-red-200' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => selectExistingMember(member)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="font-medium">{member.first_name} {member.last_name}</p>
                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                                    {memberStatus.status === 'expired' && (
                                      <p className="text-xs text-red-600 mt-1">
                                        Expired {Math.abs(Math.ceil((new Date(member.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days ago
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      memberStatus.color === 'green' ? 'border-green-500 text-green-700' :
                                      memberStatus.color === 'red' ? 'border-red-500 text-red-700 bg-red-50' :
                                      'border-yellow-500 text-yellow-700'
                                    }`}
                                  >
                                    {memberStatus.status}
                                  </Badge>
                                  {memberStatus.status === 'expired' && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {selectedPackage?.max_members > 1 && !existingMemberSearch 
                          ? "No expired members found" 
                          : "No members found"
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Show search instruction for individual packages */}
                {selectedPackage?.max_members === 1 && !existingMemberSearch && existingMembers.length === 0 && !searchingMembers && (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">Search for existing members</p>
                    <p className="text-xs text-muted-foreground mb-4">Including expired members who can be renewed</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchExistingMembers}
                    >
                      Load Members
                    </Button>
                  </div>
                )}

                {/* Show search instruction when members are loaded */}
                {selectedPackage?.max_members === 1 && !existingMemberSearch && existingMembers.length > 0 && (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Start typing to search for existing members</p>
                    <p className="text-xs text-muted-foreground mt-1">Including expired members who can be renewed</p>
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
              <p className="text-muted-foreground">Configure payment details for the membership</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Package Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Package</Label>
                    <p className="text-sm text-muted-foreground">{selectedPackage?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Members</Label>
                    <p className="text-sm text-muted-foreground">{memberForms.length} member{memberForms.length > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Duration</Label>
                    <p className="text-sm text-muted-foreground">{paymentInfo.duration} month{paymentInfo.duration > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="duration">Duration (Months) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="24"
                  value={paymentInfo.duration}
                  onChange={(e) => setPaymentInfo(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="price">Total Amount *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentInfo.price}
                  onChange={(e) => setPaymentInfo(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentInfo.paymentMethod} onValueChange={(value) => setPaymentInfo(prev => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Staff Verification</h3>
              <p className="text-muted-foreground">Verify your identity to complete the registration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="staffId">Staff Member *</Label>
                <Select value={verification.staffId} onValueChange={(value) => setVerification(prev => ({ ...prev, staffId: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.first_name} {staffMember.last_name} ({staffMember.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pin">Security PIN *</Label>
                <Input
                  id="pin"
                  type="password"
                  value={verification.pin}
                  onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="Enter your security PIN"
                  maxLength={6}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <div>
              <h3 className="text-xl font-semibold text-green-700">Success!</h3>
              <p className="text-muted-foreground mt-2">
                {memberForms.length} member{memberForms.length > 1 ? 's have' : ' has'} been successfully added
              </p>
            </div>

            {createdAccounts.length > 0 && (
              <Card className="text-left">
                <CardHeader>
                  <CardTitle className="text-base">Login Accounts Created</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Please share these credentials with the members
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {createdAccounts.map((account, index) => (
                    <div key={index} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{account.memberName}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`Email: ${account.email}\nPassword: ${account.password}`);
                            toast({ title: "Copied to clipboard!" });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Details
                        </Button>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Email:</strong> {account.email}</p>
                        <p><strong>Password:</strong> {account.password}</p>
                      </div>
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
            <div className="flex gap-3 pt-6 border-t">
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
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Members...
                    </>
                  ) : (
                    'Create Members'
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed()} 
                  className="flex-1"
                >
                  {currentStep === 'members' && currentMemberIndex < memberForms.length - 1 
                    ? `Next Member (${currentMemberIndex + 2}/${memberForms.length})`
                    : 'Next'
                  }
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};