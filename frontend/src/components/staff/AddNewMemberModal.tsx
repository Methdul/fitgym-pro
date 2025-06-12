
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, CreditCard, Calendar, Shield } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Package, BranchStaff } from '@/types';

interface AddNewMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
}

type Step = 'personal' | 'package' | 'payment' | 'account' | 'verification';

export const AddNewMemberModal = ({ open, onOpenChange, branchId, onMemberAdded }: AddNewMemberModalProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [packages, setPackages] = useState<Package[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

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
    }
  }, [open, branchId]);

  useEffect(() => {
    if (selectedPackage) {
      setPaymentInfo(prev => ({
        ...prev,
        duration: selectedPackage.duration_months,
        price: selectedPackage.price
      }));
    }
  }, [selectedPackage]);

  const fetchPackages = async () => {
    try {
      const { data } = await db.packages.getAll();
      if (data) setPackages(data);
    } catch (error) {
      console.error('Error fetching packages:', error);
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

  const validatePersonalInfo = () => {
    return personalInfo.firstName && personalInfo.lastName && personalInfo.email && 
           personalInfo.phone && personalInfo.address && personalInfo.emergencyContact && 
           personalInfo.emergencyPhone;
  };

  const handleNext = () => {
    if (currentStep === 'personal' && !validatePersonalInfo()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (currentStep === 'package' && !selectedPackage) {
      toast({
        title: "Package Required",
        description: "Please select a membership package",
        variant: "destructive"
      });
      return;
    }

    if (currentStep === 'payment' && !paymentInfo.paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    const steps: Step[] = ['personal', 'package', 'payment', 'account', 'verification'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['personal', 'package', 'payment', 'account', 'verification'];
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

      // Create member
      const memberData = {
        branch_id: branchId,
        first_name: personalInfo.firstName,
        last_name: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        national_id: Math.random().toString().substring(2, 12), // Generate random national ID for demo
        status: 'active',
        package_type: selectedPackage!.type,
        package_name: selectedPackage!.name,
        package_price: paymentInfo.price,
        start_date: startDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        is_verified: accountOptions.createAccount
      };

      const { error } = await db.members.create(memberData);
      if (error) throw error;

      // Log the action
      await db.actionLogs.create({
        staff_id: verification.staffId,
        action_type: 'MEMBER_ADDED',
        description: `Added new member: ${personalInfo.firstName} ${personalInfo.lastName} with ${selectedPackage!.name} package`,
        created_at: new Date().toISOString()
      });

      toast({
        title: "Member Added",
        description: `${personalInfo.firstName} ${personalInfo.lastName} has been successfully added`
      });

      // Reset form
      setCurrentStep('personal');
      setPersonalInfo({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: ''
      });
      setSelectedPackage(null);
      setPaymentInfo({ duration: 1, price: 0, paymentMethod: '' });
      setAccountOptions({ createAccount: true });
      setVerification({ staffId: '', pin: '' });

      onOpenChange(false);
      onMemberAdded();
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
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
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
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
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
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
                  value={personalInfo.address}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact *</Label>
                <Input
                  id="emergencyContact"
                  value={personalInfo.emergencyContact}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Emergency Phone *</Label>
                <Input
                  id="emergencyPhone"
                  value={personalInfo.emergencyPhone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  placeholder="+1 (555) 987-6543"
                />
              </div>
            </div>
          </div>
        );

      case 'package':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Badge variant={pkg.type === 'couple' ? 'secondary' : 'default'}>
                        {pkg.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-primary">${pkg.price}</p>
                      <p className="text-sm text-muted-foreground">{pkg.duration_months} month(s)</p>
                      <div className="space-y-1">
                        {pkg.features.map((feature, index) => (
                          <p key={index} className="text-xs text-muted-foreground">• {feature}</p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
              <Label htmlFor="createAccount">Create login account for member</Label>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Account Options</h4>
                <div className="space-y-2 text-sm">
                  {accountOptions.createAccount ? (
                    <>
                      <p className="text-green-600">✓ Member will receive email verification</p>
                      <p className="text-green-600">✓ Can access member dashboard</p>
                      <p className="text-green-600">✓ Can manage their profile online</p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">• Database record only</p>
                      <p className="text-muted-foreground">• No online access</p>
                      <p className="text-muted-foreground">• Staff can create account later</p>
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
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'personal': return 'Personal Information';
      case 'package': return 'Package Selection';
      case 'payment': return 'Duration & Payment';
      case 'account': return 'Account Options';
      case 'verification': return 'Staff Verification';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member - Step {['personal', 'package', 'payment', 'account', 'verification'].indexOf(currentStep) + 1} of 5</DialogTitle>
          <p className="text-muted-foreground">{getStepTitle()}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="flex space-x-2">
            {['personal', 'package', 'payment', 'account', 'verification'].map((step, index) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded ${
                  ['personal', 'package', 'payment', 'account', 'verification'].indexOf(currentStep) >= index
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
              disabled={currentStep === 'personal'}
              className="flex-1"
            >
              Back
            </Button>
            {currentStep === 'verification' ? (
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'Creating Member...' : 'Create Member'}
              </Button>
            ) : (
              <Button onClick={handleNext} className="flex-1">
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
