import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Shield, User, Plus, Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BranchStaff } from '@/types';

interface StaffManagementProps {
  staff: BranchStaff[];
  branchId: string;
  onStaffUpdate: () => void;
}

// Define the API base URL with better debugging
const getAPIBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  const fallbackURL = 'http://localhost:5000/api';
  
  console.log('🔍 Environment VITE_API_URL:', envURL);
  console.log('🔍 Using API URL:', envURL || fallbackURL);
  
  return envURL || fallbackURL;
};

const API_BASE_URL = getAPIBaseURL();

export const StaffManagement = ({ staff, branchId, onStaffUpdate }: StaffManagementProps) => {
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showRemoveStaff, setShowRemoveStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<BranchStaff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Add Staff Form State
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    pin: ''
  });

  // Remove Staff Form State
  const [removeForm, setRemoveForm] = useState({
    authorizingStaffId: '',
    pin: '',
    reason: ''
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager': return Crown;
      case 'senior_staff': return Shield;
      default: return User;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'senior_staff': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const seniorStaff = staff.filter(s => s.role === 'manager' || s.role === 'senior_staff');

  const validateStaffForm = () => {
    if (!newStaff.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!newStaff.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!newStaff.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!newStaff.role) {
      setError('Role is required');
      return false;
    }
    if (!newStaff.pin) {
      setError('PIN is required');
      return false;
    }
    if (!/^\d{4}$/.test(newStaff.pin)) {
      setError('PIN must be exactly 4 digits');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaff.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleAddStaff = async () => {
    setError(null);
    
    if (!validateStaffForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: branchId,
          first_name: newStaff.firstName,
          last_name: newStaff.lastName,
          email: newStaff.email,
          phone: newStaff.phone || null,
          role: newStaff.role,
          pin: newStaff.pin
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.status !== 'success') {
        throw new Error(result.error || 'Failed to add staff member');
      }

      toast({
        title: "Staff Added Successfully",
        description: `${newStaff.firstName} ${newStaff.lastName} has been added to the team`,
      });

      // Reset form
      setNewStaff({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        pin: ''
      });
      
      setShowAddStaff(false);
      onStaffUpdate(); // Refresh the staff list

    } catch (error) {
      console.error('Error adding staff:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add staff member';
      setError(errorMessage);
      
      toast({
        title: "Error Adding Staff",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateRemoveForm = () => {
    if (!selectedStaff) {
      setError('No staff member selected');
      return false;
    }
    if (!removeForm.authorizingStaffId) {
      setError('Please select an authorizing staff member');
      return false;
    }
    if (!removeForm.pin) {
      setError('PIN is required');
      return false;
    }
    if (removeForm.reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return false;
    }
    return true;
  };

  const handleRemoveStaff = async () => {
    setError(null);
    
    if (!validateRemoveForm()) {
      return;
    }

    setLoading(true);
    try {
      // First verify the PIN
      const pinResponse = await fetch(`${API_BASE_URL}/staff/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId: removeForm.authorizingStaffId,
          pin: removeForm.pin
        }),
      });

      const pinResult = await pinResponse.json();

      if (!pinResponse.ok || !pinResult.isValid) {
        throw new Error('Invalid PIN. Please check your credentials.');
      }

      // If PIN is valid, proceed with deletion
      const deleteResponse = await fetch(`${API_BASE_URL}/staff/${selectedStaff!.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const deleteResult = await deleteResponse.json();

      if (!deleteResponse.ok) {
        throw new Error(deleteResult.error || `HTTP error! status: ${deleteResponse.status}`);
      }

      if (deleteResult.status !== 'success') {
        throw new Error(deleteResult.error || 'Failed to remove staff member');
      }

      toast({
        title: "Staff Removed Successfully",
        description: `${selectedStaff!.first_name} ${selectedStaff!.last_name} has been removed from the team`,
      });

      // Reset form and close modal
      setShowRemoveStaff(false);
      setSelectedStaff(null);
      setRemoveForm({
        authorizingStaffId: '',
        pin: '',
        reason: ''
      });
      
      onStaffUpdate(); // Refresh the staff list

    } catch (error) {
      console.error('Error removing staff:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove staff member';
      setError(errorMessage);
      
      toast({
        title: "Error Removing Staff",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = () => {
    setNewStaff({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      pin: ''
    });
    setError(null);
  };

  const resetRemoveForm = () => {
    setRemoveForm({
      authorizingStaffId: '',
      pin: '',
      reason: ''
    });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Staff Header */}
      <Card className="gym-card-gradient border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff Management</CardTitle>
              <p className="text-muted-foreground">Manage branch team members and their permissions</p>
            </div>
            <Button 
              onClick={() => {
                resetAddForm();
                setShowAddStaff(true);
              }}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((staffMember) => {
          const RoleIcon = getRoleIcon(staffMember.role);
          return (
            <Card key={staffMember.id} className="gym-card-gradient border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {staffMember.first_name} {staffMember.last_name}
                      <RoleIcon className="h-4 w-4 text-primary" />
                    </CardTitle>
                    <Badge className={getRoleBadgeColor(staffMember.role)}>
                      {staffMember.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  {staffMember.role !== 'manager' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        setSelectedStaff(staffMember);
                        resetRemoveForm();
                        setShowRemoveStaff(true);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Email:</span> {staffMember.email}</p>
                  {staffMember.phone && (
                    <p><span className="text-muted-foreground">Phone:</span> {staffMember.phone}</p>
                  )}
                  <p><span className="text-muted-foreground">PIN:</span> ****</p>
                  <p><span className="text-muted-foreground">Joined:</span> {new Date(staffMember.created_at).toLocaleDateString()}</p>
                  {staffMember.last_active && (
                    <p><span className="text-muted-foreground">Last Active:</span> {new Date(staffMember.last_active).toLocaleDateString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {staff.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Staff Members</h3>
          <p className="text-muted-foreground mb-4">Get started by adding your first staff member</p>
          <Button onClick={() => setShowAddStaff(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      )}

      {/* Role Permissions Display */}
      <Card className="gym-card-gradient border-border">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <h4 className="font-semibold">Manager</h4>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Full branch access</li>
                <li>• Manage all members</li>
                <li>• Add/remove staff</li>
                <li>• View all reports</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold">Senior Staff</h4>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Manage members</li>
                <li>• Remove associates</li>
                <li>• Process renewals</li>
                <li>• View member reports</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-green-500" />
                <h4 className="font-semibold">Associate</h4>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• View members</li>
                <li>• Add new members</li>
                <li>• Process renewals</li>
                <li>• Update member info</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Dialog open={showAddStaff} onOpenChange={(open) => {
        if (!open) resetAddForm();
        setShowAddStaff(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newStaff.firstName}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newStaff.lastName}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@fitgym.com"
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={newStaff.phone}
                onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select 
                value={newStaff.role} 
                onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="associate">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Associate - Basic member management
                    </div>
                  </SelectItem>
                  <SelectItem value="senior_staff">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Senior Staff - Can remove associates
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Manager - Full branch access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="pin">4-Digit PIN *</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={newStaff.pin}
                onChange={(e) => setNewStaff(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder="1234"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be exactly 4 digits
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddStaff(false)} 
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddStaff} 
                disabled={loading} 
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Staff Member'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Staff Modal */}
      <Dialog open={showRemoveStaff} onOpenChange={(open) => {
        if (!open) {
          resetRemoveForm();
          setSelectedStaff(null);
        }
        setShowRemoveStaff(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-500 font-medium mb-2">
                <Trash2 className="h-4 w-4" />
                Warning: Permanent Action
              </div>
              <p className="text-sm text-red-600">
                You are about to remove {selectedStaff?.first_name} {selectedStaff?.last_name} from the team.
                This action cannot be undone.
              </p>
            </div>

            <div>
              <Label htmlFor="authStaff">Authorizing Staff Member *</Label>
              <Select 
                value={removeForm.authorizingStaffId} 
                onValueChange={(value) => setRemoveForm(prev => ({ ...prev, authorizingStaffId: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select authorizing staff" />
                </SelectTrigger>
                <SelectContent>
                  {seniorStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.first_name} {staff.last_name} ({staff.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="authPin">Your 4-Digit PIN *</Label>
              <Input
                id="authPin"
                type="password"
                maxLength={4}
                value={removeForm.pin}
                onChange={(e) => setRemoveForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder="Enter your PIN"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason for Removal *</Label>
              <Textarea
                id="reason"
                value={removeForm.reason}
                onChange={(e) => setRemoveForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Provide a detailed reason for removing this staff member (minimum 10 characters)"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowRemoveStaff(false)} 
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRemoveStaff} 
                disabled={loading} 
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove Staff Member'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};