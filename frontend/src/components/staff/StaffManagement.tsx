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
import { db, getAuthHeaders } from '@/lib/supabase';
import type { BranchStaff } from '@/types';

interface StaffManagementProps {
  staff: BranchStaff[];
  branchId: string;
  onStaffUpdate: () => void;
}

// Staff ValidatedInput Component (Safe - Self-contained)
interface StaffValidatedInputProps {
  fieldName: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  getFieldError: (fieldName: string) => string;
  isFieldTouched: (fieldName: string) => boolean;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
}

const StaffValidatedInput: React.FC<StaffValidatedInputProps> = ({
  fieldName,
  label,
  value,
  onChange,
  onBlur,
  getFieldError,
  isFieldTouched,
  placeholder,
  type = "text",
  disabled = false,
  required = false,
  maxLength
}) => {
  const error = getFieldError(fieldName);
  const touched = isFieldTouched(fieldName);
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      <Label htmlFor={fieldName} className="text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={fieldName}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`bg-background border-border text-foreground ${
            hasError 
              ? 'border-red-500 focus-visible:ring-red-500' 
              : touched && !error 
                ? 'border-green-500 focus-visible:ring-green-500' 
                : ''
          }`}
        />
        {/* Error Icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
        )}
        {/* Success Icon */}
        {touched && !error && value.trim() && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>
      {/* Error Message */}
      {hasError && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      {/* Success Message (optional) */}
      {touched && !error && value.trim() && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>Looks good!</span>
        </div>
      )}
    </div>
  );
};

// Define the API base URL with better debugging
const getAPIBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  const fallbackURL = 'http://localhost:5001/api';
  
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

  // Enhanced Validation State (Safe - Won't interfere with existing)
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [fieldTouched, setFieldTouched] = useState<{[key: string]: boolean}>({});

  // Remove Staff Form State
  const [removeForm, setRemoveForm] = useState({
    authorizingStaffId: '',
    pin: '',
    reason: ''
  });

  // Enhanced Validation Functions (Safe - Self-contained)
const validateName = (name: string, fieldName: string): string => {
  if (!name.trim()) {
    return `${fieldName} is required`;
  }
  if (name.trim().length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  return '';
};

const validateStaffEmail = (email: string): string => {
  if (!email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return '';
};

const validateStaffPhone = (phone: string): string => {
  if (!phone.trim()) {
    return 'Phone number is required';
  }
  if (phone.trim().length < 8) {
    return 'Phone number must be at least 8 digits';
  }
  if (!/^[\d\s\-\+\(\)]+$/.test(phone.trim())) {
    return 'Phone number can only contain digits, spaces, dashes, plus signs, and parentheses';
  }
  return '';
};

const validateStaffPin = (pin: string): string => {
  if (!pin) {
    return 'PIN is required';
  }
  if (!/^\d{4}$/.test(pin)) {
    return 'PIN must be exactly 4 digits';
  }
  const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
  if (weakPins.includes(pin)) {
    return 'PIN is too weak. Avoid sequential or repeated digits';
  }
  return '';
};

const validateStaffField = (fieldName: string, value: string): string => {
  switch (fieldName) {
    case 'firstName':
      return validateName(value, 'First name');
    case 'lastName':
      return validateName(value, 'Last name');
    case 'email':
      return validateStaffEmail(value);
    case 'phone':
      return validateStaffPhone(value);
    case 'pin':
      return validateStaffPin(value);
    default:
      return '';
  }
};

// Helper functions for validation state
const getFieldError = (fieldName: string): string => {
  return fieldErrors[fieldName] || '';
};

const isFieldTouched = (fieldName: string): boolean => {
  return fieldTouched[fieldName] || false;
};

const setFieldError = (fieldName: string, error: string) => {
  setFieldErrors(prev => ({
    ...prev,
    [fieldName]: error
  }));
};

const markFieldTouched = (fieldName: string) => {
  setFieldTouched(prev => ({
    ...prev,
    [fieldName]: true
  }));
};

const handleFieldBlur = (fieldName: string, value: string) => {
  markFieldTouched(fieldName);
  const error = validateStaffField(fieldName, value);
  setFieldError(fieldName, error);
};

const handleFieldChange = (fieldName: string, value: string) => {
  if (isFieldTouched(fieldName)) {
    const error = validateStaffField(fieldName, value);
    setFieldError(fieldName, error);
  }
};

// Check if entire form is valid
const isFormValid = (): boolean => {
  // Check if all required fields have values
  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'pin', 'role'];
  const allFieldsFilled = requiredFields.every(field => {
    const value = newStaff[field as keyof typeof newStaff];
    return value && value.toString().trim() !== '';
  });
  
  if (!allFieldsFilled) return false;
  
  // Check if there are any validation errors
  const validationFields = ['firstName', 'lastName', 'email', 'phone', 'pin'];
  const hasErrors = validationFields.some(field => {
    const error = validateStaffField(field, newStaff[field as keyof typeof newStaff]);
    return error !== '';
  });
  
  return !hasErrors;
};

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
    // Enhanced validation using new system
    const fields = ['firstName', 'lastName', 'email', 'phone', 'pin'];
    let hasErrors = false;
    
    // Validate all fields and mark as touched
    fields.forEach(field => {
      markFieldTouched(field);
      const value = newStaff[field as keyof typeof newStaff];
      const error = validateStaffField(field, value);
      setFieldError(field, error);
      if (error) hasErrors = true;
    });
    
    // Role validation
    if (!newStaff.role) {
      setError('Role is required');
      return false;
    }
    
    if (hasErrors) {
      setError('Please fix the validation errors above');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleAddStaff = async () => {
    setError(null);
    
    if (!validateStaffForm()) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await db.staff.create({
        branchId: branchId,            // ← CHANGED from branch_id
        firstName: newStaff.firstName, // ← CHANGED from first_name  
        lastName: newStaff.lastName, 
        email: newStaff.email,
        phone: newStaff.phone || null,
        role: newStaff.role,
        pin: newStaff.pin
      });

      if (error) {
        throw error;
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

      // Reset validation state
      setFieldErrors({});
      setFieldTouched({});
      
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
      console.log('🔐 Attempting to remove staff:', selectedStaff?.first_name, selectedStaff?.last_name);
      console.log('📍 Using PIN:', removeForm.pin);
      
      // First verify the PIN - this will also get us a session token
      const { isValid, staff, error: pinError } = await db.staff.verifyPin(
        removeForm.authorizingStaffId, 
        removeForm.pin
      );
      
      console.log('🔐 PIN verification result:', { isValid, staff, error: pinError });

      if (!isValid) {
        throw new Error('Invalid PIN for selected staff member. Please check and try again.');
      }

      console.log('✅ PIN verified successfully, proceeding with deletion...');

      // MINIMAL FIX: Wait for session token to be stored
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now delete the staff member - the session token is automatically included
      const { error: deleteError } = await db.staff.delete(selectedStaff!.id);

      if (deleteError) {
        throw deleteError;
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
      console.error('❌ Error removing staff:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove staff member';
      setError(errorMessage);
      
      // Only show toast for non-validation errors (network issues, etc.)
      if (!error?.message?.includes('PIN') && !error?.message?.includes('credentials')) {
        toast({
          title: "Error Removing Staff",
          description: errorMessage,
          variant: "destructive"
        });
      }
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
                <StaffValidatedInput
                  fieldName="firstName"
                  label="First Name"
                  value={newStaff.firstName}
                  onChange={(value) => {
                    setNewStaff(prev => ({ ...prev, firstName: value }));
                    handleFieldChange('firstName', value);
                  }}
                  onBlur={(value) => handleFieldBlur('firstName', value)}
                  getFieldError={getFieldError}
                  isFieldTouched={isFieldTouched}
                  placeholder="John"
                  disabled={loading}
                  required={true}
                />
              </div>
                <div>
                  <StaffValidatedInput
                    fieldName="lastName"
                    label="Last Name"
                    value={newStaff.lastName}
                    onChange={(value) => {
                      setNewStaff(prev => ({ ...prev, lastName: value }));
                      handleFieldChange('lastName', value);
                    }}
                    onBlur={(value) => handleFieldBlur('lastName', value)}
                    getFieldError={getFieldError}
                    isFieldTouched={isFieldTouched}
                    placeholder="Doe"
                    disabled={loading}
                    required={true}
                  />
                </div>
            </div>
            <div>
              <StaffValidatedInput
                fieldName="email"
                label="Email"
                value={newStaff.email}
                onChange={(value) => {
                  setNewStaff(prev => ({ ...prev, email: value }));
                  handleFieldChange('email', value);
                }}
                onBlur={(value) => handleFieldBlur('email', value)}
                getFieldError={getFieldError}
                isFieldTouched={isFieldTouched}
                placeholder="john.doe@example.com"
                type="email"
                disabled={loading}
                required={true}
              />
            </div>
            
            <div>
              <StaffValidatedInput
                fieldName="phone"
                label="Phone"
                value={newStaff.phone}
                onChange={(value) => {
                  setNewStaff(prev => ({ ...prev, phone: value }));
                  handleFieldChange('phone', value);
                }}
                onBlur={(value) => handleFieldBlur('phone', value)}
                getFieldError={getFieldError}
                isFieldTouched={isFieldTouched}
                placeholder="+1 234 567 8900"
                type="tel"
                disabled={loading}
                required={true}
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
              <StaffValidatedInput
                fieldName="pin"
                label="4-Digit PIN"
                value={newStaff.pin}
                onChange={(value) => {
                  const numericValue = value.replace(/\D/g, '');
                  setNewStaff(prev => ({ ...prev, pin: numericValue }));
                  handleFieldChange('pin', numericValue);
                }}
                onBlur={(value) => handleFieldBlur('pin', value)}
                getFieldError={getFieldError}
                isFieldTouched={isFieldTouched}
                placeholder="1234"
                type="password"
                maxLength={4}
                disabled={loading}
                required={true}
              />
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
                disabled={loading || !isFormValid()} 
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