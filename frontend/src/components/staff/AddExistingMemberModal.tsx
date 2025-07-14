import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, 
  Package as PackageIcon, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Info,
  User,
  Users,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { db, getAuthHeaders } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Package as PackageType, BranchStaff } from '@/types';



interface AddExistingMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
}

type Step = 'package' | 'members' | 'payment' | 'verification' | 'success';

interface MemberFormData {
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  previousMembershipDate: string;
}

// Helper function to format package pricing display - COPIED FROM AddNewMemberModal
const formatPackagePrice = (pkg: PackageType): string => {
  const durationType = pkg.duration_type || 'months';
  const durationValue = pkg.duration_value || pkg.duration_months || 1;
  
  let unit = '';
  if (durationType === 'days') {
    unit = durationValue === 1 ? 'day' : 'days';
  } else if (durationType === 'weeks') {
    unit = durationValue === 1 ? 'week' : 'weeks';
  } else {
    unit = durationValue === 1 ? 'month' : 'months';
  }
  
  return `$${pkg.price}/${durationValue === 1 ? unit : `${durationValue} ${unit}`}`;
};

export const AddExistingMemberModal = ({ 
  open, 
  onOpenChange, 
  branchId, 
  onMemberAdded 
}: AddExistingMemberModalProps) => {


  // State management
  const [currentStep, setCurrentStep] = useState<Step>('package');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Step 1: Package selection  
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);

  // Step 2: Member forms (multiple based on package)
  const [memberForms, setMemberForms] = useState<MemberFormData[]>([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);

  // Step 3: Payment details
  const [duration, setDuration] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Step 4: Staff verification
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [verification, setVerification] = useState({ staffId: '', pin: '' });

  // Step 5: Success
  const [createdMembers, setCreatedMembers] = useState<any[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);

  // Initialize data
  useEffect(() => {
    if (open) {
      fetchPackages();
      fetchStaff();
    }
  }, [open, branchId]);

  // Initialize member forms when package is selected
  useEffect(() => {
    if (selectedPackage) {
      const emptyMemberForm: MemberFormData = {
        firstName: '',
        lastName: '',
        nationalId: '',
        phone: '',
        email: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        previousMembershipDate: ''
      };
      
      // Create forms based on package max_members
      const forms = Array(selectedPackage.max_members || 1).fill(null).map(() => ({ ...emptyMemberForm }));
      setMemberForms(forms);
      setCurrentMemberIndex(0);
    }
  }, [selectedPackage]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await db.packages.getByBranch(branchId);
      if (error) throw error;
      setPackages(data || []);
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
      const { data, error } = await db.staff.getByBranch(branchId);
      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  // Update member form data
  const updateMemberForm = (index: number, updates: Partial<MemberFormData>) => {
    setMemberForms(prev => prev.map((form, i) => 
      i === index ? { ...form, ...updates } : form
    ));
  };

  // Validate current member form
  const validateCurrentMember = () => {
    if (!memberForms[currentMemberIndex]) return false;
    const member = memberForms[currentMemberIndex];
    return member.firstName && member.lastName && member.nationalId && member.phone;
  };

  // Calculate pricing
  const calculatePrice = () => {
    if (!selectedPackage) return 0;
    // Package price is already the total price for the package duration
    return selectedPackage.price;
  };

  const getTotalPrice = () => {
    const calculated = calculatePrice();
    const custom = parseFloat(customPrice || '0');
    return custom > 0 ? custom : calculated;
  };

  // Calculate expiry date correctly (from start date + duration)
  const calculateExpiryDate = () => {
    if (!selectedPackage) return 'Select package first';
    
    const start = new Date(startDate);
    const expiry = new Date(start);
    
    // Use package duration settings - same logic as AddNewMemberModal
    const durationValue = selectedPackage.duration_value || selectedPackage.duration_months || 1;
    const durationType = selectedPackage.duration_type || 'months';
    
    if (durationType === 'days') {
      expiry.setDate(expiry.getDate() + durationValue);
    } else if (durationType === 'weeks') {
      expiry.setDate(expiry.getDate() + (durationValue * 7));
    } else {
      // months
      expiry.setMonth(expiry.getMonth() + durationValue);
    }
    
    return expiry.toLocaleDateString();
  };

  // Navigation functions
  const handleNext = () => {
    if (currentStep === 'members') {
      // If on members step, check if we need to go to next member or next step
      if (currentMemberIndex < memberForms.length - 1) {
        setCurrentMemberIndex(currentMemberIndex + 1);
        return;
      }
    }
    
    const stepOrder: Step[] = ['package', 'members', 'payment', 'verification', 'success'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStep === 'members') {
      // If on members step, check if we need to go to previous member or previous step
      if (currentMemberIndex > 0) {
        setCurrentMemberIndex(currentMemberIndex - 1);
        return;
      }
    }
    
    const stepOrder: Step[] = ['package', 'members', 'payment', 'verification', 'success'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  // Submit member creation
  const handleSubmit = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    try {
      const createdMembersData = [];

      // Create each member
      for (let i = 0; i < memberForms.length; i++) {
        const member = memberForms[i];
        
        // Skip if member form is empty (for optional additional members)
        if (!member.firstName || !member.lastName || !member.nationalId) {
          continue;
        }

        // Calculate expiry date from start date + package duration - same logic as AddNewMemberModal
        const startDateObj = new Date(startDate);
        const expiryDateObj = new Date(startDateObj);

        // Use package duration settings
        const durationValue = selectedPackage.duration_value || selectedPackage.duration_months || 1;
        const durationType = selectedPackage.duration_type || 'months';

        if (durationType === 'days') {
          expiryDateObj.setDate(expiryDateObj.getDate() + durationValue);
        } else if (durationType === 'weeks') {
          expiryDateObj.setDate(expiryDateObj.getDate() + (durationValue * 7));
        } else {
          expiryDateObj.setMonth(expiryDateObj.getMonth() + durationValue);
        }

        const memberData = {
          // Personal information
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email || `${member.nationalId}@gmail.com`, // Generate email if not provided
          phone: member.phone,
          nationalId: member.nationalId,
          address: member.address,
          emergencyContact: member.emergencyContact,
          emergencyPhone: member.emergencyPhone,
          
          // Branch and package information
          branchId: branchId,
          packageId: selectedPackage.id,
          
          // Membership dates (calculated properly)
          startDate: startDate,
          expiryDate: expiryDateObj.toISOString().split('T')[0], // YYYY-MM-DD format
          
          // Payment information (only charge full price for first member)
          amountPaid: i === 0 ? getTotalPrice() : 0, // Only first member pays, others are included
          paymentMethod: paymentMethod,
          // Send the actual package duration info to backend
          durationMonths: selectedPackage.duration_type === 'months' ? (selectedPackage.duration_value || selectedPackage.duration_months || 1) : 
               selectedPackage.duration_type === 'weeks' ? Math.ceil((selectedPackage.duration_value || 1) * 7 / 30) :
               Math.ceil((selectedPackage.duration_value || 1) / 30), // convert days to approximate months for backend
          
          // Staff verification
          staffId: verification.staffId,
          staffPin: verification.pin,
          
          // Flag for existing member (creates account with simple credentials)
          isExistingMember: true,
          
          // Additional context
          previousMembershipDate: member.previousMembershipDate
        };

        console.log(`Creating existing member ${i + 1}:`, memberData);

        console.log('🔍 DEBUG EXISTING MEMBER REQUEST:', {
          url: `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members`,
          headers: getAuthHeaders(),
          memberData: memberData
        });

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
          
          // Handle specific error cases
          if (errorData.details && Array.isArray(errorData.details)) {
            const errorMessages = errorData.details.map((detail: any) => detail.msg || detail.message).join(', ');
            throw new Error(`Validation failed for ${member.firstName} ${member.lastName}: ${errorMessages}`);
          }
          
          throw new Error(`Failed to create ${member.firstName} ${member.lastName}: ${errorData.message || errorData.error}`);
        }

        const result = await response.json();
        
        // Format response for display with credentials
        const memberWithCredentials = {
          member: result.data,
          account: {
            email: member.email || `${member.nationalId}@gmail.com`,
            temporaryPassword: member.nationalId, // National ID as initial password
          },
          fullName: `${member.firstName} ${member.lastName}`
        };
        
        createdMembersData.push(memberWithCredentials);
      }
      
      setCreatedMembers(createdMembersData);
      setCurrentStep('success');

      toast({
        title: "Success! 🎉",
        description: `${createdMembersData.length} member${createdMembersData.length > 1 ? 's have' : ' has'} been successfully added to the system.`,
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

  // Reset form
  const resetForm = () => {
    setCurrentStep('package');
    setSelectedPackage(null);
    setMemberForms([]);
    setCurrentMemberIndex(0);
    setDuration(1);
    setCustomPrice('');
    setPaymentMethod('cash');
    setStartDate(new Date().toISOString().split('T')[0]);
    setVerification({ staffId: '', pin: '' });
    setCreatedMembers([]);
    setShowCredentials(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  // Validation functions
  const canProceed = () => {
    switch (currentStep) {
      case 'package': 
        return selectedPackage !== null;
      case 'members': 
        return validateCurrentMember();
      case 'payment': 
        return getTotalPrice() > 0 && startDate;
      case 'verification': 
        return verification.staffId && verification.pin;
      default: 
        return false;
    }
  };

  // Get step info
  const getStepInfo = () => {
    const steps = ['package', 'members', 'payment', 'verification', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    return {
      current: currentIndex + 1,
      total: steps.length,
      title: {
        package: 'Select Membership Package',
        members: `Member Information ${selectedPackage?.max_members > 1 ? `(${currentMemberIndex + 1} of ${memberForms.length})` : ''}`,
        payment: 'Payment & Duration',
        verification: 'Staff Verification Required',
        success: 'Members Successfully Added'
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
              <h3 className="text-lg font-semibold text-foreground">Choose Membership Package</h3>
              <p className="text-muted-foreground">Select a package for your legacy members</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPackage?.id === pkg.id
                      ? 'ring-2 ring-primary border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
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
                        <span className="font-semibold">{formatPackagePrice(pkg)}</span>
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

            {selectedPackage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Info className="h-4 w-4 inline mr-2 text-blue-600" />
                <span className="text-sm text-blue-700">
                  You selected {selectedPackage.name} package. 
                  {selectedPackage.max_members > 1 ? 
                    ` Next, you'll add information for up to ${selectedPackage.max_members} members.` :
                    ' Next, you\'ll add the member information.'
                  }
                </span>
              </div>
            )}
          </div>
        );

      case 'members':
        if (!memberForms.length) {
          return <div className="text-center text-muted-foreground">Loading member forms...</div>;
        }

        const currentMember = memberForms[currentMemberIndex] || {
          firstName: '',
          lastName: '',
          nationalId: '',
          phone: '',
          email: '',
          address: '',
          emergencyContact: '',
          emergencyPhone: '',
          previousMembershipDate: ''
        };

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {selectedPackage?.max_members === 1 ? (
                <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              ) : (
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              )}
              <h3 className="text-lg font-semibold text-foreground">
                {selectedPackage?.max_members === 1 ? 'Member Information' : `Member ${currentMemberIndex + 1} Information`}
              </h3>
              <p className="text-muted-foreground">
                {selectedPackage?.max_members === 1 ? 
                  'Enter the legacy member details' :
                  `Enter details for member ${currentMemberIndex + 1} of ${selectedPackage?.max_members}`
                }
              </p>
            </div>

            {/* Member form */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4" />
                  Personal Information
                  {selectedPackage?.max_members > 1 && (
                    <Badge variant="outline">
                      {currentMemberIndex + 1} of {selectedPackage.max_members}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={currentMember.firstName}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { firstName: e.target.value })}
                      placeholder="Enter first name"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={currentMember.lastName}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { lastName: e.target.value })}
                      placeholder="Enter last name"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nationalId">National ID *</Label>
                    <Input
                      id="nationalId"
                      value={currentMember.nationalId}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { nationalId: e.target.value })}
                      placeholder="Enter national ID"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={currentMember.phone}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentMember.email}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { email: e.target.value })}
                      placeholder="Enter email or leave blank for auto-generated"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      If left blank, will generate: {currentMember.nationalId}@gmail.com
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="previousMembershipDate">Last Membership Date</Label>
                    <Input
                      id="previousMembershipDate"
                      type="date"
                      value={currentMember.previousMembershipDate}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { previousMembershipDate: e.target.value })}
                      className="mt-1 bg-background border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      When were they last a member? (optional)
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={currentMember.address}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { address: e.target.value })}
                      placeholder="Enter address"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={currentMember.emergencyContact}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyContact: e.target.value })}
                      placeholder="Emergency contact name"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={currentMember.emergencyPhone}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyPhone: e.target.value })}
                      placeholder="Emergency contact phone"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation for multiple members */}
            {selectedPackage?.max_members > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentMemberIndex(Math.max(0, currentMemberIndex - 1))}
                  disabled={currentMemberIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous Member
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Member {currentMemberIndex + 1} of {selectedPackage.max_members}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentMemberIndex(Math.min(memberForms.length - 1, currentMemberIndex + 1))}
                  disabled={currentMemberIndex === memberForms.length - 1}
                >
                  Next Member
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Info className="h-4 w-4 inline mr-2 text-blue-600" />
              <span className="text-sm text-blue-700">
                This form is for adding people who were previously gym members (before the digital system) 
                or returning members who need to be added to the database.
              </span>
            </div>
          </div>
        );

      case 'payment':
        const calculatedPrice = calculatePrice();
        const isCustomPrice = parseFloat(customPrice || '0') !== calculatedPrice;

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Membership Details & Payment</h3>
              <p className="text-muted-foreground">Configure the new membership</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="startDate">Membership Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Package Duration</Label>
                <div className="mt-1 p-3 bg-muted border border-border rounded-lg">
                  <span className="text-foreground font-medium">
                    {selectedPackage?.duration_value || selectedPackage?.duration_months || 1} {
                      selectedPackage?.duration_type === 'days' ? 'day' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                      selectedPackage?.duration_type === 'weeks' ? 'week' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                      'month' + ((selectedPackage?.duration_value || selectedPackage?.duration_months || 1) > 1 ? 's' : '')
                    }
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Duration is set by the selected package</p>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(value: 'cash' | 'card') => setPaymentMethod(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Package Price ({selectedPackage?.duration_value || selectedPackage?.duration_months || 1} {
                  selectedPackage?.duration_type === 'days' ? 'day' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                  selectedPackage?.duration_type === 'weeks' ? 'week' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                  'month' + ((selectedPackage?.duration_value || selectedPackage?.duration_months || 1) > 1 ? 's' : '')
                })</span>
                <span>{selectedPackage ? formatPackagePrice(selectedPackage) : '$0'}</span>
              </div>

              <div>
                <Label htmlFor="customPrice">Custom Price (optional)</Label>
                <Input
                  id="customPrice"
                  type="number"
                  step="0.01"
                  placeholder={`Default: $${calculatedPrice.toFixed(2)}`}
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between font-semibold">
                <span>Total Amount</span>
                <span className="text-lg text-primary">${getTotalPrice().toFixed(2)}</span>
              </div>

              {isCustomPrice && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  <Info className="h-3 w-3 inline mr-1" />
                  Using custom price instead of standard package pricing
                </div>
              )}
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-800">Membership Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-600">Members:</p>
                    <p className="font-semibold text-green-900">
                      {memberForms.filter(form => form.firstName).length} member{memberForms.filter(form => form.firstName).length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-600">Package:</p>
                    <p className="font-semibold text-green-900">{selectedPackage?.name}</p>
                  </div>
                  <div>
                    <p className="text-green-600">Start Date:</p>
                    <p className="font-semibold text-green-900">{new Date(startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-green-600">Expiry Date:</p>
                    <p className="font-semibold text-green-900">{calculateExpiryDate()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Staff Verification Required</h3>
              <p className="text-muted-foreground">Verify your identity to add the members</p>
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
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {staffMember.first_name} {staffMember.last_name} 
                          <Badge variant="outline" className="ml-2 text-xs">
                            {staffMember.role}
                          </Badge>
                        </div>
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
                  placeholder="Enter your 4-digit PIN"
                  value={verification.pin}
                  onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value }))}
                  maxLength={4}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Member Creation Summary</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Members: {memberForms.filter(form => form.firstName).length} member{memberForms.filter(form => form.firstName).length > 1 ? 's' : ''}</p>
                <p>• Package: {selectedPackage?.name} ({duration} month{duration > 1 ? 's' : ''})</p>
                <p>• Amount: ${getTotalPrice().toFixed(2)} ({paymentMethod})</p>
                <p>• Membership: {new Date(startDate).toLocaleDateString()} - {calculateExpiryDate()}</p>
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold text-green-700">Members Successfully Added!</h3>
              <p className="text-muted-foreground">
                {createdMembers.length} member{createdMembers.length > 1 ? 's have' : ' has'} been added to the system
              </p>
            </div>

            {/* Member Details */}
            <div className="space-y-4">
              {createdMembers.map((memberData, index) => (
                <Card key={index} className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center justify-between">
                      {memberData.fullName}
                      <Badge variant="outline" className="text-green-700 border-green-400">
                        Member {index + 1}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-600">National ID:</p>
                        <p className="font-semibold text-green-900">{memberData.member.national_id}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Phone:</p>
                        <p className="font-semibold text-green-900">{memberData.member.phone}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Start Date:</p>
                        <p className="font-semibold text-green-900">{new Date(memberData.member.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Expiry Date:</p>
                        <p className="font-semibold text-green-900">{new Date(memberData.member.expiry_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Login Credentials */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-blue-800">Login Credentials</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showCredentials ? ' Hide' : ' Show'}
                </Button>
              </CardHeader>
              <CardContent>
                {showCredentials ? (
                  <div className="space-y-4">
                    {createdMembers.map((memberData, index) => (
                      <div key={index} className="p-3 bg-white rounded border">
                        <h4 className="font-semibold text-blue-900 mb-2">{memberData.fullName}</h4>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <p className="font-mono text-sm">{memberData.account.email}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(memberData.account.email)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Temporary Password</p>
                              <p className="font-mono text-sm">{memberData.account.temporaryPassword}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(memberData.account.temporaryPassword)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-blue-700 text-sm">Click the eye icon to view login credentials for all members</p>
                )}
                
                <div className="mt-4 text-xs text-blue-600 bg-blue-100 p-3 rounded">
                  <Info className="h-3 w-3 inline mr-1" />
                  Provide these credentials to the members. They can update their email and password after first login.
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button onClick={() => onOpenChange(false)} className="min-w-32">
                Close
              </Button>
            </div>
          </div>
        );

      default:
        return null;
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
            Add Legacy Members - Step {stepInfo.current} of {stepInfo.total}
          </DialogTitle>
          <p className="text-muted-foreground">{stepInfo.title}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
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
                    {currentStep === 'members' && currentMemberIndex < memberForms.length - 1 ? 
                      'Next Member' : 
                      currentStep === 'payment' ? 'Review & Verify' : 'Next'
                    }
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
                        Add Members
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