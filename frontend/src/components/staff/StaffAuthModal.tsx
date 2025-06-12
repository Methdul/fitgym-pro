
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, EyeOff } from 'lucide-react';
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

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await db.staff.getByBranch(branchId);
      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  // Mock staff data for demonstration
  useEffect(() => {
    if (isOpen) {
      // Mock staff members
      setStaffMembers([
        { id: 'staff-1', first_name: 'John', last_name: 'Manager', role: 'manager' },
        { id: 'staff-2', first_name: 'Sarah', last_name: 'Senior', role: 'senior_staff' },
        { id: 'staff-3', first_name: 'Mike', last_name: 'Associate', role: 'associate' }
      ]);
    }
  }, [isOpen]);

  const handleClose = () => {
    setStaffId('');
    setPin('');
    onClose();
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
          </div>

          <div>
            <Label htmlFor="staffSelect">Select Staff Member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your name" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name} ({staff.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pin">PIN Code</Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter your 4-digit PIN"
                maxLength={4}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Demo PINs:</strong> Use "1234" for any staff member
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAuthenticate} disabled={loading} className="flex-1">
              {loading ? 'Verifying...' : 'Authenticate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffAuthModal;
