import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, Package as PackageIcon, User, CreditCard, Shield, CheckCircle, 
  Search, X, Copy, Info, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/supabase';
import type { Member, Package as PackageType, BranchStaff } from '@/types';

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

  // Initialize member forms when package is selected
  useEffect(() => {
    if (selectedPackage && memberForms.length === 0) {
      const forms = Array.from({ length: selectedPackage.max_members }, () => ({
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
      setMemberForms(forms);
    }
  }, [selectedPackage, memberForms.length]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (response.ok) {
        setPackages(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages",
        variant: "destructive"
      });
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/staff/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (response.ok) {
        setStaff(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch staff');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchExistingMembers = async () => {
    setSearchingMembers(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/branch/${branchId}?limit=100`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (response.ok) {
        setExistingMembers(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch members');
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
    } finally {
      setSearchingMembers(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('package');
    setSelectedPackage(null);
    setMemberForms([]);
    setCurrentMemberIndex(0);
    setExistingMemberSearch('');
    setSelectedExistingMembers([]);
    setPaymentInfo({ duration: 1, price: 0, paymentMethod: '' });
    setVerification({ staffId: '', pin: '' });
    setCreatedAccounts([]);
  };

  const updateMemberForm = (index: number, updates: Partial<MemberFormData>) => {
    setMemberForms(prev => prev.map((form, i) => 
      i === index ? { ...form, ...updates } : form
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

  // ✅ FIXED: Updated handleSubmit to send correct data format
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // ✅ PHASE 3 FIX: Update payload structure to match backend expectations
      const payload = {
        branchId,
        packageId: selectedPackage?.id,
        members: memberForms,
        paymentInfo,
        // ✅ Keep staffVerification as nested object for members API
        // This differs from renewals API which expects top-level fields
        staffVerification: {
          staffId: verification.staffId,
          staffPin: verification.pin  // ✅ Renamed from 'pin' to 'staffPin' for consistency
        }
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/create-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
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
        description: `${memberForms.length} member${memberForms.length > 1 ? 's' : ''} ${memberForms.length > 1 ? 'have' : 'has'} been successfully created.`,
      });

      onMemberAdded();

    } catch (error) {
      console.error('Error creating members:', error);
      toast({
        title: "Member Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'package':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <PackageIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Select Membership Package</h3>
              <p className="text-muted-foreground">Choose a package for the new member(s)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPackage?.id === pkg.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{pkg.name}</CardTitle>
                      {selectedPackage?.id === pkg.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {pkg.type} • Max {pkg.max_members} member{pkg.max_members > 1 ? 's' : ''}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-semibold">${pkg.price}/month</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <ul className="space-y-1">
                          {pkg.features?.slice(0, 2).map((feature, index) => (
                            <li key={index}>• {feature}</li>
                          ))}
                          {pkg.features?.length > 2 && (
                            <li>• +{pkg.features.length - 2} more features</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'members':
        const currentMember = memberForms[currentMemberIndex] || {
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
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">
                Member {currentMemberIndex + 1} of {memberForms.length}
              </h3>
              <p className="text-muted-foreground">
                {selectedPackage?.max_members === 1 
                  ? "Enter member information" 
                  : `Add information for member ${currentMemberIndex + 1}`
                }
              </p>
            </div>

            {/* Option to select existing member for couple/family packages */}
            {selectedPackage && selectedPackage.max_members > 1 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Add Existing Member (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-blue-700 mb-4">
                    You can select an existing member or create a new one below.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        className="pl-10"
                        placeholder="Search existing members..."
                        value={existingMemberSearch}
                        onChange={(e) => setExistingMemberSearch(e.target.value)}
                      />
                    </div>

                    {existingMemberSearch && existingMembers.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {existingMembers
                          .filter(member => 
                            (member.first_name.toLowerCase().includes(existingMemberSearch.toLowerCase()) ||
                             member.last_name.toLowerCase().includes(existingMemberSearch.toLowerCase()) ||
                             member.email.toLowerCase().includes(existingMemberSearch.toLowerCase())) &&
                            !selectedExistingMembers.find(selected => selected.id === member.id)
                          )
                          .slice(0, 5)
                          .map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                              onClick={() => selectExistingMember(member)}
                            >
                              <div>
                                <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 px-3">
                                Select
                              </Button>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Member form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {currentMember.isExisting ? 'Selected Member' : 'New Member Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentMember.isExisting ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <p className="font-medium text-green-800">
                          {currentMember.firstName} {currentMember.lastName}
                        </p>
                        <p className="text-sm text-green-600">{currentMember.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSelectedMember(currentMember.id!)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={currentMember.firstName || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { firstName: e.target.value })}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={currentMember.lastName || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { lastName: e.target.value })}
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={currentMember.email || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={currentMember.phone || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nationalId">National ID *</Label>
                      <Input
                        id="nationalId"
                        value={currentMember.nationalId || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { nationalId: e.target.value })}
                        placeholder="Enter national ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={currentMember.address || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { address: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input
                        id="emergencyContact"
                        value={currentMember.emergencyContact || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyContact: e.target.value })}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                      <Input
                        id="emergencyPhone"
                        value={currentMember.emergencyPhone || ''}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyPhone: e.target.value })}
                        placeholder="Emergency contact phone"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Payment Configuration</h3>
              <p className="text-muted-foreground">Set duration and payment details</p>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-blue-800">Selected Package</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">{selectedPackage?.name}</p>
                    <p className="text-sm text-blue-700">
                      {selectedPackage?.type} package • ${selectedPackage?.price}/month • {memberForms.length} member{memberForms.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="duration">Duration (months) *</Label>
                <Select 
                  value={paymentInfo.duration.toString()} 
                  onValueChange={(value) => {
                    const duration = parseInt(value);
                    const totalPrice = selectedPackage ? selectedPackage.price * duration * memberForms.length : 0;
                    setPaymentInfo(prev => ({ ...prev, duration, price: totalPrice }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 6, 12].map((months) => (
                      <SelectItem key={months} value={months.toString()}>
                        {months} month{months > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Total Amount (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={paymentInfo.price}
                  onChange={(e) => setPaymentInfo(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter total amount"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Calculated: ${selectedPackage ? (selectedPackage.price * paymentInfo.duration * memberForms.length).toFixed(2) : '0.00'}
                </p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select 
                  value={paymentInfo.paymentMethod} 
                  onValueChange={(value) => setPaymentInfo(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Staff Verification Required</h3>
              <p className="text-muted-foreground">Verify your identity to create the member accounts</p>
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