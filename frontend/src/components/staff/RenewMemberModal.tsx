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
import { 
  Calendar, CreditCard, Shield, Package as PackageIcon, CheckCircle, 
  RefreshCw, User, Clock, AlertCircle, Check, Users, AlertTriangle, Search, X,
  Info, DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/supabase';
import type { Member, Package, BranchStaff } from '@/types';

interface RenewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  branchId: string;
  onRenewalComplete: () => void;
}

const RenewMemberModal = ({ isOpen, onClose, member, branchId, onRenewalComplete }: RenewMemberModalProps) => {
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<Package[]>([]);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [verification, setVerification] = useState({ staffId: '', pin: '' });
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedAdditionalMembers, setSelectedAdditionalMembers] = useState<Member[]>([]);
  const [existingMemberSearch, setExistingMemberSearch] = useState('');
  const [searchingMembers, setSearchingMembers] = useState(false);
  const { toast } = useToast();

  // Helper functions from AddNewMemberModal
  const calculatePrice = () => {
    if (!selectedPackage) return 0;
    // Package price is the TOTAL price for the entire duration
    return selectedPackage.price;
  };

  const resetPriceToCalculated = () => {
    setCustomPrice(calculatePrice().toString());
  };

  const validateSummary = (): boolean => {
    const priceValid = duration > 0 && parseFloat(customPrice || '0') > 0;
    const paymentValid = (paymentMethod === 'cash' || paymentMethod === 'card');
    return priceValid && paymentValid;
  };

  useEffect(() => {
    if (isOpen && branchId) {
      fetchPackages();
      fetchStaff();
    }
  }, [isOpen, branchId]);

  // Update price when package changes
  useEffect(() => {
    if (selectedPackage) {
      const totalPrice = selectedPackage.price; // ✅ Remove multiplication
      setCustomPrice(totalPrice.toString());
    }
  }, [selectedPackage]);

  // Fetch existing members when couple/family package is selected
  useEffect(() => {
    if (selectedPackage && selectedPackage.max_members > 1 && existingMembers.length === 0) {
      fetchExistingMembers();
    }
  }, [selectedPackage]);

  const fetchPackages = async () => {
    setLoadingPackages(true);
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
    } finally {
      setLoadingPackages(false);
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (response.ok) {
        const allMembers = result.data || [];
        const availableMembers = allMembers.filter((m: Member) => m.id !== member?.id);
        setExistingMembers(availableMembers);
      } else {
        throw new Error(result.error || 'Failed to fetch members');
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
    } finally {
      setSearchingMembers(false);
    }
  };

  const getMemberStatus = (member: Member) => {
    const today = new Date();
    const expiryDate = new Date(member.expiry_date);
    const diffTime = expiryDate.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'Expired', color: 'red', days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'Expiring Soon', color: 'yellow', days: daysUntilExpiry };
    } else {
      return { status: 'Active', color: 'green', days: daysUntilExpiry };
    }
  };

  const getExpiredMembers = () => {
    return existingMembers.filter(member => {
      const status = getMemberStatus(member);
      return status.color === 'red';
    });
  };

  const getFilteredMembers = () => {
    const searchLower = existingMemberSearch.toLowerCase();
    const expired = getExpiredMembers();
    
    return expired.filter(member => {
      // Filter by search terms
      const matchesSearch = member.first_name.toLowerCase().includes(searchLower) ||
        member.last_name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower);
      
      // Filter out already selected members
      const isNotSelected = !selectedAdditionalMembers.some(selected => selected.id === member.id);
      
      return matchesSearch && isNotSelected;
    });
  };

  const addAdditionalMember = (additionalMember: Member) => {
    // Check if already selected
    if (selectedAdditionalMembers.find(m => m.id === additionalMember.id)) {
      toast({
        title: "Member Already Selected",
        description: `${additionalMember.first_name} ${additionalMember.last_name} is already added to this renewal.`,
        variant: "destructive"
      });
      return;
    }
    
    // Check maximum member limit
    const maxAdditionalMembers = (selectedPackage?.max_members || 1) - 1;
    if (selectedAdditionalMembers.length >= maxAdditionalMembers) {
      toast({
        title: "Maximum Members Reached",
        description: `This package allows only ${selectedPackage?.max_members} total members.`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedAdditionalMembers(prev => [...prev, additionalMember]);
    setExistingMemberSearch('');
    
    toast({
      title: "Member Added",
      description: `${additionalMember.first_name} ${additionalMember.last_name} has been added to the renewal.`,
    });
  };

  const removeAdditionalMember = (memberId: string) => {
    setSelectedAdditionalMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const getDaysUntilExpiry = () => {
    if (!member) return 0;
    const today = new Date();
    const expiryDate = new Date(member.expiry_date);
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isExpired = () => {
    const daysUntilExpiry = getDaysUntilExpiry();
    return daysUntilExpiry < 0;
  };

  const handleRenewal = async () => {
     if (!member || !selectedPackage || loading) return;

    setLoading(true);
    try {
      const renewalData: any = {
        memberId: member.id,
        packageId: selectedPackage.id,
        durationMonths: selectedPackage.duration_months,
        amountPaid: parseFloat(customPrice),
        paymentMethod,
        staffId: verification.staffId,
        staffPin: verification.pin
      };

      if (selectedPackage.max_members > 1 && selectedAdditionalMembers.length > 0) {
        renewalData.additionalMembers = selectedAdditionalMembers.map(m => m.id);
      }

      console.log('🔄 Sending renewal request:', renewalData);

      await new Promise(resolve => setTimeout(resolve, 100));
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/renewals/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(renewalData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to process renewal');
      }

      const result = await response.json();
      console.log('✅ Renewal success:', result);

      const memberCount = 1 + selectedAdditionalMembers.length;
      toast({
        title: "Renewal Successful! 🎉",
        description: `${memberCount} member${memberCount > 1 ? 's have' : ' has'} been successfully renewed.`,
      });

      resetForm();
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
    setDuration(1);
    setCustomPrice('');
    setPaymentMethod('cash');
    setVerification({ staffId: '', pin: '' });
    setSelectedAdditionalMembers([]);
    setExistingMembers([]);
    setExistingMemberSearch('');
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto gym-card-gradient border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renew Membership - {member.first_name} {member.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Package Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <PackageIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Select Renewal Package</h3>
              <p className="text-muted-foreground">Choose a package for membership renewal</p>
            </div>
            
            {/* Current Member Info */}
            <Card className={`mb-6 ${isExpired() ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base ${isExpired() ? 'text-red-800' : 'text-yellow-800'}`}>
                  Current Membership Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className={`font-medium ${isExpired() ? 'text-red-600' : 'text-yellow-600'}`}>
                      Current Package
                    </p>
                    <p className={`font-semibold ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                      {member.package_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className={`font-medium ${isExpired() ? 'text-red-600' : 'text-yellow-600'}`}>
                      Expiry Date
                    </p>
                    <p className={`font-semibold ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                      {new Date(member.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className={`font-medium ${isExpired() ? 'text-red-600' : 'text-yellow-600'}`}>
                      Status
                    </p>
                    <p className={`font-semibold ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                      {isExpired() ? 'EXPIRED' : 'Active'}
                    </p>
                  </div>
                  <div>
                    <p className={`font-medium ${isExpired() ? 'text-red-600' : 'text-yellow-600'}`}>
                      Days {isExpired() ? 'Overdue' : 'Remaining'}
                    </p>
                    <p className={`font-semibold ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                      {Math.abs(getDaysUntilExpiry())} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Selection */}
            {loadingPackages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-foreground">Loading packages...</span>
              </div>
            ) : (
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
                          {pkg.max_members} member{pkg.max_members !== 1 ? 's' : ''}
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
            )}
          </div>
        )}

        {/* Step 2: Package Summary & Payment (Enhanced from AddNewMemberModal) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Package Summary & Payment</h3>
              <p className="text-muted-foreground">Review your selection and configure payment</p>
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
                    <Label className="text-foreground">Duration</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        {selectedPackage?.duration_months} month{selectedPackage?.duration_months !== 1 ? 's' : ''}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Package Default
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Calculated Total</span>
                    <span className="font-medium text-foreground">${calculatePrice()}</span>
                  </div>
                  
                  <Separator className="bg-border" />
                  
                  {/* Professional Price Editing Section */}
                  <div className="bg-accent/30 p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium text-foreground">Final Price</Label>
                      {parseFloat(customPrice || '0') !== calculatePrice() && (
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
                    
                    {parseFloat(customPrice || '0') !== calculatePrice() && (
                      <div className="mt-2 text-sm text-amber-300 bg-amber-500/10 p-2 rounded flex items-center gap-2 border border-amber-500/20">
                        <Info className="h-4 w-4" />
                        <span>Custom pricing applied (${Math.abs(parseFloat(customPrice || '0') - calculatePrice()).toFixed(2)} {parseFloat(customPrice || '0') > calculatePrice() ? 'above' : 'below'} calculated price)</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Member Summary */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4" />
                  Member Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Primary Member</span>
                    <span className="font-medium text-foreground">{member.first_name} {member.last_name}</span>
                  </div>
                  {selectedAdditionalMembers.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Additional Members</span>
                      <span className="font-medium text-foreground">{selectedAdditionalMembers.length}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Members</span>
                    <span className="font-medium text-foreground">{1 + selectedAdditionalMembers.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <CreditCard className="h-4 w-4" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash' | 'card')}>
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
              </CardContent>
            </Card>

            {/* Additional Members Section for Couple/Family packages */}
            {selectedPackage && selectedPackage.max_members > 1 && (
              <Card className="gym-card-gradient border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4" />
                    Additional Members
                    <Badge variant={selectedAdditionalMembers.length >= (selectedPackage.max_members - 1) ? "destructive" : "outline"}>
                      {selectedAdditionalMembers.length}/{selectedPackage.max_members - 1} selected
                      {selectedAdditionalMembers.length >= (selectedPackage.max_members - 1) && " (MAX)"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This package allows up to {selectedPackage.max_members} members. 
                    You can add expired members below to include them in this renewal.
                  </p>

                  {/* Show Selected Additional Members */}
                  {selectedAdditionalMembers.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-foreground">Selected Additional Members:</Label>
                      <div className="space-y-2">
                        {selectedAdditionalMembers.map((additionalMember) => (
                          <div key={additionalMember.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-green-800">{additionalMember.first_name} {additionalMember.last_name}</p>
                              <p className="text-sm text-green-600">{additionalMember.email}</p>
                              <p className="text-xs text-green-500">
                                Status: {additionalMember.status} • Expires: {new Date(additionalMember.expiry_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeAdditionalMember(additionalMember.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </div>
                  )}

                  {/* Search for additional members */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={
                          selectedAdditionalMembers.length >= (selectedPackage.max_members - 1) 
                            ? "Maximum members reached" 
                            : "Search for expired members to add..."
                        }
                        value={existingMemberSearch}
                        onChange={(e) => setExistingMemberSearch(e.target.value)}
                        disabled={selectedAdditionalMembers.length >= (selectedPackage.max_members - 1)}
                        className="flex-1 bg-background border-border"
                      />
                    </div>
                    
                    {/* Show filtered expired members */}
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {existingMemberSearch && (
                        getFilteredMembers().slice(0, 5).map((member) => {
                          const memberStatus = getMemberStatus(member);
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-800 border border-gray-600 rounded cursor-pointer hover:border-primary/50 hover:bg-gray-700">
                              <div className="flex-1">
                                <p className="font-medium text-gray-100">{member.first_name} {member.last_name}</p>
                                <p className="text-xs text-gray-300">{member.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    memberStatus.color === 'red' ? 'border-red-300 text-red-800' : 'border-border'
                                  }`}
                                >
                                  {memberStatus.status}
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 px-3"
                                  onClick={() => addAdditionalMember(member)}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Final Summary */}
            <Card className="border-primary/20 bg-primary/10 gym-card-gradient">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">${customPrice || '0'}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {duration} month{duration > 1 ? 's' : ''} • {1 + selectedAdditionalMembers.length} member{(1 + selectedAdditionalMembers.length) > 1 ? 's' : ''} • {paymentMethod === 'cash' ? 'Cash' : 'Card'} payment
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
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Staff Verification */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Staff Verification Required</h3>
              <p className="text-muted-foreground">Confirm renewal processing and payment</p>
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
                  <span className="text-muted-foreground">Member:</span>
                  <span className="font-medium text-foreground">{member.first_name} {member.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium text-foreground">{duration} month{duration > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="font-medium text-foreground">{paymentMethod === 'cash' ? 'Cash' : 'Card'}</span>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-foreground">Total Amount:</span>
                  <span className="text-primary">${customPrice}</span>
                </div>
              </CardContent>
            </Card>

            {/* Staff Verification Form */}
            <Card className="gym-card-gradient border-border">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Staff Authentication</CardTitle>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your 4-6 digit security PIN
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Final Confirmation */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-800">Ready to Process Renewal</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-green-700">
                  <p>✓ Package selected: {selectedPackage?.name}</p>
                  <p>✓ Duration: {duration} month{duration > 1 ? 's' : ''}</p>
                  <p>✓ Amount: ${customPrice}</p>
                  <p>✓ Payment method: {paymentMethod === 'cash' ? 'Cash' : 'Card'}</p>
                  <p>✓ Primary member: {member.first_name} {member.last_name}</p>
                  {selectedAdditionalMembers.length > 0 && (
                    <p>✓ Additional members: {selectedAdditionalMembers.length}</p>
                  )}
                  <p className="font-medium mt-3">
                    Click "Process Renewal" to complete the membership renewal{selectedAdditionalMembers.length > 0 ? ` for ${1 + selectedAdditionalMembers.length} members` : ''}.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-border">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !selectedPackage) ||
                  (step === 2 && !validateSummary())
                }
                className="min-w-[120px]"
              >
                {step === 2 ? 'Review & Verify' : 'Next'}
              </Button>
            ) : (
              <Button 
                onClick={handleRenewal}
                disabled={!verification.staffId || !verification.pin || loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Process Renewal
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RenewMemberModal;