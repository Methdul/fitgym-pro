
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Calendar, Info } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AddExistingMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
}

export const AddExistingMemberModal = ({ 
  open, 
  onOpenChange, 
  branchId, 
  onMemberAdded 
}: AddExistingMemberModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    expiryDate: ''
  });

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.nationalId || !formData.phone || !formData.expiryDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Generate email and temporary password
      const generatedEmail = `branch${branchId.slice(-3)}-${formData.nationalId}@gymsystem.com`;
      
      const memberData = {
        branch_id: branchId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: generatedEmail,
        phone: formData.phone,
        national_id: formData.nationalId,
        status: 'active' as const,
        package_type: 'individual' as const,
        package_name: 'Existing Member Transfer',
        package_price: 0,
        start_date: new Date().toISOString().split('T')[0],
        expiry_date: formData.expiryDate,
        is_verified: false
      };

      const { error } = await db.members.create(memberData);
      if (error) throw error;

      toast({
        title: "Member Added Successfully",
        description: `${formData.firstName} ${formData.lastName} has been added to the branch`
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        nationalId: '',
        phone: '',
        expiryDate: ''
      });
      
      onOpenChange(false);
      onMemberAdded();
    } catch (error) {
      console.error('Error adding existing member:', error);
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatedEmail = formData.nationalId 
    ? `branch${branchId.slice(-3)}-${formData.nationalId}@gymsystem.com`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Existing Member
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 font-medium mb-2">
              <Info className="h-4 w-4" />
              Quick Add for Existing Members
            </div>
            <p className="text-sm text-blue-700">
              This is for people already using the gym offline. System will generate temporary login credentials.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="nationalId">National ID *</Label>
            <Input
              id="nationalId"
              value={formData.nationalId}
              onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
              placeholder="123456789"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="expiryDate">Current Expiry Date *</Label>
            <Input
              id="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
            />
          </div>

          {formData.nationalId && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Auto-generated Login Credentials:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Email:</span> {generatedEmail}</p>
                <p><span className="text-muted-foreground">Temp Password:</span> {formData.nationalId}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Member can update these later
              </Badge>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
