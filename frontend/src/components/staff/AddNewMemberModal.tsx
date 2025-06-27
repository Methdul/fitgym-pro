import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/supabase';
import { 
  Package as PackageIcon, 
  User, 
  Users, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Info,
  DollarSign,
  Edit,
  UserCheck,
  Search,
  X,
  Copy
} from 'lucide-react';
import type { Member, Package as PackageType, BranchStaff } from '@/types';

interface AddNewMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
}

type Step = 'package' | 'members' | 'summary' | 'verification' | 'success';

interface MemberFormData {
  id?: string;
  isExisting?: boolean;
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
  // State management
  const [currentStep, setCurrentStep] = useState<Step>('package');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Package selection
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);

  // Member forms
  const [memberForms, setMemberForms] = useState<MemberFormData[]>([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  
  // Existing member selection
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);
  const [existingMemberSearch, setExistingMemberSearch] = useState('');
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<Member[]>([]);

  // Package summary and payment
  const [duration, setDuration] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  // Staff verification
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [verification, setVerification] = useState({ staffId: '', pin: '' });

  // Success
  const [createdAccounts, setCreatedAccounts] = useState<any[]>([]);

  // Initialize member forms when package is selected
  useEffect(() => {
    if (selectedPackage) {
      console.log('Initializing forms for package:', selectedPackage.name, 'max_members:', selectedPackage.max_members);
      const newForms: MemberFormData[] = Array.from(
        { length: selectedPackage.max_members || 1 },
        () => ({
          isExisting: false,
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          emergencyContact: '',
          emergencyPhone: '',
          nationalId: ''
        })
      );
      setMemberForms(newForms);
      setCurrentMemberIndex(0);
      
      // Set initial price
      const totalPrice = selectedPackage.price * duration;
      setCustomPrice(totalPrice.toString());
      
      console.log('Created member forms:', newForms.length, 'Initial price:', totalPrice);
    }
  }, [selectedPackage]);

  // Update price when duration changes
  useEffect(() => {
    if (selectedPackage && duration) {
      const totalPrice = selectedPackage.price * duration;
      setCustomPrice(totalPrice.toString());
    }
  }, [selectedPackage, duration]);

  // Fetch packages and staff on open
  useEffect(() => {
    if (open && packages.length === 0) {
      fetchPackages();
      fetchStaff();
      fetchExistingMembers();
    }
  }, [open]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`,
        { headers: getAuthHeaders() }
      );
      const result = await response.json();
      if (response.ok) {
        setPackages(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/staff/branch/${branchId}`,
        { headers: getAuthHeaders() }
      );
      const result = await response.json();
      if (response.ok) {
        setStaff(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchExistingMembers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/branch/${branchId}?limit=100`,
        { headers: getAuthHeaders() }
      );
      const result = await response.json();
      if (response.ok) {
        setExistingMembers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
    }
  };

  const resetForm = () => {
    setCurrentStep('package');
    setSelectedPackage(null);
    setMemberForms([]);
    setCurrentMemberIndex(0);
    setDuration(1);
    setCustomPrice('');
    setPaymentMethod('cash');
    setVerification({ staffId: '', pin: '' });
    setCreatedAccounts([]);
    setExistingMemberSearch('');
    setSelectedExistingMembers([]);
  };

  // Helper function to get member property safely
  const getMemberProperty = (member: Member, property: string): string => {
    return (member as Record<string, any>)[property] || '';
  };

  // Existing member selection functions
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

  // Update member form data
  const updateMemberForm = (index: number, updates: Partial<MemberFormData>) => {
    console.log('Updating member form:', index, updates);
    setMemberForms(prev => {
      const newForms = prev.map((form, i) => 
        i === index ? { ...form, ...updates } : form
      );
      console.log('Updated forms:', newForms);
      return newForms;
    });
  };

  // Validation functions
  const validateCurrentMember = (): boolean => {
    const member = memberForms[currentMemberIndex];
    if (!member) return false;
    
    if (member.isExisting) return true;

    const required = ['firstName', 'lastName', 'email', 'phone', 'nationalId'];
    return required.every(field => member[field as keyof MemberFormData]?.toString().trim() !== '');
  };

  const validateAllMembers = (): boolean => {
    console.log('Validating all members:', memberForms);
    return memberForms.every((member, index) => {
      if (member.isExisting) {
        console.log(`Member ${index + 1}: Existing member - valid`);
        return true;
      }
      const required = ['firstName', 'lastName', 'email', 'phone', 'nationalId'];
      const isValid = required.every(field => {
        const value = member[field as keyof MemberFormData]?.toString().trim();
        const hasValue = value !== '';
        if (!hasValue) {
          console.log(`Member ${index + 1}: Missing ${field}`);
        }
        return hasValue;
      });
      console.log(`Member ${index + 1}: ${isValid ? 'Valid' : 'Invalid'}`);
      return isValid;
    });
  };

  const validateSummary = (): boolean => {
    const priceValid = duration > 0 && parseFloat(customPrice || '0') > 0;
    const paymentValid = (paymentMethod === 'cash' || paymentMethod === 'card');
    const membersValid = validateAllMembers();
    
    console.log('Validation check:', {
      duration,
      customPrice,
      priceValid,
      paymentMethod,
      paymentValid,
      membersValid,
      memberForms: memberForms.length
    });
    
    return priceValid && paymentValid && membersValid;
  };

  // Navigation functions
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
            setCurrentStep('summary');
          }
        }
        break;
      case 'summary':
        if (validateSummary()) {
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
      case 'summary':
        setCurrentStep('members');
        setCurrentMemberIndex(memberForms.length - 1);
        break;
      case 'verification':
        setCurrentStep('summary');
        break;
    }
  };

  // Calculate total price
  const calculatePrice = () => {
    if (!selectedPackage) return 0;
    return selectedPackage.price * duration;
  };

  // Handle price reset to calculated value
  const resetPriceToCalculated = () => {
    setCustomPrice(calculatePrice().toString());
  };

  // Submit form - FIXED to only send required backend fields
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const createdMembers = [];
      
      // Create each member individually since backend doesn't have bulk endpoint
      for (let i = 0; i < memberForms.length; i++) {
        const member = memberForms[i];
        
        // Skip if existing member (they're already in the system)
        if (member.isExisting) {
          continue;
        }
        
        // Only send the fields that backend validation expects + flag for auth account creation
        const memberData = {
          firstName: member.firstName,
          lastName: member.lastName,
          email: `${member.nationalId}@gmail.com`, // Use generated email like existing member
          phone: member.phone,
          branchId: branchId, // Make sure this is a valid UUID
          packageId: selectedPackage?.id, // Make sure this is a valid UUID
          // Optional fields that backend accepts
          emergencyContact: member.emergencyContact || '',
          address: member.address || '',
          nationalId: member.nationalId || '', // Add this back as it's likely needed
          // IMPORTANT: Add this flag to create user auth account (same as existing member)
          is_existing_member: true // This tells backend to generate auth account
          // Backend calculates: packageType, packageName, packagePrice, dates, status, etc.
        };

        console.log('Sending member data:', memberData);
        console.log('BranchId type:', typeof branchId, 'value:', branchId);
        console.log('PackageId type:', typeof selectedPackage?.id, 'value:', selectedPackage?.id);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify(memberData)
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Member creation failed:', errorData);
          console.error('Sent data was:', memberData);
          
          // Show detailed validation errors if available
          if (errorData.details && Array.isArray(errorData.details)) {
            console.error('Validation errors:', errorData.details);
            const errorMessages = errorData.details.map((detail: any) => detail.msg || detail.message).join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
          }
          
          throw new Error(errorData.message || errorData.error || 'Failed to create member');
        }

        const result = await response.json();
        
        // Add account credentials for display (same as existing member logic)
        const memberWithCredentials = {
          ...result.data,
          // Use same format as AddExistingMemberModal: nationalId@gmail.com + nationalId as password
          accountEmail: `${member.nationalId}@gmail.com`, // Same format: ID@gmail.com
          accountPassword: member.nationalId, // Same as existing member: National ID as password
          fullName: `${result.data.first_name} ${result.data.last_name}`
        };
        
        createdMembers.push(memberWithCredentials);
      }

      setCreatedAccounts(createdMembers);
      setCurrentStep('success');

      toast({
        title: "Success! 🎉",
        description: `${createdMembers.length} member${createdMembers.length > 1 ? 's' : ''} ${createdMembers.length > 1 ? 'have' : 'has'} been successfully created.`,
      });

      onMemberAdded();

    } catch (error) {
      console.error('Error creating members:', error);
      toast({
        title: "Member Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get step info
  const getStepInfo = () => {
    const steps = ['package', 'members', 'summary', 'verification', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    return {
      current: currentIndex + 1,
      total: steps.length,
      title: {
        package: 'Select Membership Package',
        members: `Member Details ${selectedPackage?.max_members > 1 ? `(${currentMemberIndex + 1} of ${memberForms.length})` : ''}`,
        summary: 'Package Summary & Payment',
        verification: 'Staff Verification Required',
        success: 'Members Successfully Created'
      }[currentStep]
    };
  };

  const stepInfo = getStepInfo();

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'package':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <PackageIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Choose a membership package</h3>
              <p className="text-muted-foreground">Select the package that best fits your needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all hover:shadow-md gym-card-gradient ${
                    selectedPackage?.id === pkg.id
                      ? 'ring-2 ring-primary border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between text-foreground">
                      {pkg.name}
                      <Badge variant="secondary">
                        {pkg.max_members} member{pkg.max_members > 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-semibold text-foreground">${pkg.price}/month</span>
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
        if (!memberForms.length) {
          return <div className="text-center text-muted-foreground">Loading member forms...</div>;
        }

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

        // Filter existing members for search
        const filteredExistingMembers = existingMembers.filter(member =>
          existingMemberSearch === '' || 
          `${member.first_name} ${member.last_name}`.toLowerCase().includes(existingMemberSearch.toLowerCase()) ||
          member.email.toLowerCase().includes(existingMemberSearch.toLowerCase()) ||
          member.national_id.includes(existingMemberSearch)
        );

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {selectedPackage?.max_members === 1 ? (
                <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              ) : (
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              )}
              <h3 className="text-lg font-semibold text-foreground">
                {selectedPackage?.max_members === 1 
                  ? "Member Information" 
                  : `Member ${currentMemberIndex + 1} of ${memberForms.length}`
                }
              </h3>
              <p className="text-muted-foreground">
                Fill in the required member details below
              </p>
            </div>

            {/* Option to select existing member for couple/family packages */}
            {selectedPackage && selectedPackage.max_members > 1 && (
              <Card className="gym-card-gradient border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Add Existing Member (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4">
                    You can select an existing member or create a new one below.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name, email, or national ID..."
                        value={existingMemberSearch}
                        onChange={(e) => setExistingMemberSearch(e.target.value)}
                        className="flex-1 bg-background border-border"
                      />
                    </div>
                    
                    {existingMemberSearch && (
                      <div className="max-h-48 overflow-y-auto border rounded-md border-border bg-background">
                        {filteredExistingMembers.slice(0, 5).map((member) => (
                          <div
                            key={member.id}
                            className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0 flex justify-between items-center"
                            onClick={() => selectExistingMember(member)}
                          >
                            <div>
                              <div className="font-medium text-foreground">{member.first_name} {member.last_name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                              <div className="text-xs text-muted-foreground">ID: {member.national_id}</div>
                            </div>
                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                              {member.status}
                            </Badge>
                          </div>
                        ))}
                        {filteredExistingMembers.length === 0 && (
                          <div className="p-3 text-center text-muted-foreground">No members found</div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <UserCheck className="h-4 w-4" />
                  Personal Information
                  {currentMember.isExisting && (
                    <Badge variant="default" className="ml-2 bg-green-500/10 text-green-500 border-green-500/20">Existing Member</Badge>
                  )}
                </CardTitle>
                {currentMember.isExisting && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSelectedMember(currentMember.id!)}
                    className="w-fit"
                  >
                    Use New Member Instead
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-foreground">First Name *</Label>
                    <Input
                      id="firstName"
                      value={currentMember.firstName}
                      onChange={(e) => {
                        console.log('First name change:', e.target.value);
                        updateMemberForm(currentMemberIndex, { firstName: e.target.value });
                      }}
                      placeholder="Enter first name"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-foreground">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={currentMember.lastName}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { lastName: e.target.value })}
                      placeholder="Enter last name"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-foreground">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentMember.email}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { email: e.target.value })}
                      placeholder="Enter email address"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-foreground">Phone *</Label>
                    <Input
                      id="phone"
                      value={currentMember.phone}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nationalId" className="text-foreground">National ID *</Label>
                    <Input
                      id="nationalId"
                      value={currentMember.nationalId}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { nationalId: e.target.value })}
                      placeholder="Enter national ID"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-foreground">Address</Label>
                    <Input
                      id="address"
                      value={currentMember.address}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { address: e.target.value })}
                      placeholder="Enter address"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!currentMember.isExisting && (
              <Card className="gym-card-gradient border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Info className="h-4 w-4" />
                    Emergency Contact (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyContact" className="text-foreground">Emergency Contact Name</Label>
                      <Input
                        id="emergencyContact"
                        value={currentMember.emergencyContact}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyContact: e.target.value })}
                        placeholder="Enter emergency contact name"
                        className="mt-1 bg-background border-border text-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone" className="text-foreground">Emergency Contact Phone</Label>
                      <Input
                        id="emergencyPhone"
                        value={currentMember.emergencyPhone}
                        onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyPhone: e.target.value })}
                        placeholder="Enter emergency contact phone"
                        className="mt-1 bg-background border-border text-foreground"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'summary':
        const calculatedPrice = calculatePrice();
        const isCustomPrice = parseFloat(customPrice || '0') !== calculatedPrice;

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Package Summary & Payment</h3>
              <p className="text-muted-foreground">Review your selection and choose payment method</p>
            </div>

            {/* Package Summary */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <PackageIcon className="h-4 w-4" />
                  Package Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{selectedPackage?.name}</span>
                  <Badge variant="outline">
                    {selectedPackage?.max_members} member{selectedPackage?.max_members > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <Separator className="bg-border" />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Base Price</span>
                    <span className="text-foreground">${selectedPackage?.price}/month</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="duration" className="text-foreground">Duration *</Label>
                    <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                      <SelectTrigger className="w-32 bg-background border-border">
                        <SelectValue />
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
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Calculated Total</span>
                    <span className="font-medium text-foreground">${calculatedPrice}</span>
                  </div>
                  
                  <Separator className="bg-border" />
                  
                  {/* Professional Price Editing Section */}
                  <div className="bg-accent/30 p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium text-foreground">Final Price</Label>
                      {isCustomPrice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetPriceToCalculated}
                          className="text-xs h-7"
                        >
                          Reset to Calculated
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="text-lg font-semibold bg-background border-border text-foreground"
                          placeholder="0.00"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">USD</span>
                    </div>
                    
                    {isCustomPrice && (
                      <div className="mt-2 text-sm text-amber-300 bg-amber-500/10 p-2 rounded flex items-center gap-2 border border-amber-500/20">
                        <Info className="h-4 w-4" />
                        <span>Custom pricing applied (${Math.abs(parseFloat(customPrice || '0') - calculatedPrice).toFixed(2)} {parseFloat(customPrice || '0') > calculatedPrice ? 'above' : 'below'} calculated price)</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Members Summary */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Users className="h-4 w-4" />
                  Members ({memberForms.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {memberForms.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {member.firstName && member.lastName 
                              ? `${member.firstName} ${member.lastName}`
                              : 'Name not entered'
                            }
                          </div>
                          {member.email && (
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {member.isExisting ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Existing
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <CreditCard className="h-4 w-4" />
                  Payment Method *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'card') => setPaymentMethod(value)}>
                  <div className="grid grid-cols-2 gap-4">
                    <label htmlFor="cash" className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-border hover:border-border/60'}`}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <DollarSign className="h-5 w-5" />
                          Cash Payment
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 ml-6">
                        Pay with cash at the front desk
                      </p>
                    </label>
                    
                    <label htmlFor="card" className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-border hover:border-border/60'}`}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <CreditCard className="h-5 w-5" />
                          Card Payment
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 ml-6">
                        Pay with credit or debit card
                      </p>
                    </label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Final Summary */}
            <Card className="border-primary/20 bg-primary/10 gym-card-gradient">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">${customPrice || '0'}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {duration} month{duration > 1 ? 's' : ''} • {memberForms.length} member{memberForms.length > 1 ? 's' : ''} • {paymentMethod === 'cash' ? 'Cash' : 'Card'} payment
                </div>
              </CardContent>
            </Card>

            {/* Validation Feedback */}
            {!validateSummary() && (
              <Card className="border-amber-500/20 bg-amber-500/10 gym-card-gradient">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-amber-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-amber-300">Please complete the following:</div>
                      <ul className="text-sm text-amber-200 mt-1 space-y-1">
                        {parseFloat(customPrice || '0') <= 0 && (
                          <li>• Enter a valid price amount</li>
                        )}
                        {!paymentMethod && (
                          <li>• Select a payment method</li>
                        )}
                        {!validateAllMembers() && (
                          <li>• Complete all required member information</li>
                        )}
                      </ul>
                    </div>
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
              <h3 className="text-lg font-semibold text-foreground">Staff Verification Required</h3>
              <p className="text-muted-foreground">Confirm member creation and payment processing</p>
            </div>

            {/* Transaction Summary */}
            <Card className="border-primary/20 bg-primary/10 gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-primary">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package:</span>
                  <span className="font-medium text-foreground">{selectedPackage?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members:</span>
                  <span className="font-medium text-foreground">{memberForms.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium text-foreground">{duration} month{duration > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground capitalize">{paymentMethod}</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">Total Amount:</span>
                  <span className="text-foreground">${customPrice}</span>
                </div>
              </CardContent>
            </Card>

            {/* Staff Verification Form */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Staff Authorization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="staffId" className="text-foreground">Staff Member *</Label>
                  <Select value={verification.staffId} onValueChange={(value) => setVerification(prev => ({ ...prev, staffId: value }))}>
                    <SelectTrigger className="mt-1 bg-background border-border">
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
                  <Label htmlFor="pin" className="text-foreground">Security PIN *</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={verification.pin}
                    onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value }))}
                    placeholder="Enter your security PIN"
                    maxLength={6}
                    className="mt-1 bg-background border-border text-foreground"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="h-16 w-16 mx-auto text-green-400" />
            <div>
              <h3 className="text-xl font-semibold text-green-400">Success!</h3>
              <p className="text-muted-foreground mt-2">
                {createdAccounts.length} member{createdAccounts.length > 1 ? 's have' : ' has'} been successfully created
              </p>
            </div>

            {createdAccounts.length > 0 && (
              <Card className="gym-card-gradient border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Account Details Created
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {createdAccounts.map((account, index) => (
                      <Card key={index} className="bg-accent/30 border border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-medium text-foreground text-lg">
                                {account.fullName || `${account.first_name} ${account.last_name}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Member ID: {account.id}
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                              Active
                            </Badge>
                          </div>
                          
                          <Separator className="bg-border mb-3" />
                          
                          <div className="space-y-3">
                            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                              <div className="text-sm font-medium text-primary mb-2">Temporary Login Credentials</div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Temp Email:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-foreground">
                                      {account.accountEmail || account.email}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="p-1 h-6 w-6"
                                      onClick={() => {
                                        navigator.clipboard.writeText(account.accountEmail || account.email);
                                        toast({ title: "Copied!", description: "Email copied to clipboard" });
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Temp Password:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-foreground bg-background px-2 py-1 rounded border">
                                      {account.accountPassword || 'Generated by system'}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="p-1 h-6 w-6"
                                      onClick={() => {
                                        navigator.clipboard.writeText(account.accountPassword || '');
                                        toast({ title: "Copied!", description: "Password copied to clipboard" });
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Start Date:</span>
                                <div className="font-medium text-foreground">
                                  {account.start_date ? new Date(account.start_date).toLocaleDateString() : 'Today'}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Expires:</span>
                                <div className="font-medium text-foreground">
                                  {account.expiry_date ? new Date(account.expiry_date).toLocaleDateString() : `${duration} month${duration > 1 ? 's' : ''}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <div className="text-xs text-muted-foreground bg-accent/20 p-3 rounded border border-border">
                      <Info className="h-4 w-4 inline mr-2" />
                      These are temporary login credentials based on the member's national ID. Members can update their email and password after first login.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'package': 
        return selectedPackage !== null;
      case 'members': 
        return validateCurrentMember();
      case 'summary': 
        const valid = validateSummary();
        console.log('Can proceed from summary:', valid);
        return valid;
      case 'verification': 
        return verification.staffId && verification.pin;
      default: 
        return false;
    }
  };

  const showBackButton = () => {
    return currentStep !== 'package' && currentStep !== 'success';
  };

  const showNextButton = () => {
    return currentStep !== 'verification' && currentStep !== 'success';
  };

  const showSubmitButton = () => {
    return currentStep === 'verification';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto gym-card-gradient border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Add New Member - Step {stepInfo.current} of {stepInfo.total}
          </DialogTitle>
          <p className="text-muted-foreground">{stepInfo.title}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          {currentStep !== 'success' && (
            <div className="flex space-x-2">
              {['package', 'members', 'summary', 'verification'].map((step, index) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded ${
                    ['package', 'members', 'summary', 'verification'].indexOf(currentStep) >= index
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          {currentStep !== 'success' && (
            <div className="flex justify-between pt-4 border-t border-border">
              <div>
                {showBackButton() && (
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {showNextButton() && (
                  <Button 
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="min-w-[120px]"
                  >
                    {currentStep === 'summary' ? 'Review & Verify' : 'Next'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                
                {showSubmitButton() && (
                  <Button 
                    onClick={handleSubmit}
                    disabled={!canProceed() || loading}
                    className="min-w-[120px]"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create Members
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};