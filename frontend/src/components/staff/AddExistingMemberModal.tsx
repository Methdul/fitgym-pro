import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Calendar, Info, CheckCircle, Eye, EyeOff, Copy } from 'lucide-react';
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
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<any>(null);
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
      const memberData = {
        branch_id: branchId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        national_id: formData.nationalId,
        status: 'active' as const,
        package_type: 'individual' as const,
        package_name: 'Existing Member Transfer',
        package_price: 0,
        start_date: new Date().toISOString().split('T')[0],
        expiry_date: formData.expiryDate,
        is_verified: false,
        is_existing_member: true // This tells backend to generate simple email
      };

      const { error, data } = await db.members.create(memberData);
      if (error) throw error;

      // Show success with account credentials
      setCreatedAccount(data);
      setShowCredentials(true);

      toast({
        title: "Member Added Successfully",
        description: `${formData.firstName} ${formData.lastName} has been added with auto-generated account`,
      });

      onMemberAdded();
    } catch (error: any) {
      console.error('Error adding existing member:', error);
      
      // Parse detailed error response
      let errorMessage = "Failed to add member. Please try again.";
      let errorTitle = "Error";
      
      if (error.message.includes('National ID already exists')) {
        errorTitle = "Duplicate Member";
        errorMessage = "This person already has an account in the system.";
      } else if (error.message.includes('email already exists')) {
        errorTitle = "Email Conflict";
        errorMessage = "An account with this email already exists.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const resetModal = () => {
    setFormData({
      firstName: '',
      lastName: '',
      nationalId: '',
      phone: '',
      expiryDate: ''
    });
    setCreatedAccount(null);
    setShowCredentials(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  // UPDATED: Simple email generation using just National ID
  const generatedEmail = formData.nationalId 
    ? `${formData.nationalId}@gmail.com`
    : '';

  if (showCredentials && createdAccount) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Member Account Created Successfully
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-green-800">Member Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{createdAccount.member.first_name} {createdAccount.member.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">National ID</p>
                    <p className="font-medium">{createdAccount.member.national_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{createdAccount.member.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">{new Date(createdAccount.member.expiry_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-blue-800">Login Credentials</CardTitle>
                <p className="text-sm text-blue-600">Provide these credentials to the member</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-mono text-sm">{createdAccount.account.email}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdAccount.account.email)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <p className="text-sm text-muted-foreground">Temporary Password</p>
                      <p className="font-mono text-sm">{createdAccount.account.temporaryPassword}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdAccount.account.temporaryPassword)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Instructions for Member:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>1. Login with the email and password above</li>
                    <li>2. Change password from National ID to secure password</li>
                    <li>3. Add their real email address if needed</li>
                    <li>4. Verify their email address</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button onClick={() => {
                resetModal();
                setShowCredentials(false);
              }} className="flex-1">
                Add Another Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
              This creates a login account with simple email format. Member can update their email later.
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
              <h4 className="font-medium text-sm">Auto-generated Account:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Email:</span> {generatedEmail}</p>
                <p><span className="text-muted-foreground">Password:</span> {formData.nationalId}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Simple format: ID@gmail.com
              </Badge>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Creating Account...' : 'Add Member'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};