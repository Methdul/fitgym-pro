// frontend/src/components/staff/StaffAuthModal.tsx - FIXED VERSION

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';

interface StaffAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (staff: any) => void;
  branchId: string;
}

const StaffAuthModal = ({ isOpen, onClose, onAuthenticated, branchId }: StaffAuthModalProps) => {
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [fetchingStaff, setFetchingStaff] = useState(false);
  const { toast } = useToast();

  const handleAuthenticate = async () => {
    if (!staffId || !pin) {
      toast({
        title: "Missing Information",
        description: "Please select a staff member and enter your PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { isValid, staff } = await db.staff.verifyPin(staffId, pin);
      
      if (isValid && staff) {
        toast({
          title: "Authentication Successful",
          description: `Welcome, ${staff.first_name} ${staff.last_name}`,
        });
        onAuthenticated(staff);
        onClose();
        setStaffId('');
        setPin('');
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid PIN. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FIXED: Actually fetch real staff data when modal opens
  const fetchStaffMembers = async () => {
    if (!branchId) {
      console.warn('No branchId provided to fetch staff');
      return;
    }

    setFetchingStaff(true);
    try {
      console.log(`🔍 Fetching staff for branch: ${branchId}`);
      const { data, error } = await db.staff.getByBranch(branchId);
      
      if (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "Failed to load staff members. Using fallback data.",
          variant: "destructive",
        });
        
        // 🔧 Fallback to mock data only if API fails
        setStaffMembers([
          { id: 'fallback-1', first_name: 'Branch', last_name: 'Manager', role: 'manager' },
          { id: 'fallback-2', first_name: 'Senior', last_name: 'Staff', role: 'senior_staff' },
          { id: 'fallback-3', first_name: 'Associate', last_name: 'Staff', role: 'associate' }
        ]);
      } else {
        console.log(`✅ Found ${data?.length || 0} staff members for branch ${branchId}`);
        setStaffMembers(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff members:', error);
      toast({
        title: "Connection Error",
        description: "Could not connect to server. Please check your connection.",
        variant: "destructive",
      });
      
      // 🔧 Show empty state rather than mock data on connection error
      setStaffMembers([]);
    } finally {
      setFetchingStaff(false);
    }
  };

  // 🔧 FIXED: Call fetchStaffMembers when modal opens
  useEffect(() => {
    if (isOpen && branchId) {
      console.log(`🏢 Modal opened for branch: ${branchId}`);
      fetchStaffMembers();
      
      // Reset form when modal opens
      setStaffId('');
      setPin('');
    }
  }, [isOpen, branchId]);

  const handleClose = () => {
    setStaffId('');
    setPin('');
    onClose();
  };

  const formatStaffRole = (role: string) => {
    switch (role) {
      case 'manager':
        return 'Manager';
      case 'senior_staff':
        return 'Senior Staff';
      case 'associate':
        return 'Associate';
      default:
        return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Staff Authentication
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Please verify your identity to access the staff dashboard.
            </p>
            {branchId && (
              <p className="text-xs text-blue-600 mt-1">
                Branch ID: {branchId}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="staffSelect">Select Staff Member</Label>
            {fetchingStaff ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading staff members...
                </span>
              </div>
            ) : staffMembers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No staff members found for this branch.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchStaffMembers}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your name" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.first_name} {staff.last_name} ({formatStaffRole(staff.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="pin">PIN Code</Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(value);
                }}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                className="pr-10"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && staffId && pin.length === 4) {
                    handleAuthenticate();
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setShowPin(!showPin)}
                disabled={loading}
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAuthenticate} 
              disabled={loading || !staffId || pin.length !== 4 || staffMembers.length === 0}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Authenticate'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffAuthModal;