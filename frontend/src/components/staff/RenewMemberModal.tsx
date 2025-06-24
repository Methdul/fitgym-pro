import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, User, CheckCircle, Package as PackageIcon, Shield } from 'lucide-react';
import { db, getAuthHeaders } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Member, Package as PackageType, PaymentMethod, BranchStaff } from '@/types';

interface RenewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  branchId: string;
  onRenewalComplete: () => void;
}

const RenewMemberModal = ({ isOpen, onClose, member, branchId, onRenewalComplete }: RenewMemberModalProps) => {
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [verification, setVerification] = useState({
    staffId: '',
    pin: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && branchId) {
      fetchActivePackages();
      fetchStaff();
    }
  }, [isOpen, branchId]);

  const fetchActivePackages = async () => {
    setLoadingPackages(true);
    try {
      // Fetch only active packages for this specific branch
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}/active`);
      const result = await response.json();
      
      if (result.status === 'success') {
        setPackages(result.data || []);
        console.log(`✅ Loaded ${result.data?.length || 0} active packages for renewal`);
      } else {
        throw new Error(result.error || 'Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching active packages:', error);
      toast({
        title: "Error",
        description: "Failed to load available packages for renewal",
        variant: "destructive",
      });
      setPackages([]);
    } finally {
      setLoadingPackages(false);
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

  const handlePackageSelect = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setDuration(pkg.duration_months.toString());
    setPrice(pkg.price.toString());
  };

  const calculateNewExpiry = () => {
    if (!member || !duration) return '';
    const currentExpiry = new Date(member.expiry_date);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + parseInt(duration));
    return newExpiry.toLocaleDateString();
  };

  const handleRenewal = async () => {
    if (!member || !selectedPackage) return;

    // Verify staff PIN first
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
      // Verify PIN
      const { isValid } = await db.staff.verifyPin(verification.staffId, verification.pin);
      
      if (!isValid) {
        toast({
          title: "Invalid PIN",
          description: "The entered PIN is incorrect",
          variant: "destructive"
        });
        return;
      }

      const currentExpiry = new Date(member.expiry_date);
      const newExpiry = new Date(currentExpiry);
      newExpiry.setMonth(newExpiry.getMonth() + parseInt(duration));

      console.log('🔄 Attempting member renewal update...');
      
      // Use simple member update with only basic fields (like member creation)
      const updateData = {
        expiry_date: newExpiry.toISOString().split('T')[0], // Date only, no time
        status: 'active',
        package_name: selectedPackage.name,
        package_type: selectedPackage.type,
        package_price: parseFloat(price),
        updated_at: new Date().toISOString()
      };

      console.log('📤 Sending renewal update data:', updateData);

      const updateResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updateData),
      });

      console.log('📥 Update response status:', updateResponse.status);

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Update failed:', errorText);
        
        // Try to parse error response
        let errorMessage = 'Failed to renew membership';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error (${updateResponse.status}): ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await updateResponse.json();
      console.log('✅ Renewal update successful:', result);

      // Optional: Log the action (don't fail if this doesn't work)
      try {
        const logData = {
          staff_id: verification.staffId,
          action_type: 'MEMBER_RENEWED',
          description: `Renewed membership for ${member.first_name} ${member.last_name} with ${selectedPackage.name} package until ${newExpiry.toLocaleDateString()}`,
          created_at: new Date().toISOString()
        };

        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/action-logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(logData),
        });
        
        console.log('📝 Action log created successfully');
      } catch (logError) {
        console.warn('⚠️ Failed to create action log (non-critical):', logError);
      }

      toast({
        title: "Renewal Successful! ✅",
        description: `${member.first_name} ${member.last_name}'s membership renewed until ${newExpiry.toLocaleDateString()}`,
      });

      onRenewalComplete();
      onClose();
    } catch (error) {
      console.error('❌ Error renewing membership:', error);
      toast({
        title: "Renewal Failed",
        description: error instanceof Error ? error.message : "Failed to renew membership. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedPackage(null);
    setDuration('');
    setPrice('');
    setPaymentMethod(undefined);
    setVerification({ staffId: '', pin: '' });
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const validateStep = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return selectedPackage !== null;
      case 2:
        return paymentMethod !== undefined;
      case 3:
        return verification.staffId !== '' && verification.pin !== '';
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      if (step === 1) {
        toast({
          title: "Package Required",
          description: "Please select a package to continue",
          variant: "destructive"
        });
      } else if (step === 2) {
        toast({
          title: "Payment Method Required",
          description: "Please select a payment method",
          variant: "destructive"
        });
      } else if (step === 3) {
        toast({
          title: "Verification Required",
          description: "Please select staff member and enter PIN",
          variant: "destructive"
        });
      }
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Renew Membership - {member.first_name} {member.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex space-x-2 mb-6">
          {[1, 2, 3, 4].map((stepNum) => (
            <div
              key={stepNum}
              className={`flex-1 h-2 rounded ${
                step >= stepNum ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Package Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Select Package
              </h3>
              
              {loadingPackages ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading available packages...</p>
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-8">
                  <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium mb-2">No Active Packages Available</h4>
                  <p className="text-muted-foreground">
                    There are no active packages available for renewal at this branch.
                    Please contact an administrator to add packages.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                      <CheckCircle className="h-4 w-4" />
                      Active Packages Only
                    </div>
                    <p className="text-sm text-blue-600">
                      Showing {packages.length} active package{packages.length !== 1 ? 's' : ''} available for renewal
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {packages.map((pkg) => (
                      <Card 
                        key={pkg.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedPackage?.id === pkg.id 
                            ? 'ring-2 ring-primary border-primary' 
                            : ''
                        }`}
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{pkg.name}</CardTitle>
                          <CardDescription className="text-2xl font-bold text-primary">
                            ${pkg.price}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {pkg.duration_months} month{pkg.duration_months > 1 ? 's' : ''}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="inline-block px-2 py-1 text-xs rounded-full bg-secondary capitalize">
                                {pkg.type}
                              </div>
                              <div className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                Up to {pkg.max_members} member{pkg.max_members > 1 ? 's' : ''}
                              </div>
                            </div>
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
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Selected</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleNext} 
                disabled={!selectedPackage || packages.length === 0}
              >
                Next: Payment Details
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Duration & Payment */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Duration & Payment
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (months)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod || ''} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
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

              <div className="bg-green-100 border border-green-300 rounded-lg p-6 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-700" />
                  <span className="font-semibold text-green-900">Renewal Summary</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-600 font-medium">Current Expiry</p>
                    <p className="font-semibold text-green-900">{new Date(member.expiry_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-green-600 font-medium">New Expiry</p>
                    <p className="font-semibold text-green-900">{calculateNewExpiry()}</p>
                  </div>
                  <div>
                    <p className="text-green-600 font-medium">Extension Period</p>
                    <p className="font-semibold text-green-900">{duration} month{parseInt(duration) > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-green-600 font-medium">Package</p>
                    <p className="font-semibold text-green-900">{selectedPackage?.name}</p>
                  </div>
                  <div>
                    <p className="text-green-600 font-medium">Amount</p>
                    <p className="font-semibold text-green-900">${price}</p>
                  </div>
                  <div>
                    <p className="text-green-600 font-medium">Payment Method</p>
                    <p className="font-semibold text-green-900 capitalize">{paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash Payment'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back: Package Selection
              </Button>
              <Button onClick={handleNext} disabled={!validateStep(2)}>
                Next: Staff Verification
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Staff Verification */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Staff Verification
              </h3>
              
              <Card className="bg-primary/5 border-primary/20 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Staff Verification Required</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Please verify your identity to complete the membership renewal
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-4">
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

              {selectedPackage && (
                <Card className="bg-green-50 border-green-200 mt-6">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2 text-green-800">Renewal Summary</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <p><strong>Member:</strong> {member.first_name} {member.last_name}</p>
                      <p><strong>Package:</strong> {selectedPackage.name}</p>
                      <p><strong>Duration:</strong> {duration} months</p>
                      <p><strong>Amount:</strong> ${price}</p>
                      <p><strong>New Expiry:</strong> {calculateNewExpiry()}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back: Payment Details
              </Button>
              <Button onClick={handleNext} disabled={!validateStep(3)}>
                Next: Confirm Renewal
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Final Confirmation */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Confirm Renewal
              </h3>
              
              <Card>
                <CardHeader>
                  <CardTitle>Final Confirmation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-100 border border-green-300 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-green-700" />
                      <span className="font-semibold text-green-900">Member & Package Details</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-600 font-medium">Member Name</p>
                        <p className="font-semibold text-green-900">{member.first_name} {member.last_name}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Email</p>
                        <p className="font-semibold text-green-900">{member.email}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Phone</p>
                        <p className="font-semibold text-green-900">{member.phone}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">National ID</p>
                        <p className="font-semibold text-green-900">{member.national_id}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">New Package</p>
                        <p className="font-semibold text-green-900">{selectedPackage?.name}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Package Type</p>
                        <p className="font-semibold text-green-900 capitalize">{selectedPackage?.type}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Amount</p>
                        <p className="font-semibold text-green-900">${price}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Duration</p>
                        <p className="font-semibold text-green-900">{duration} month{parseInt(duration) > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-700" />
                      <span className="font-semibold text-blue-900">Renewal Summary</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600 font-medium">Current Expiry</p>
                        <p className="font-semibold text-blue-900">{new Date(member.expiry_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-blue-600 font-medium">New Expiry</p>
                        <p className="font-semibold text-blue-900">{calculateNewExpiry()}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-blue-200 rounded text-center">
                      <span className="font-bold text-blue-900">✅ Status: ACTIVE after renewal</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-yellow-700" />
                      <span className="font-semibold text-yellow-900">Verified Staff Member</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Renewal will be processed by: {staff.find(s => s.id === verification.staffId)?.first_name} {staff.find(s => s.id === verification.staffId)?.last_name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back: Staff Verification
              </Button>
              <Button onClick={handleRenewal} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? 'Processing Renewal...' : 'Confirm Renewal'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RenewMemberModal;