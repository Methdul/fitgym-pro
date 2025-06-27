import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, CreditCard, Shield, Package as PackageIcon, CheckCircle, 
  RefreshCw, User, Clock, AlertCircle, Check, Users, AlertTriangle, Search, X
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
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);
  const [verification, setVerification] = useState({ staffId: '', pin: '' });
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedAdditionalMembers, setSelectedAdditionalMembers] = useState<Member[]>([]);
  const [existingMemberSearch, setExistingMemberSearch] = useState('');
  const [searchingMembers, setSearchingMembers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && branchId) {
      fetchPackages();
      fetchStaff();
    }
  }, [isOpen, branchId]);

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
        // Filter out the current member and only show members that can be added to packages
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
      return status.color === 'red'; // Only expired members
    });
  };

  const getFilteredMembers = () => {
    const searchLower = existingMemberSearch.toLowerCase();
    const expired = getExpiredMembers();
    
    return expired.filter(member => 
      member.first_name.toLowerCase().includes(searchLower) ||
      member.last_name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower)
    );
  };

  const addAdditionalMember = (additionalMember: Member) => {
    if (selectedAdditionalMembers.find(m => m.id === additionalMember.id)) {
      return; // Already selected
    }
    
    setSelectedAdditionalMembers(prev => [...prev, additionalMember]);
    setExistingMemberSearch('');
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

  // ✅ FIXED: Updated handleRenewal to send correct data format
  const handleRenewal = async () => {
    if (!member || !selectedPackage) return;

    setLoading(true);
    try {
      // ✅ PHASE 2 FIX: Send staffId and staffPin as TOP-LEVEL fields (not nested)
      const renewalData: any = {
        memberId: member.id,
        packageId: selectedPackage.id,
        durationMonths: parseInt(duration),
        amountPaid: parseFloat(price),
        paymentMethod,
        staffId: verification.staffId,      // ✅ Top-level field
        staffPin: verification.pin          // ✅ Top-level field (renamed from 'pin' to 'staffPin')
      };

      // Add additional members for couple/family packages
      if (selectedPackage.max_members > 1 && selectedAdditionalMembers.length > 0) {
        renewalData.additionalMembers = selectedAdditionalMembers.map(m => m.id);
      }

      console.log('🔄 Sending renewal request:', renewalData);
      console.log('🔐 Auth headers:', getAuthHeaders());

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

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error response:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to process renewal');
      }

      const result = await response.json();
      console.log('✅ Renewal success:', result);

      const memberCount = 1 + selectedAdditionalMembers.length;
      toast({
        title: "Renewal Successful! 🎉",
        description: `${memberCount} member${memberCount > 1 ? 's have' : ' has'} been successfully renewed.`,
      });

      // Reset form and close modal
      setStep(1);
      setSelectedPackage(null);
      setDuration('');
      setPrice('');
      setPaymentMethod(undefined);
      setVerification({ staffId: '', pin: '' });
      setSelectedAdditionalMembers([]);
      setExistingMemberSearch('');
      
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
    setSelectedAdditionalMembers([]);
    setExistingMembers([]); // Clear existing members cache
    setExistingMemberSearch('');
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renew Membership - {member.first_name} {member.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Package Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <PackageIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Select Renewal Package</h3>
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
                <span className="ml-2">Loading packages...</span>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Step 2: Duration and Payment */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Duration & Payment Details</h3>
              <p className="text-muted-foreground">Configure the renewal terms and payment</p>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-blue-800">Selected Package</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">{selectedPackage?.name}</p>
                    <p className="text-sm text-blue-700">{selectedPackage?.type} package • ${selectedPackage?.price}/month</p>
                  </div>
                  <Badge variant="outline" className="text-blue-800 border-blue-300">
                    Max {selectedPackage?.max_members} member{selectedPackage?.max_members !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="duration">Duration (months) *</Label>
                <Select value={duration} onValueChange={(value) => {
                  setDuration(value);
                  if (selectedPackage) {
                    const totalPrice = selectedPackage.price * parseInt(value);
                    setPrice(totalPrice.toString());
                  }
                }}>
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
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter total amount"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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

            {/* Additional Members Section for Couple/Family packages */}
            {selectedPackage && selectedPackage.max_members > 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="text-lg font-semibold">Additional Members</h4>
                  <Badge variant="outline">
                    {selectedAdditionalMembers.length}/{selectedPackage.max_members - 1} selected
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  This package allows up to {selectedPackage.max_members} members. 
                  You can add expired members below to include them in this renewal.
                </p>

                {/* Show expired members notice */}
                {getExpiredMembers().length > 0 && (
                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-medium text-orange-800">
                        {getExpiredMembers().length} expired member{getExpiredMembers().length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <p className="text-xs text-orange-700">
                      Select expired members below to include them in this renewal package.
                    </p>
                  </div>
                )}

                {/* Search for additional members */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    className="pl-10"
                    placeholder="Search for additional members..."
                    value={existingMemberSearch}
                    onChange={(e) => setExistingMemberSearch(e.target.value)}
                  />
                </div>

                {/* Selected additional members */}
                {selectedAdditionalMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Additional Members:</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedAdditionalMembers.map((additionalMember) => {
                        const memberStatus = getMemberStatus(additionalMember);
                        return (
                          <div key={additionalMember.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-sm font-medium">{additionalMember.first_name} {additionalMember.last_name}</p>
                                <p className="text-xs text-muted-foreground">{additionalMember.email}</p>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  memberStatus.color === 'red' ? 'border-red-300 text-red-800' :
                                  memberStatus.color === 'yellow' ? 'border-yellow-300 text-yellow-800' :
                                  'border-green-300 text-green-800'
                                }`}
                              >
                                {memberStatus.status}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAdditionalMember(additionalMember.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available members to select */}
                {existingMemberSearch && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Available Members:</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {getFilteredMembers().length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">No expired members found.</p>
                      ) : (
                        getFilteredMembers()
                          .filter(member => !selectedAdditionalMembers.find(selected => selected.id === member.id))
                          .slice(0, 5)
                          .map((member) => {
                            const memberStatus = getMemberStatus(member);
                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100"
                                onClick={() => {
                                  if (selectedAdditionalMembers.length < selectedPackage.max_members - 1) {
                                    addAdditionalMember(member);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div>
                                    <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      memberStatus.color === 'red' ? 'border-red-300 text-red-800' : 'border-gray-300'
                                    }`}
                                  >
                                    {memberStatus.status}
                                  </Badge>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 px-3">
                                  Add
                                </Button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Staff Verification */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Staff Verification Required</h3>
              <p className="text-muted-foreground">Verify your identity to process the renewal</p>
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
                  value={verification.pin}
                  onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="Enter your security PIN"
                  maxLength={6}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your 4-6 digit security PIN
                </p>
              </div>
            </div>

            {/* Final Confirmation */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-800">Ready to Process Renewal</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-green-700">
                  <p>✓ Package selected: {selectedPackage?.name}</p>
                  <p>✓ Duration: {duration} month{parseInt(duration) > 1 ? 's' : ''}</p>
                  <p>✓ Amount: ${price}</p>
                  <p>✓ Payment method: {paymentMethod?.replace('_', ' ')}</p>
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
        <div className="flex gap-3 pt-6 border-t">
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !selectedPackage) ||
                (step === 2 && (!duration || !price || !paymentMethod))
              }
              className="flex-1"
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleRenewal}
              disabled={loading || !verification.staffId || !verification.pin}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process Renewal
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RenewMemberModal;