// Enhanced AddNewMemberModal.tsx - Conservative approach preserving original functionality
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
import { Switch } from '@/components/ui/switch';
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
  Copy,
  Calendar,
  Mail,
  UserPlus
} from 'lucide-react';
import type { Member, Package as PackageType, BranchStaff } from '@/types';

interface AddNewMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
}

type Step = 'package' | 'members' | 'summary' | 'verification' | 'success';

// Enhanced interface - adding optional autoGenerateEmail to original structure
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
  autoGenerateEmail?: boolean; // New optional field
}

export const AddNewMemberModal = ({ open, onOpenChange, branchId, onMemberAdded }: AddNewMemberModalProps) => {
  // State management - keeping original structure
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'paid'>('cash');

  // Staff verification
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [verification, setVerification] = useState({ staffId: '', pin: '' });

  // Success
  const [createdAccounts, setCreatedAccounts] = useState<any[]>([]);

  // NEW: Existing member workflow state
  const [isExistingMember, setIsExistingMember] = useState(false);
  const [lastPaidDate, setLastPaidDate] = useState<string>('');
  const [manualPrice, setManualPrice] = useState<string>('');

  // Initialize member forms when package is selected - ORIGINAL LOGIC
  useEffect(() => {
    if (selectedPackage && memberForms.length === 0) {
      const forms: MemberFormData[] = [];
      for (let i = 0; i < (selectedPackage.max_members || 1); i++) {
        forms.push({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          emergencyContact: '',
          emergencyPhone: '',
          nationalId: '',
          autoGenerateEmail: false // Default to manual email
        });
      }
      setMemberForms(forms);
      setCurrentMemberIndex(0);
    }
  }, [selectedPackage]);

  // Initialize form - ORIGINAL LOGIC
  useEffect(() => {
    if (open) {
      fetchPackages();
      fetchStaff();
      fetchExistingMembers();
      resetForm();
    }
  }, [open, branchId]);

  // NEW: Auto-generate email functionality
  useEffect(() => {
    if (memberForms[currentMemberIndex]?.autoGenerateEmail && memberForms[currentMemberIndex]?.nationalId) {
      updateMemberForm(currentMemberIndex, {
        email: `${memberForms[currentMemberIndex].nationalId}@gmail.com`
      });
    }
  }, [memberForms[currentMemberIndex]?.nationalId, memberForms[currentMemberIndex]?.autoGenerateEmail]);

  // NEW: Calculate expiry date for existing members
  const calculateExpiryDate = () => {
    if (!lastPaidDate || !selectedPackage?.duration_months) return '';
    
    const startDate = new Date(lastPaidDate);
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + selectedPackage.duration_months);
    
    return expiryDate.toISOString().split('T')[0];
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}/active`,
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
    // Reset new fields
    setIsExistingMember(false);
    setLastPaidDate('');
    setManualPrice('');
  };

  // Helper function to get member property safely - ORIGINAL
  const getMemberProperty = (member: Member, property: string): string => {
    return (member as Record<string, any>)[property] || '';
  };

  // Existing member selection functions - ORIGINAL
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

  // Update member form data - ORIGINAL
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

  // NEW: Toggle auto-generate email
  const toggleAutoGenerateEmail = (enabled: boolean) => {
    const currentMember = memberForms[currentMemberIndex];
    if (!currentMember) return;
    
    updateMemberForm(currentMemberIndex, { 
      autoGenerateEmail: enabled,
      email: enabled && currentMember.nationalId 
        ? `${currentMember.nationalId}@gmail.com` 
        : ''
    });
  };

  // Validation functions - ORIGINAL LOGIC
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

  // Enhanced validation for existing member workflow
  const validateSummary = (): boolean => {
    if (isExistingMember) {
      // For existing members: check manual price and last paid date
      const priceValid = parseFloat(manualPrice || '0') >= 0;
      const dateValid = !!lastPaidDate;
      const membersValid = validateAllMembers();
      
      return priceValid && dateValid && membersValid;
    } else {
      // For new members: regular validation
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
    }
  };

  // Navigation functions - ORIGINAL
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

  // Calculate total price - ORIGINAL
  const calculatePrice = () => {
    if (!selectedPackage) return 0;
    return selectedPackage.price * duration;
  };

  // Handle price reset to calculated value - ORIGINAL
  const resetPriceToCalculated = () => {
    setCustomPrice(calculatePrice().toString());
  };

  // Submit form - ENHANCED to handle existing member workflow
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
        
        // Prepare member data based on workflow type
        const memberData = {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          branchId: branchId,
          packageId: selectedPackage?.id,
          emergencyContact: member.emergencyContact || '',
          address: member.address || '',
          nationalId: member.nationalId || '',
          // Enhanced: Handle existing member specific data
          ...(isExistingMember ? {
            manualPrice: parseFloat(manualPrice),
            lastPaidDate: lastPaidDate,
            expiryDate: calculateExpiryDate(),
            isExistingMember: true
          } : {
            customPrice: parseFloat(customPrice || '0'),
            duration: duration,
            paymentMethod: paymentMethod
          })
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
        
        // Enhanced: Add account credentials for display
        const memberWithCredentials = {
          ...result.data,
          accountEmail: member.autoGenerateEmail ? `${member.nationalId}@gmail.com` : member.email,
          accountPassword: member.autoGenerateEmail ? member.nationalId : 'user-set-password',
          fullName: `${result.data.first_name} ${result.data.last_name}`,
          isAutoGenerated: member.autoGenerateEmail || false
        };
        
        createdMembers.push(memberWithCredentials);
      }

      setCreatedAccounts(createdMembers);
      setCurrentStep('success');

      toast({
        title: "Success! 🎉",
        description: `${createdMembers.length} member${createdMembers.length > 1 ? 's' : ''} ${createdMembers.length > 1 ? 'have' : 'has'} been successfully ${isExistingMember ? 'transferred' : 'created'}.`,
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

  // Get step info - ENHANCED
  const getStepInfo = () => {
    const steps = ['package', 'members', 'summary', 'verification', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    return {
      current: currentIndex + 1,
      total: steps.length,
      title: {
        package: 'Select Membership Package',
        members: `Member Details ${selectedPackage?.max_members > 1 ? `(${currentMemberIndex + 1} of ${memberForms.length})` : ''}`,
        summary: isExistingMember ? 'Transfer Summary & Dates' : 'Package Summary & Payment',
        verification: 'Staff Verification Required',
        success: `Members Successfully ${isExistingMember ? 'Transferred' : 'Created'}`
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
          nationalId: '',
          autoGenerateEmail: false
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
                Member Details {memberForms.length > 1 && `(${currentMemberIndex + 1} of ${memberForms.length})`}
              </h3>
              <p className="text-muted-foreground">Enter member information for {selectedPackage?.name}</p>
            </div>

            {/* Multi-member navigation */}
            {memberForms.length > 1 && (
              <div className="flex justify-center space-x-2 mb-6">
                {memberForms.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMemberIndex(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      index === currentMemberIndex
                        ? 'bg-primary text-primary-foreground'
                        : index < currentMemberIndex
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Existing member selection (if package allows multiple members) */}
            {selectedPackage?.max_members > 1 && !currentMember.isExisting && (
              <Card className="border-blue-500/20 bg-blue-500/10 gym-card-gradient">
                <CardHeader>
                  <CardTitle className="text-base text-blue-800">Add Existing Member (Optional)</CardTitle>
                  <p className="text-sm text-blue-600">Search and select an existing member instead of creating new</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by name, email, or ID..."
                        value={existingMemberSearch}
                        onChange={(e) => setExistingMemberSearch(e.target.value)}
                        className="pl-10 bg-background border-border"
                      />
                    </div>
                    {existingMemberSearch && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setExistingMemberSearch('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {existingMemberSearch && filteredExistingMembers.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredExistingMembers.slice(0, 5).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-white rounded border cursor-pointer hover:border-primary/50"
                          onClick={() => selectExistingMember(member)}
                        >
                          <div>
                            <div className="font-medium text-foreground">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email} • ID: {member.national_id}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Member information form */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">
                    {currentMember.isExisting ? 'Existing Member Selected' : 'Personal Information'}
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
                </div>
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

                {/* Enhanced Email Section with Auto-Generate Option */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                    {!currentMember.isExisting && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-email"
                          checked={currentMember.autoGenerateEmail || false}
                          onCheckedChange={toggleAutoGenerateEmail}
                        />
                        <Label htmlFor="auto-email" className="text-sm text-muted-foreground">
                          Auto-generate temp email
                        </Label>
                      </div>
                    )}
                  </div>
                  
                  <Input
                    id="email"
                    type="email"
                    value={currentMember.email}
                    onChange={(e) => updateMemberForm(currentMemberIndex, { email: e.target.value })}
                    placeholder={currentMember.autoGenerateEmail ? "Will auto-generate as [nationalId]@gmail.com" : "Enter email address"}
                    disabled={currentMember.isExisting || currentMember.autoGenerateEmail}
                    className="mt-1 bg-background border-border text-foreground"
                  />
                  
                  {currentMember.autoGenerateEmail && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <Mail className="h-4 w-4" />
                        <strong>Temporary Account Credentials:</strong>
                      </div>
                      <div className="text-sm text-blue-700 mt-1 space-y-1">
                        <p>Email: {currentMember.nationalId ? `${currentMember.nationalId}@gmail.com` : '[nationalId]@gmail.com'}</p>
                        <p>Password: {currentMember.nationalId || '[nationalId]'}</p>
                        <p className="text-xs">Member can change these after first login.</p>
                      </div>
                    </div>
                  )}
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
                  <Label htmlFor="address" className="text-foreground">Address</Label>
                  <Input
                    id="address"
                    value={currentMember.address}
                    onChange={(e) => updateMemberForm(currentMemberIndex, { address: e.target.value })}
                    placeholder="Enter address (optional)"
                    className="mt-1 bg-background border-border text-foreground"
                    disabled={currentMember.isExisting}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContact" className="text-foreground">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={currentMember.emergencyContact}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyContact: e.target.value })}
                      placeholder="Enter emergency contact name"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone" className="text-foreground">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={currentMember.emergencyPhone}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyPhone: e.target.value })}
                      placeholder="Enter emergency contact phone"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'summary':
        const calculatedPrice = calculatePrice();
        const isCustomPrice = parseFloat(customPrice || '0') !== calculatedPrice;
        const expiryDate = calculateExpiryDate();

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                {isExistingMember ? 'Transfer Summary & Dates' : 'Package Summary & Payment'}
              </h3>
              <p className="text-muted-foreground">
                {isExistingMember 
                  ? 'Set transfer details and existing membership dates' 
                  : 'Review your selection and choose payment method'
                }
              </p>
            </div>

            {/* Enhanced: Existing Member Toggle */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">Member Type</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="existing-member"
                      checked={isExistingMember}
                      onCheckedChange={(checked) => {
                        setIsExistingMember(checked);
                        setPaymentMethod(checked ? 'paid' : 'cash');
                        if (checked) {
                          setManualPrice(calculatedPrice.toString());
                        } else {
                          setCustomPrice(calculatedPrice.toString());
                        }
                      }}
                    />
                    <Label htmlFor="existing-member" className="text-foreground">
                      Add Existing Member
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">
                      {isExistingMember ? 'Existing Member Transfer' : 'New Member Registration'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {isExistingMember 
                      ? 'This member is transferring from another gym or has an existing membership. Set their last payment date and amount.'
                      : 'This is a new member joining the gym. Standard pricing and payment flow applies.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Package Summary */}
            <Card className="border-border gym-card-gradient">
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
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="text-foreground">{selectedPackage?.duration_months} months</span>
                  </div>

                  {isExistingMember ? (
                    // Enhanced: Existing Member Fields
                    <>
                      <Separator className="bg-border" />
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="lastPaidDate" className="text-foreground">Last Paid Date *</Label>
                          <Input
                            id="lastPaidDate"
                            type="date"
                            value={lastPaidDate}
                            onChange={(e) => setLastPaidDate(e.target.value)}
                            className="mt-1 bg-background border-border text-foreground"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="manualPrice" className="text-foreground">Amount Paid *</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="manualPrice"
                              type="number"
                              min="0"
                              step="0.01"
                              value={manualPrice}
                              onChange={(e) => setManualPrice(e.target.value)}
                              placeholder="Enter amount paid"
                              className="mt-1 bg-background border-border text-foreground"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setManualPrice(calculatedPrice.toString())}
                              className="mt-1"
                            >
                              Use Standard
                            </Button>
                          </div>
                        </div>

                        {lastPaidDate && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <Calendar className="h-4 w-4" />
                              <strong>Calculated Expiry Date:</strong>
                            </div>
                            <p className="text-green-700 font-medium">
                              {expiryDate ? new Date(expiryDate).toLocaleDateString() : 'Select last paid date'}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Original: New Member Fields
                    <>
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
                        <span className="text-foreground">${calculatedPrice}</span>
                      </div>
                      
                      <div>
                        <Label htmlFor="customPrice" className="text-foreground">Final Price *</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="customPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                            placeholder="Enter final price"
                            className="mt-1 bg-background border-border text-foreground"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetPriceToCalculated}
                            className="mt-1"
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  {isExistingMember ? 'Payment Status' : 'Payment Method'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isExistingMember ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Already Paid</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Member has already paid for this period. No additional payment required.
                    </p>
                  </div>
                ) : (
                  <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'card') => setPaymentMethod(value)}>
                    <div className="space-y-3">
                      <label className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-border hover:border-border/60'}`}>
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
                      
                      <label className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-border hover:border-border/60'}`}>
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
                )}
              </CardContent>
            </Card>

            {/* Final Summary */}
            <Card className="border-primary/20 bg-primary/10 gym-card-gradient">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">
                    {isExistingMember ? 'Amount Paid' : 'Total Amount'}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    ${isExistingMember ? manualPrice || '0' : customPrice || '0'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {memberForms.length} member{memberForms.length > 1 ? 's' : ''} • 
                  {isExistingMember 
                    ? ` Already paid • Expires ${expiryDate ? new Date(expiryDate).toLocaleDateString() : 'TBD'}`
                    : ` ${duration} month${duration > 1 ? 's' : ''} • ${paymentMethod === 'cash' ? 'Cash' : 'Card'} payment`
                  }
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
                        {isExistingMember ? (
                          <>
                            {parseFloat(manualPrice || '0') < 0 && (
                              <li>• Enter a valid amount paid</li>
                            )}
                            {!lastPaidDate && (
                              <li>• Select the last paid date</li>
                            )}
                          </>
                        ) : (
                          <>
                            {parseFloat(customPrice || '0') <= 0 && (
                              <li>• Enter a valid price amount</li>
                            )}
                            {!paymentMethod && (
                              <li>• Select a payment method</li>
                            )}
                          </>
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
              <p className="text-muted-foreground">
                Confirm member {isExistingMember ? 'transfer' : 'creation'} and payment processing
              </p>
            </div>

            {/* Transaction Summary */}
            <Card className="border-primary/20 bg-primary/10 gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-primary">
                  {isExistingMember ? 'Transfer Summary' : 'Transaction Summary'}
                </CardTitle>
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
                {isExistingMember ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Paid:</span>
                      <span className="font-medium text-foreground">
                        {lastPaidDate ? new Date(lastPaidDate).toLocaleDateString() : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium text-foreground">
                        {calculateExpiryDate() ? new Date(calculateExpiryDate()).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium text-foreground">${manualPrice || '0'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium text-foreground">{duration} month{duration > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <span className="font-medium text-foreground">{paymentMethod === 'cash' ? 'Cash' : 'Card'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium text-foreground">${customPrice || '0'}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Staff PIN Verification - ORIGINAL */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Staff Authorization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="staffSelect" className="text-foreground">Authorizing Staff Member</Label>
                  <Select value={verification.staffId} onValueChange={(value) => setVerification(prev => ({ ...prev, staffId: value }))}>
                    <SelectTrigger className="mt-1 bg-background border-border">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="pin" className="text-foreground">Staff PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={4}
                    value={verification.pin}
                    onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Enter 4-digit PIN"
                    className="mt-1 bg-background border-border text-foreground"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-2xl font-semibold text-foreground">
                {isExistingMember ? 'Members Successfully Transferred!' : 'Members Successfully Created!'}
              </h3>
              <p className="text-muted-foreground">
                {createdAccounts.length} member{createdAccounts.length > 1 ? 's have' : ' has'} been {isExistingMember ? 'transferred' : 'added'} to the system
              </p>
            </div>

            {/* Account Information */}
            {createdAccounts.map((account, index) => (
              <Card key={index} className="border-green-500/20 bg-green-500/10 gym-card-gradient">
                <CardHeader>
                  <CardTitle className="text-base text-green-800">{account.fullName}</CardTitle>
                  <p className="text-sm text-green-600">Account Details</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Member ID</p>
                      <p className="font-medium text-foreground">{account.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Starts</p>
                      <div className="font-medium text-foreground">
                        {account.start_date ? new Date(account.start_date).toLocaleDateString() : 'Today'}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <div className="font-medium text-foreground">
                        {account.expiry_date ? new Date(account.expiry_date).toLocaleDateString() : `${duration} month${duration > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced: Login Credentials for auto-generated emails */}
                  {account.isAutoGenerated && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <UserPlus className="h-4 w-4" />
                        <span className="font-medium">Login Credentials</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700">Email:</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-blue-100 px-2 py-1 rounded text-xs">{account.accountEmail}</code>
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(account.accountEmail)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700">Password:</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-blue-100 px-2 py-1 rounded text-xs">{account.accountPassword}</code>
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(account.accountPassword)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                        <h4 className="font-medium text-yellow-800 text-sm mb-1">Instructions for Member:</h4>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          <li>1. Login with the email and password above</li>
                          <li>2. Change password from National ID to secure password</li>
                          <li>3. Add their real email address if needed</li>
                          <li>4. Verify their email address</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="text-xs text-muted-foreground bg-accent/20 p-3 rounded border border-border">
              <Info className="h-4 w-4 inline mr-2" />
              {isExistingMember 
                ? 'Member accounts with auto-generated credentials can be updated by the member after first login.'
                : 'These are temporary login credentials based on the member\'s national ID. Members can update their email and password after first login.'
              }
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full">
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
            {isExistingMember ? 'Transfer Existing Member' : 'Add New Member'} - Step {stepInfo.current} of {stepInfo.total}
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
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons - ORIGINAL LOGIC */}
          {currentStep !== 'success' && (
            <div className="flex justify-between pt-6">
              <div>
                {showBackButton() && (
                  <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {showNextButton() && (
                  <Button 
                    onClick={handleNext} 
                    disabled={!canProceed()}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                
                {showSubmitButton() && (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!canProceed() || loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? 'Processing...' : (isExistingMember ? 'Transfer Member' : 'Create Member')}
                    {!loading && <UserCheck className="h-4 w-4" />}
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