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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && (branchId || member)) {
      fetchPackages();
      fetchStaff();
      // Don't fetch existing members immediately - only when couple/family package is selected
    }
  }, [isOpen, branchId, member]);

  // Fetch existing members when couple/family package is selected
  useEffect(() => {
    if (selectedPackage && selectedPackage.max_members > 1 && existingMembers.length === 0) {
      fetchExistingMembers();
    }
  }, [selectedPackage]);

  useEffect(() => {
    if (selectedPackage) {
      setDuration(selectedPackage.duration_months?.toString() || '1');
      setPrice(selectedPackage.price?.toString() || '0');
    }
  }, [selectedPackage]);

  const fetchPackages = async () => {
    const targetBranchId = branchId || member?.branch_id;
    if (!targetBranchId) return;
    
    setLoadingPackages(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${targetBranchId}`,
        { headers: getAuthHeaders() }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPackages(data.data || []);
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
    const targetBranchId = branchId || member?.branch_id;
    if (!targetBranchId) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/staff/branch/${targetBranchId}`,
        { headers: getAuthHeaders() }
      );
      
      if (response.ok) {
        const data = await response.json();
        setStaff(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchExistingMembers = async () => {
    const targetBranchId = branchId || member?.branch_id;
    if (!targetBranchId || targetBranchId.trim() === '') {
      console.warn('Cannot fetch existing members: branchId is missing');
      return;
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          branchId: targetBranchId.trim(),
          searchTerm: '',
          statusFilter: 'all'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setExistingMembers(data.data || []);
      } else {
        // Log the actual error for debugging
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch existing members:', response.status, errorData);
        setExistingMembers([]);
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
      setExistingMembers([]);
    }
  };

  // Get expired members for couple/family packages
  const getExpiredMembers = () => {
    const now = new Date();
    return existingMembers.filter(existingMember => {
      const expiryDate = new Date(existingMember.expiry_date);
      return (expiryDate < now || existingMember.status === 'expired') && existingMember.id !== member?.id;
    });
  };

  const getMemberStatus = (checkMember: Member) => {
    const now = new Date();
    const expiryDate = new Date(checkMember.expiry_date);
    
    if (checkMember.status === 'suspended') return { status: 'suspended', color: 'yellow' };
    if (expiryDate < now) return { status: 'expired', color: 'red' };
    return { status: 'active', color: 'green' };
  };

  const getFilteredExistingMembers = () => {
    // For couple/family packages, always show expired members first
    if (selectedPackage && selectedPackage.max_members > 1) {
      const expiredMembers = getExpiredMembers();
      
      if (!existingMemberSearch.trim()) {
        return expiredMembers.slice(0, 10);
      }
      
      // If searching, filter all members
      const searchLower = existingMemberSearch.toLowerCase();
      const allFilteredMembers = existingMembers.filter(existingMember => {
        const fullName = `${existingMember.first_name} ${existingMember.last_name}`.toLowerCase();
        const matchesSearch = fullName.includes(searchLower) || 
                             existingMember.email.toLowerCase().includes(searchLower) ||
                             (existingMember.phone && existingMember.phone.includes(existingMemberSearch));
        
        const isNotSelected = !selectedAdditionalMembers.some(selected => selected.id === existingMember.id);
        const isNotCurrentMember = existingMember.id !== member?.id;
        return matchesSearch && isNotSelected && isNotCurrentMember;
      });
      
      return allFilteredMembers.slice(0, 10);
    }
    
    return [];
  };

  const selectAdditionalMember = (additionalMember: Member) => {
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

  const handleRenewal = async () => {
    if (!member || !selectedPackage) return;

    setLoading(true);
    try {
      const renewalData: any = {
        memberId: member.id,
        packageId: selectedPackage.id,
        durationMonths: parseInt(duration),
        amountPaid: parseFloat(price),
        paymentMethod,
        staffVerification: verification
      };

      // Add additional members for couple/family packages
      if (selectedPackage.max_members > 1 && selectedAdditionalMembers.length > 0) {
        renewalData.additionalMembers = selectedAdditionalMembers.map(m => m.id);
      }

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
        throw new Error(errorData.error || 'Failed to process renewal');
      }

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
                      Type
                    </p>
                    <p className={`font-semibold capitalize ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                      {member.package_type || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className={`font-medium ${isExpired() ? 'text-red-600' : 'text-yellow-600'}`}>
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          isExpired() 
                            ? 'border-red-500 text-red-700 bg-red-50' 
                            : member.status === 'active' 
                            ? 'border-green-500 text-green-700 bg-green-50'
                            : 'border-yellow-500 text-yellow-700 bg-yellow-50'
                        }`}
                      >
                        {isExpired() ? 'Expired' : member.status}
                      </Badge>
                      {isExpired() && <AlertCircle className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                  <div>
                    <p className={`font-medium ${isExpired() ? 'text-red-600' : 'text-yellow-600'}`}>
                      Expiry Date
                    </p>
                    <p className={`font-semibold ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                      {new Date(member.expiry_date).toLocaleDateString()}
                    </p>
                    {isExpired() && (
                      <p className="text-xs text-red-600 mt-1">
                        Expired {Math.abs(getDaysUntilExpiry())} days ago
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Selection */}
            <div>
              <h4 className="text-md font-semibold mb-4">Available Packages</h4>
              
              {loadingPackages ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading available packages...</p>
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-8">
                  <PackageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No packages available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto p-2">
                  {packages.map((pkg) => (
                    <Card 
                      key={pkg.id} 
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedPackage?.id === pkg.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg' 
                          : 'border-border hover:border-primary/50 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedPackage(pkg)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{pkg.name}</CardTitle>
                          <Badge 
                            variant={pkg.type === 'couple' ? 'secondary' : pkg.type === 'family' ? 'default' : 'outline'}
                            className="capitalize"
                          >
                            {pkg.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">${pkg.price}</span>
                          <span className="text-sm text-muted-foreground">
                            /{pkg.duration_months} {pkg.duration_months === 1 ? 'month' : 'months'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>Up to {pkg.max_members} member{pkg.max_members > 1 ? 's' : ''}</span>
                        </div>
                        
                        {pkg.features && pkg.features.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Features:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {pkg.features.slice(0, 3).map((feature, index) => (
                                <li key={index} className="flex items-center gap-1">
                                  <Check className="h-3 w-3 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                              {pkg.features.length > 3 && (
                                <li className="text-xs text-muted-foreground">
                                  +{pkg.features.length - 3} more features
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                        
                        {selectedPackage?.id === pkg.id && (
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Selected
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Members Section for Couple/Family Packages */}
            {selectedPackage && selectedPackage.max_members > 1 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Add Additional Members ({selectedPackage.type} package)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-blue-700">
                    This {selectedPackage.type} package supports up to {selectedPackage.max_members} members. 
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
                                    memberStatus.color === 'red' ? 'border-red-500 text-red-700 bg-red-50' :
                                    'border-green-500 text-green-700 bg-green-50'
                                  }`}
                                >
                                  {memberStatus.status}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAdditionalMember(additionalMember.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available members list */}
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {getFilteredExistingMembers().length > 0 ? (
                      <>
                        {!existingMemberSearch && (
                          <Label className="text-sm text-muted-foreground">
                            Expired Members Available:
                          </Label>
                        )}
                        {getFilteredExistingMembers().map((additionalMember) => {
                          const memberStatus = getMemberStatus(additionalMember);
                          return (
                            <Card 
                              key={additionalMember.id} 
                              className={`cursor-pointer transition-colors p-3 ${
                                memberStatus.status === 'expired' 
                                  ? 'hover:bg-red-50 border-red-200' 
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => selectAdditionalMember(additionalMember)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <p className="text-sm font-medium">{additionalMember.first_name} {additionalMember.last_name}</p>
                                    <p className="text-xs text-muted-foreground">{additionalMember.email}</p>
                                    {memberStatus.status === 'expired' && (
                                      <p className="text-xs text-red-600">
                                        Expired {Math.abs(Math.ceil((new Date(additionalMember.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days ago
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      memberStatus.color === 'red' ? 'border-red-500 text-red-700 bg-red-50' :
                                      'border-green-500 text-green-700 bg-green-50'
                                    }`}
                                  >
                                    {memberStatus.status}
                                  </Badge>
                                  {memberStatus.status === 'expired' && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </>
                    ) : existingMemberSearch ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No members found</p>
                      </div>
                    ) : getExpiredMembers().length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No expired members available</p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Payment Configuration */}
        {step === 2 && selectedPackage && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Payment Configuration</h3>
              <p className="text-muted-foreground">Configure payment details for the renewal</p>
            </div>

            {/* Selected Package Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-primary">Selected Package</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-primary/70 font-medium">Package</p>
                    <p className="font-semibold text-primary">{selectedPackage.name}</p>
                  </div>
                  <div>
                    <p className="text-primary/70 font-medium">Type</p>
                    <p className="font-semibold text-primary capitalize">{selectedPackage.type}</p>
                  </div>
                  <div>
                    <p className="text-primary/70 font-medium">Base Price</p>
                    <p className="font-semibold text-primary">${selectedPackage.price}</p>
                  </div>
                  <div>
                    <p className="text-primary/70 font-medium">Base Duration</p>
                    <p className="font-semibold text-primary">
                      {selectedPackage.duration_months} month{selectedPackage.duration_months > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="duration">Duration (Months) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="24"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Enter duration in months"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Choose duration between 1-24 months
                </p>
              </div>
              
              <div>
                <Label htmlFor="price">Total Amount ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter total amount"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust price if needed (discounts, promotions, etc.)
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Cash Payment
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Bank Transfer
                    </div>
                  </SelectItem>
                  <SelectItem value="digital_wallet">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Digital Wallet
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Summary */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Renewal Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Primary Member:</span>
                    <span className="font-medium">{member.first_name} {member.last_name}</span>
                  </div>
                  {selectedAdditionalMembers.length > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Members:</span>
                      <span className="font-medium">{selectedAdditionalMembers.length}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Package:</span>
                    <span className="font-medium">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{duration} month{parseInt(duration) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-medium capitalize">{paymentMethod?.replace('_', ' ') || 'Not selected'}</span>
                  </div>
                  {selectedAdditionalMembers.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Additional Members:</p>
                      {selectedAdditionalMembers.map((additionalMember, index) => (
                        <p key={additionalMember.id} className="text-xs text-muted-foreground">
                          {index + 1}. {additionalMember.first_name} {additionalMember.last_name}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Members:</span>
                      <span className="text-primary">{1 + selectedAdditionalMembers.length}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total Amount:</span>
                      <span className="text-primary">${price}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Staff Verification */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Staff Verification</h3>
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