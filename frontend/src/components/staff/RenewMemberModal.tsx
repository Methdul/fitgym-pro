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
      // FIXED: Use the main packages endpoint which includes pricing for renewals
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setPackages(result.data || []);
        console.log(`✅ Loaded ${result.data?.length || 0} packages for renewal`);
      } else {
        throw new Error(result.error || 'Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
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

  // FIXED: Added null safety and better error handling
  const handlePackageSelect = (pkg: PackageType) => {
    console.log('📦 Package selected:', pkg); // Debug logging
    
    setSelectedPackage(pkg);
    
    // FIXED: Safe handling of duration with fallback
    const safeDuration = pkg.duration_months || 1;
    setDuration(safeDuration.toString());
    
    // FIXED: Safe handling of price with fallback and validation
    const safePrice = pkg.price || 0;
    if (safePrice === 0) {
      console.warn('⚠️ Package price is missing or zero:', pkg);
      toast({
        title: "Package Price Missing",
        description: "This package doesn't have pricing information. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }
    
    setPrice(safePrice.toString());
    
    console.log(`✅ Package selected: ${pkg.name} - $${safePrice} for ${safeDuration} months`);
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

    // FIXED: Validate price before processing
    const priceValue = parseFloat(price);
    if (!priceValue || priceValue <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price for the renewal",
        variant: "destructive",
      });
      return;
    }

    // FIXED: Validate duration
    const durationValue = parseInt(duration);
    if (!durationValue || durationValue <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Please enter a valid duration for the renewal",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // FIXED: Use the new secure renewal processing endpoint
      const renewalData = {
        memberId: member.id,
        packageId: selectedPackage.id,
        paymentMethod: paymentMethod || 'cash',
        amountPaid: priceValue,
        durationMonths: durationValue,
        staffId: verification.staffId,
        staffPin: verification.pin
      };

      console.log('🔄 Processing renewal with data:', {
        ...renewalData,
        staffPin: '[HIDDEN]' // Don't log PIN
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/renewals/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(renewalData)
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error('Too many attempts. Please wait before trying again.');
        }
        if (response.status === 401) {
          throw new Error('Invalid PIN. Please check and try again.');
        }
        throw new Error(result.error || result.message || 'Failed to process renewal');
      }

      toast({
        title: "Renewal Successful! 🎉",
        description: `${member.first_name} ${member.last_name}'s membership has been renewed successfully.`,
      });

      // Reset form and close modal
      setStep(1);
      setSelectedPackage(null);
      setDuration('');
      setPrice('');
      setPaymentMethod(undefined);
      setVerification({ staffId: '', pin: '' });
      
      onRenewalComplete();
      onClose();

    } catch (error) {
      console.error('Error processing renewal:', error);
      toast({
        title: "Renewal Failed",
        description: error instanceof Error ? error.message : "Failed to process renewal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedPackage(null);
    setDuration('');
    setPrice('');
    setPaymentMethod(undefined);
    setVerification({ staffId: '', pin: '' });
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Renew Membership - {member.first_name} {member.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Package Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Select Package
              </h3>
              
              {/* Current Member Info */}
              <Card className="mb-6 bg-yellow-50 border-yellow-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-yellow-800">Current Membership</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-yellow-600 font-medium">Package</p>
                      <p className="font-semibold text-yellow-900">{member.package_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-yellow-600 font-medium">Type</p>
                      <p className="font-semibold text-yellow-900 capitalize">{member.package_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-yellow-600 font-medium">Status</p>
                      <p className="font-semibold text-yellow-900 capitalize">{member.status}</p>
                    </div>
                    <div>
                      <p className="text-yellow-600 font-medium">Expires</p>
                      <p className="font-semibold text-yellow-900">
                        {new Date(member.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingPackages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading packages...</span>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      {packages.length} package{packages.length !== 1 ? 's' : ''} available for renewal
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
                            {/* FIXED: Safe price display with fallback */}
                            ${pkg.price || 'Contact Admin'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {pkg.duration_months || 1} month{(pkg.duration_months || 1) > 1 ? 's' : ''}
                            </p>
                            {/* FIXED: Safe max_members display */}
                            <div className="flex items-center gap-2">
                              <div className="inline-block px-2 py-1 text-xs rounded-full bg-secondary capitalize">
                                {pkg.type}
                              </div>
                              {pkg.max_members && (
                                <div className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                  Up to {pkg.max_members} member{pkg.max_members > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                            {/* FIXED: Safe features display */}
                            {pkg.features && pkg.features.length > 0 && (
                              <div className="space-y-1">
                                {pkg.features.slice(0, 3).map((feature, index) => (
                                  <p key={index} className="text-xs text-muted-foreground">
                                    • {feature}
                                  </p>
                                ))}
                                {pkg.features.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    • +{pkg.features.length - 3} more features
                                  </p>
                                )}
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedPackage}
              >
                Next: Duration & Payment
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
                    max="24"
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
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Expiry Preview */}
              {duration && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>New expiry date:</strong> {calculateNewExpiry()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!duration || !price || !paymentMethod}
              >
                Next: Verification
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staff">Authorizing Staff</Label>
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
                  <Label htmlFor="pin">Staff PIN</Label>
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

              {/* Renewal Summary */}
              <Card className="mt-6 bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Renewal Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                onClick={handleRenewal} 
                disabled={!verification.staffId || !verification.pin || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Complete Renewal'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RenewMemberModal;