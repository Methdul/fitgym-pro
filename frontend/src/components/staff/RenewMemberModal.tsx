
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, User } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Member, Package as PackageType, PaymentMethod } from '@/types';

interface RenewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onRenewalComplete: () => void;
}

const RenewMemberModal = ({ isOpen, onClose, member, onRenewalComplete }: RenewMemberModalProps) => {
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await db.packages.getAll();
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages",
        variant: "destructive",
      });
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
        description: "Membership renewed successfully",
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
              <h3 className="text-lg font-semibold mb-4">Select Package</h3>
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
                      <p className="text-sm text-muted-foreground mb-2">
                        {pkg.duration_months} month{pkg.duration_months > 1 ? 's' : ''}
                      </p>
                      <div className="inline-block px-2 py-1 text-xs rounded-full bg-secondary">
                        {pkg.type}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedPackage}
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
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Renewal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Current Expiry:</span>
                  <span>{new Date(member.expiry_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>New Expiry:</span>
                  <span className="text-green-600 font-semibold">{calculateNewExpiry()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extension:</span>
                  <span>{duration} month{parseInt(duration) > 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>

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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Member:</p>
                    <p>{member.first_name} {member.last_name}</p>
                    <p className="text-muted-foreground">{member.email}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Package:</p>
                    <p>{selectedPackage?.name}</p>
                    <p className="text-muted-foreground">${price} - {duration} months</p>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="font-semibold text-green-800">New Status: Active</p>
                  <p className="text-sm text-green-600">
                    Expires: {calculateNewExpiry()}
                  </p>
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
