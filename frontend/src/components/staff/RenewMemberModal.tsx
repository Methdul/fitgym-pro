import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, User, CheckCircle, Package as PackageIcon } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Member, Package as PackageType, PaymentMethod } from '@/types';

interface RenewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  branchId: string; // Added branchId prop
  onRenewalComplete: () => void;
}

const RenewMemberModal = ({ isOpen, onClose, member, branchId, onRenewalComplete }: RenewMemberModalProps) => {
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && branchId) {
      fetchActivePackages();
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

    setLoading(true);
    try {
      const currentExpiry = new Date(member.expiry_date);
      const newExpiry = new Date(currentExpiry);
      newExpiry.setMonth(newExpiry.getMonth() + parseInt(duration));

      const renewalData = {
        member_id: member.id,
        package_id: selectedPackage.id,
        payment_method: paymentMethod,
        amount_paid: parseFloat(price),
        previous_expiry: member.expiry_date,
        new_expiry: newExpiry.toISOString(),
        renewed_by_staff_id: 'staff-placeholder' // This would come from PIN verification
      };

      const { error: renewalError } = await db.renewals.create(renewalData);
      if (renewalError) throw renewalError;

      // Update member
      const { error: updateError } = await db.members.update(member.id, {
        expiry_date: newExpiry.toISOString(),
        status: 'active',
        package_name: selectedPackage.name,
        package_price: parseFloat(price)
      });
      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Membership renewed successfully until ${newExpiry.toLocaleDateString()}`,
      });

      onRenewalComplete();
      onClose();
    } catch (error) {
      console.error('Error renewing membership:', error);
      toast({
        title: "Error",
        description: "Failed to renew membership",
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
    setPaymentMethod('card');
  };

  const handleClose = () => {
    resetModal();
    onClose();
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
                onClick={() => setStep(2)} 
                disabled={!selectedPackage || packages.length === 0}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
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

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
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

            <div className="bg-green-100 border border-green-300 rounded-lg p-6">
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Confirm Renewal</CardTitle>
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
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleRenewal} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Renewal'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RenewMemberModal;