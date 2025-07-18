// Enhanced AddNewMemberModal.tsx - Conservative approach preserving original functionality
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/supabase';
import { 
  Package as PackageIcon, 
  User, 
  Users, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Info,
  DollarSign,
  Edit,
  UserCheck,
  Search,
  X,
  Copy,
  Calendar,
  Mail,
  UserPlus,
  AlertTriangle
} from 'lucide-react';
import type { Member, Package as PackageType, BranchStaff } from '@/types';
import { supabase } from '@/lib/supabase';

interface AddNewMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onMemberAdded: () => void;
  authenticatedStaff: any; // ADD THIS LINE
}

type Step = 'package' | 'members' | 'summary' | 'verification' | 'success';

// Enhanced interface - adding optional autoGenerateEmail to original structure
interface MemberFormData {
  id?: string;
  isExisting?: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  nationalId: string;
  autoGenerateEmail?: boolean; // New optional field
  lastPaymentDate?: string;
}
  // ✅ NEW: Enhanced Input Component with validation feedback
  interface ValidatedInputProps {
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
    className?: string;
  }

  const ValidatedInput: React.FC<ValidatedInputProps> = ({
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
    className = ""
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
            className={`${className} bg-background border-border text-foreground ${
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

  // Helper function to format package pricing display
const formatPackagePrice = (pkg: PackageType): string => {
  const durationType = pkg.duration_type || 'months';
  const durationValue = pkg.duration_value || pkg.duration_months || 1;
  
  let unit = '';
  if (durationType === 'days') {
    unit = durationValue === 1 ? 'day' : 'days';
  } else if (durationType === 'weeks') {
    unit = durationValue === 1 ? 'week' : 'weeks';
  } else {
    unit = durationValue === 1 ? 'month' : 'months';
  }
  
  return `$${pkg.price}/${durationValue === 1 ? unit : `${durationValue} ${unit}`}`;
};


export const AddNewMemberModal = ({ open, onOpenChange, branchId, onMemberAdded, authenticatedStaff }: AddNewMemberModalProps) => {
  // State management - keeping original structure
  const [currentStep, setCurrentStep] = useState<Step>('package');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Package selection
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);

  // Member forms
  const [memberForms, setMemberForms] = useState<MemberFormData[]>([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  
  // Existing member selection
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);
  const [existingMemberSearch, setExistingMemberSearch] = useState('');
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<Member[]>([]);

  // Package summary and payment
  const [duration, setDuration] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'paid'>('cash');

  // Staff verification
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [verification, setVerification] = useState({ staffId: '', pin: '' });

  // Success
  const [createdAccounts, setCreatedAccounts] = useState<any[]>([]);

  // NEW: Existing member workflow state
  const [isExistingMember, setIsExistingMember] = useState(false);
  const [lastPaidDate, setLastPaidDate] = useState<string>('');
  const [manualPrice, setManualPrice] = useState<string>('');

  // ✅ NEW: Enhanced form validation state
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [fieldTouched, setFieldTouched] = useState<{[key: string]: boolean}>({});

  // ✅ NEW: Helper function to get field error for current member
  const getFieldError = (fieldName: string): string => {
    const fieldKey = `member-${currentMemberIndex}-${fieldName}`;
    return fieldErrors[fieldKey] || '';
  };

  // ✅ NEW: Helper function to check if field has been touched
  const isFieldTouched = (fieldName: string): boolean => {
    const fieldKey = `member-${currentMemberIndex}-${fieldName}`;
    return fieldTouched[fieldKey] || false;
  };

  // ✅ NEW: Helper function to set field error
  const setFieldError = (fieldName: string, error: string) => {
    const fieldKey = `member-${currentMemberIndex}-${fieldName}`;
    setFieldErrors(prev => ({
      ...prev,
      [fieldKey]: error
    }));
  };

  // ✅ NEW: Helper function to mark field as touched
  const markFieldTouched = (fieldName: string) => {
    const fieldKey = `member-${currentMemberIndex}-${fieldName}`;
    setFieldTouched(prev => ({
      ...prev,
      [fieldKey]: true
    }));
  };

  // ✅ NEW: Clear validation state when member index changes
  const clearValidationForMember = (memberIndex: number) => {
    const fieldsToCheck = ['firstName', 'lastName', 'email', 'phone', 'nationalId'];
    const updatedErrors = { ...fieldErrors };
    const updatedTouched = { ...fieldTouched };
    
    fieldsToCheck.forEach(field => {
      const fieldKey = `member-${memberIndex}-${field}`;
      delete updatedErrors[fieldKey];
      delete updatedTouched[fieldKey];
    });
    
    setFieldErrors(updatedErrors);
    setFieldTouched(updatedTouched);
  };

  
  // Initialize member forms when package is selected - ORIGINAL LOGIC
  useEffect(() => {
    if (selectedPackage && memberForms.length === 0) {
      const forms: MemberFormData[] = [];
      for (let i = 0; i < (selectedPackage.max_members || 1); i++) {
        forms.push({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          emergencyContact: '',
          emergencyPhone: '',
          nationalId: '',
          autoGenerateEmail: false // Default to manual email
        });
      }
      setMemberForms(forms);
      setCurrentMemberIndex(0);
    }
  }, [open, selectedPackage?.id, selectedPackage?.max_members, memberForms.length]);

  // Initialize form - ORIGINAL LOGIC
  useEffect(() => {
    if (open) {
      fetchPackages();
      fetchStaff();
      fetchExistingMembers();
      resetForm();
    }
  }, [open, branchId]);

  // NEW: Auto-generate email functionality
  useEffect(() => {
    if (memberForms[currentMemberIndex]?.autoGenerateEmail && memberForms[currentMemberIndex]?.nationalId) {
      updateMemberForm(currentMemberIndex, {
        email: `${memberForms[currentMemberIndex].nationalId}@gmail.com`
      });
    }
  }, [memberForms[currentMemberIndex]?.nationalId, memberForms[currentMemberIndex]?.autoGenerateEmail]);


  // ✅ NEW: Field validation functions
  // Name validation (letters, spaces, hyphens, apostrophes only)
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

  // Email validation
  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Phone validation (basic)
  const validatePhone = (phone: string): string => {
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

  // National ID validation
  const validateNationalId = (nationalId: string): string => {
    if (!nationalId.trim()) {
      return 'National ID is required';
    }
    if (nationalId.trim().length < 5) {
      return 'National ID must be at least 5 characters';
    }
    return '';
  };

  

  // ✅ NEW: Validate single field for current member
  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'firstName':
        return validateName(value, 'First name');
      case 'lastName':
        return validateName(value, 'Last name');
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'nationalId':
        return validateNationalId(value);
      default:
        return '';
    }
  };

  // ✅ NEW: Handle field blur (when user leaves field)
  const handleFieldBlur = (fieldName: string, value: string) => {
    markFieldTouched(fieldName);
    const error = validateField(fieldName, value);
    setFieldError(fieldName, error);
  };

  // ✅ NEW: Handle field change with optional real-time validation
  const handleFieldChange = (fieldName: string, value: string, realTimeValidation: boolean = false) => {
    // Only handle validation - let the onChange prop handle the form update
    if (isFieldTouched(fieldName) || realTimeValidation) {
      const error = validateField(fieldName, value);
      setFieldError(fieldName, error);
    }
  };

  // FIXED: Calculate expiry date for existing members using smart duration logic
  const calculateExpiryDate = () => {
    if (!lastPaidDate || !selectedPackage) return '';
    
    const startDate = new Date(lastPaidDate);
    const expiryDate = new Date(startDate);
    
    // 🎯 Smart duration calculation
    const durationValue = selectedPackage.duration_value || selectedPackage.duration_months || 1;
    const durationType = selectedPackage.duration_type || 'months';
    
    if (durationType === 'days') {
      expiryDate.setDate(expiryDate.getDate() + durationValue);
    } else if (durationType === 'weeks') {
      expiryDate.setDate(expiryDate.getDate() + (durationValue * 7));
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + durationValue);
    }
    
    return expiryDate.toISOString().split('T')[0];
  };

  // Initialize price when package is selected
  useEffect(() => {
    if (selectedPackage) {
      const totalPrice = selectedPackage.price; // ✅ No multiplication
      setCustomPrice(totalPrice.toString());
    }
  }, [selectedPackage]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}/active`,
        { headers: getAuthHeaders() }
      );
      const result = await response.json();
      if (response.ok) {
        setPackages(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/staff/branch/${branchId}`,
        { headers: getAuthHeaders() }
      );
      const result = await response.json();
      if (response.ok) {
        setStaff(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchExistingMembers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members/branch/${branchId}?limit=100`,
        { headers: getAuthHeaders() }
      );
      const result = await response.json();
      if (response.ok) {
        setExistingMembers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
    }
  };

  const resetForm = () => {
    setCurrentStep('package');
    setSelectedPackage(null);
    setMemberForms([]);
    setCurrentMemberIndex(0);
    setDuration(1);
    setCustomPrice('');
    setPaymentMethod('cash');
    setVerification({ staffId: '', pin: '' });
    setCreatedAccounts([]);
    setExistingMemberSearch('');
    setSelectedExistingMembers([]);
    // Reset new fields
    setIsExistingMember(false);
    setLastPaidDate('');
    setManualPrice('');
    
    // ✅ NEW: Clear validation state
    setFieldErrors({});
    setFieldTouched({});
  };

  // Helper function to get member property safely - ORIGINAL
  const getMemberProperty = (member: Member, property: string): string => {
    return (member as Record<string, any>)[property] || '';
  };

  // Existing member selection functions - ORIGINAL
  const selectExistingMember = (member: Member) => {
    // Check if member is already selected in any form
    const isAlreadySelected = memberForms.some(form => form.id === member.id);
    if (isAlreadySelected) {
      toast({
        title: "Member Already Selected",
        description: `${member.first_name} ${member.last_name} is already selected for another form.`,
        variant: "destructive"
      });
      return;
    }

    const updatedForms = [...memberForms];
    updatedForms[currentMemberIndex] = {
      id: member.id,
      isExisting: true,
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      phone: member.phone,
      address: getMemberProperty(member, 'address'),
      emergencyContact: getMemberProperty(member, 'emergency_contact'),
      emergencyPhone: getMemberProperty(member, 'emergency_phone'),
      nationalId: member.national_id
    };
    
    setMemberForms(updatedForms);
    setSelectedExistingMembers(prev => [...prev, member]);
    setExistingMemberSearch('');
  };

  const removeSelectedMember = (memberId: string) => {
    setSelectedExistingMembers(prev => prev.filter(m => m.id !== memberId));
    
    const updatedForms = [...memberForms];
    const memberIndex = updatedForms.findIndex(form => form.id === memberId);
    if (memberIndex !== -1) {
      updatedForms[memberIndex] = {
        isExisting: false,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        nationalId: ''
      };
      setMemberForms(updatedForms);
    }
  };




  // ✅ NEW: Enhanced form validation summary
  const getValidationSummary = () => {
    const currentMember = memberForms[currentMemberIndex];
    if (!currentMember) return { isValid: true, errors: [] };
    
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'nationalId'];
    const errors: string[] = [];
    
    requiredFields.forEach(field => {
      const value = currentMember[field as keyof MemberFormData]?.toString() || '';
      const error = validateField(field, value);
      if (error) {
        errors.push(error);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Update member form data - ORIGINAL
  const updateMemberForm = (index: number, updates: Partial<MemberFormData>) => {
    console.log('Updating member form:', index, updates);
    setMemberForms(prev => {
      const newForms = prev.map((form, i) => 
        i === index ? { ...form, ...updates } : form
      );
      console.log('Updated forms:', newForms);
      return newForms;
    });
  };

  // NEW: Toggle auto-generate email
  const toggleAutoGenerateEmail = (enabled: boolean) => {
    const currentMember = memberForms[currentMemberIndex];
    if (!currentMember) return;
    
    updateMemberForm(currentMemberIndex, { 
      autoGenerateEmail: enabled,
      email: enabled && currentMember.nationalId 
        ? `${currentMember.nationalId}@gmail.com` 
        : ''
    });
  };

  // Validation functions - ORIGINAL LOGIC
  const validateCurrentMember = (): boolean => {
    const member = memberForms[currentMemberIndex];
    if (!member) return false;
    
    if (member.isExisting) {
      // For existing members, just check that we have basic info (auto-populated)
      return !!(member.firstName && member.lastName && member.email);
    }

    const required = ['firstName', 'lastName', 'email', 'phone', 'nationalId'];
    return required.every(field => member[field as keyof MemberFormData]?.toString().trim() !== '');
  };

  const validateAllMembers = (): boolean => {
    console.log('Validating all members:', memberForms);
    return memberForms.every((member, index) => {
      if (member.isExisting) {
        console.log(`Member ${index + 1}: Existing member - valid`);
        return true;
      }
      const required = ['firstName', 'lastName', 'email', 'phone', 'nationalId'];
      const isValid = required.every(field => {
        const value = member[field as keyof MemberFormData]?.toString().trim();
        const hasValue = value !== '';
        if (!hasValue) {
          console.log(`Member ${index + 1}: Missing ${field}`);
        }
        return hasValue;
      });
      console.log(`Member ${index + 1}: ${isValid ? 'Valid' : 'Invalid'}`);
      return isValid;
    });
  };

  // Enhanced validation for existing member workflow
  const validateSummary = (): boolean => {
    if (isExistingMember) {
      // For existing members: check manual price and last paid date
      const priceValid = parseFloat(manualPrice || '0') >= 0;
      const dateValid = !!lastPaidDate;
      const membersValid = validateAllMembers();
      
      return priceValid && dateValid && membersValid;
    } else {
      // For new members: regular validation
      const priceValid = duration > 0 && parseFloat(customPrice || '0') > 0;
      const paymentValid = (paymentMethod === 'cash' || paymentMethod === 'card');
      const membersValid = validateAllMembers();
      
      console.log('Validation check:', {
        duration,
        customPrice,
        priceValid,
        paymentMethod,
        paymentValid,
        membersValid,
        memberForms: memberForms.length
      });
      
      return priceValid && paymentValid && membersValid;
    }
  };

  // Navigation functions - ORIGINAL
  const handleNext = () => {
    switch (currentStep) {
      case 'package':
        if (selectedPackage) {
          setCurrentStep('members');
        }
        break;
      case 'members':
        if (validateCurrentMember()) {
          if (currentMemberIndex < memberForms.length - 1) {
            setCurrentMemberIndex(prev => prev + 1);
          } else {
            setCurrentStep('summary');
          }
        }
        break;
      case 'summary':
        if (validateSummary()) {
          setCurrentStep('verification');
        }
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'members':
        if (currentMemberIndex > 0) {
          setCurrentMemberIndex(prev => prev - 1);
        } else {
          setCurrentStep('package');
        }
        break;
      case 'summary':
        setCurrentStep('members');
        setCurrentMemberIndex(memberForms.length - 1);
        break;
      case 'verification':
        setCurrentStep('summary');
        break;
    }
  };

  const calculatePrice = () => {
    if (!selectedPackage) return 0;
    // Package price is the TOTAL price for the entire duration
    return selectedPackage.price;
  };

  // Handle price reset to calculated value - ORIGINAL
  const resetPriceToCalculated = () => {
    setCustomPrice(calculatePrice().toString());
  };

  // Submit form - ENHANCED to handle existing member workflow
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const createdMembers = [];
      
      // Create each member individually since backend doesn't have bulk endpoint
      for (let i = 0; i < memberForms.length; i++) {
        const member = memberForms[i];
        
        // Skip if existing member (they're already in the system)
        // Handle existing members differently
        if (member.isExisting && member.lastPaymentDate) {
          // Calculate proper dates from last payment date
          const lastPayment = new Date(member.lastPaymentDate);
          const packageDuration = selectedPackage?.duration_months || duration;
          
          // Calculate expiry date from last payment
          const calculatedExpiry = new Date(lastPayment);
          calculatedExpiry.setMonth(calculatedExpiry.getMonth() + packageDuration);
          
          // Determine status based on expiry
          const now = new Date();
          const memberStatus = calculatedExpiry > now ? 'active' : 'expired';
          
          console.log('📅 Existing member calculation:', {
            lastPaymentDate: member.lastPaymentDate,
            packageDuration,
            calculatedExpiry: calculatedExpiry.toISOString().split('T')[0],
            status: memberStatus
          });

          const memberData = {
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            branchId: branchId,
            packageId: selectedPackage?.id,
            nationalId: member.nationalId,
            startDate: member.lastPaymentDate, // Use last payment as start date
            duration: packageDuration, // Send duration to backend
            // Backend will calculate expiry_date and status
          };

          console.log('Sending existing member data:', memberData);

          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
              },
              body: JSON.stringify(memberData)
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || 'Failed to create existing member');
          }

          const result = await response.json();
          
          const memberWithCredentials = {
            ...result.data,
            accountEmail: member.email,
            accountPassword: member.nationalId,
            fullName: `${result.data.first_name} ${result.data.last_name}`
          };
          
          createdMembers.push(memberWithCredentials);
          continue; // Continue to next member
        }

        // Skip if existing member without lastPaymentDate
        if (member.isExisting) {
          continue;
        }
        
        // Prepare member data based on workflow type
        const memberData = {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          branchId: branchId,
          packageId: selectedPackage?.id,
          staffId: verification.staffId, // Use the verified staff member from the verification step
          staffPin: verification.pin,  
          emergencyContact: member.emergencyContact || '',
          address: member.address || '',
          nationalId: member.nationalId || '',

          // ADD THESE NEW LINES:
          individual_share: selectedPackage ? selectedPackage.price / selectedPackage.max_members : 0,
          total_package_cost: selectedPackage ? selectedPackage.price : 0,
          package_member_count: selectedPackage ? selectedPackage.max_members : 1,
          package_group_id: `${branchId}_${Date.now()}_${selectedPackage?.name.replace(/\s+/g, '_')}`,
          is_primary_member: i === 0, // First member is primary (who pays)

          // Enhanced: Handle existing member specific data
          ...(isExistingMember ? {
            manualPrice: parseFloat(manualPrice),
            lastPaidDate: lastPaidDate,
            expiryDate: calculateExpiryDate(),
            isExistingMember: true
          } : {
            customPrice: parseFloat(customPrice || '0'),
            duration: selectedPackage?.duration_months,
            paymentMethod: paymentMethod
          })
        };

        console.log('🐛 Authenticated Staff:', authenticatedStaff);
        console.log('🐛 Staff ID being sent:', authenticatedStaff?.id);
        console.log('🐛 Staff ID type:', typeof authenticatedStaff?.id);

        console.log('🔍 FULL MEMBER DATA:', JSON.stringify(memberData, null, 2));
        console.log('BranchId type:', typeof branchId, 'value:', branchId);
        console.log('PackageId type:', typeof selectedPackage?.id, 'value:', selectedPackage?.id);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/members`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify(memberData)
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Member creation failed:', errorData);
          console.error('Sent data was:', memberData);
          
          // Show detailed validation errors if available
          if (errorData.details && Array.isArray(errorData.details)) {
            console.error('Validation errors:', errorData.details);
            const errorMessages = errorData.details.map((detail: any) => detail.msg || detail.message).join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
          }
          
          throw new Error(errorData.message || errorData.error || 'Failed to create member');
        }

        const result = await response.json();
        
        // Enhanced: Add account credentials for display
        const memberWithCredentials = {
          ...result.data,
          accountEmail: member.autoGenerateEmail ? `${member.nationalId}@gmail.com` : member.email,
          accountPassword: member.autoGenerateEmail ? member.nationalId : 'user-set-password',
          fullName: `${result.data.first_name} ${result.data.last_name}`,
          isAutoGenerated: member.autoGenerateEmail || false
        };
        
        createdMembers.push(memberWithCredentials);
      }

      setCreatedAccounts(createdMembers);
      setCurrentStep('success');

      toast({
        title: "Success! 🎉",
        description: `${createdMembers.length} member${createdMembers.length > 1 ? 's' : ''} ${createdMembers.length > 1 ? 'have' : 'has'} been successfully ${isExistingMember ? 'transferred' : 'created'}.`,
      });

      onMemberAdded();

    } catch (error) {
      console.error('Error creating members:', error);
      toast({
        title: "Member Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get step info - ENHANCED
  const getStepInfo = () => {
    const steps = ['package', 'members', 'summary', 'verification', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    return {
      current: currentIndex + 1,
      total: steps.length,
      title: {
        package: 'Select Membership Package',
        members: `Member Details ${selectedPackage?.max_members > 1 ? `(${currentMemberIndex + 1} of ${memberForms.length})` : ''}`,
        summary: isExistingMember ? 'Transfer Summary & Dates' : 'Package Summary & Payment',
        verification: 'Staff Verification Required',
        success: `Members Successfully ${isExistingMember ? 'Transferred' : 'Created'}`
      }[currentStep]
    };
  };

  const stepInfo = getStepInfo();

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'package':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <PackageIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Choose a membership package</h3>
              <p className="text-muted-foreground">Select the package that best fits your needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all hover:shadow-md gym-card-gradient ${
                    selectedPackage?.id === pkg.id
                      ? 'ring-2 ring-primary border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                              console.log('📦 Package selected:', pkg.name, 'max_members:', pkg.max_members);
                              setSelectedPackage(pkg);
                              setMemberForms([]); // Clear forms to force refresh
                            }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between text-foreground">
                      {pkg.name}
                      <Badge variant="secondary">
                        {pkg.max_members} member{pkg.max_members > 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-semibold text-foreground">{formatPackagePrice(pkg)}</span>
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
          </div>
        );

      case 'members':
        if (!memberForms.length) {
          return <div className="text-center text-muted-foreground">Loading member forms...</div>;
        }

        const currentMember = memberForms[currentMemberIndex] || {
          isExisting: false,
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          emergencyContact: '',
          emergencyPhone: '',
          nationalId: '',
          autoGenerateEmail: false
        };

        // Filter existing members for search
        const filteredExistingMembers = existingMembers.filter(member => {
          // First filter by search terms
          const matchesSearch = existingMemberSearch === '' || 
            `${member.first_name} ${member.last_name}`.toLowerCase().includes(existingMemberSearch.toLowerCase()) ||
            member.email.toLowerCase().includes(existingMemberSearch.toLowerCase()) ||
            member.national_id.includes(existingMemberSearch);
          
          // Then filter out already selected members
          const isNotSelected = !memberForms.some(form => form.id === member.id);
          
          // Only show expired members (not active)
          const today = new Date();
          const expiryDate = new Date(member.expiry_date);
          const isExpired = expiryDate < today;
          
          return matchesSearch && isNotSelected && isExpired;
        });

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {selectedPackage?.max_members === 1 ? (
                <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              ) : (
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              )}
              <h3 className="text-lg font-semibold text-foreground">
                Member Details {memberForms.length > 1 && `(${currentMemberIndex + 1} of ${memberForms.length})`}
              </h3>
              <p className="text-muted-foreground">Enter member information for {selectedPackage?.name}</p>
            </div>

            {/* Multi-member navigation */}
            {memberForms.length > 1 && (
              <div className="flex justify-center space-x-2 mb-6">
                {memberForms.map((form, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMemberIndex(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors relative ${
                      index === currentMemberIndex
                        ? 'bg-primary text-primary-foreground'
                        : index < currentMemberIndex
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                    {/* Add indicator for existing members */}
                    {form.isExisting && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Existing member selection (if package allows multiple members) */}
            {selectedPackage?.max_members > 1 && !currentMember.isExisting && (
              <Card className="border-blue-500/20 bg-blue-500/10 gym-card-gradient">
                <CardHeader>
                  <CardTitle className="text-base text-blue-800">Add Existing Member (Optional)</CardTitle>
                  <p className="text-sm text-blue-600">Search and select an existing member instead of creating new</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by name, email, or ID..."
                        value={existingMemberSearch}
                        onChange={(e) => setExistingMemberSearch(e.target.value)}
                        className="pl-10 bg-background border-border"
                      />
                    </div>
                    {existingMemberSearch && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setExistingMemberSearch('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {existingMemberSearch && filteredExistingMembers.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredExistingMembers.slice(0, 5).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-800 border border-gray-600 rounded cursor-pointer hover:border-primary/50 hover:bg-gray-700"
                          onClick={() => selectExistingMember(member)}
                        >
                          <div>
                            <div className="font-medium text-foreground">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email} • ID: {member.national_id}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Member information form */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  {currentMember.isExisting ? 'Existing Member Selected' : 'Personal Information'}
                </CardTitle>
                {/* Selected Member Display */}
                {currentMember.isExisting && (
                  <div className="mt-3 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-100 mb-2">
                      <UserCheck className="h-4 w-4" />
                      <span className="font-medium">Selected Member:</span>
                    </div>
                    <div className="text-sm space-y-1 text-gray-200">
                      <p><strong className="text-gray-100">Name:</strong> {currentMember.firstName} {currentMember.lastName}</p>
                      <p><strong className="text-gray-100">Email:</strong> {currentMember.email}</p>
                      <p><strong className="text-gray-100">National ID:</strong> {currentMember.nationalId}</p>
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSelectedMember(currentMember.id!)}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      >
                        Remove & Use New Member
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Enhanced First Name Input */}
                  <ValidatedInput
                    fieldName="firstName"
                    label="First Name"
                    value={currentMember.firstName}
                    onChange={(value) => {
                      updateMemberForm(currentMemberIndex, { firstName: value });
                      handleFieldChange('firstName', value, true);
                    }}
                    onBlur={(value) => handleFieldBlur('firstName', value)}
                    getFieldError={getFieldError}
                    isFieldTouched={isFieldTouched}
                    placeholder="Enter first name"
                    disabled={currentMember.isExisting}
                    required={true}
                  />
                  
                  {/* Enhanced Last Name Input */}
                  <ValidatedInput
                    fieldName="lastName"
                    label="Last Name"
                    value={currentMember.lastName}
                    onChange={(value) => {
                      updateMemberForm(currentMemberIndex, { lastName: value });
                      handleFieldChange('lastName', value, true);
                    }}
                    onBlur={(value) => handleFieldBlur('lastName', value)}
                    getFieldError={getFieldError}
                    isFieldTouched={isFieldTouched}
                    placeholder="Enter last name"
                    disabled={currentMember.isExisting}
                    required={true}
                  />
                </div>

                {/* Enhanced National ID Input */}
                <ValidatedInput
                  fieldName="nationalId"
                  label="National ID"
                  value={currentMember.nationalId}
                  onChange={(value) => {
                    updateMemberForm(currentMemberIndex, { nationalId: value });
                    handleFieldChange('nationalId', value, true);
                  }}
                  onBlur={(value) => handleFieldBlur('nationalId', value)}
                  getFieldError={getFieldError}
                  isFieldTouched={isFieldTouched}
                  placeholder="Enter national ID"
                  disabled={currentMember.isExisting}
                  required={true}
                />

                {/* ADD THIS NEW FIELD */}
                {currentMember.isExisting && (
                  <div className="md:col-span-2 space-y-4">
                    {/* Current Expiry Date (Read-only) */}
                    <div>
                      <Label className="text-foreground">Current Expiry Date</Label>
                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">
                            Expired: {existingMembers.find(m => m.id === currentMember.id)?.expiry_date 
                              ? new Date(existingMembers.find(m => m.id === currentMember.id)!.expiry_date).toLocaleDateString()
                              : 'Unknown'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* New Expiry Date (Calculated) */}
                    {selectedPackage && (
                      <div>
                        <Label className="text-foreground">New Expiry Date</Label>
                        <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">
                              Will expire: {(() => {
                                // For multi-member packages: all members get same dates (synchronized billing)
                                // 🎯 FIXED: Smart duration calculation for existing members
                                const durationValue = selectedPackage.duration_value || selectedPackage.duration_months || duration;
                                const durationType = selectedPackage.duration_type || 'months';
                                
                                if (selectedPackage.max_members > 1) {
                                  const today = new Date();
                                  const expiryDate = new Date(today);
                                  
                                  if (durationType === 'days') {
                                    expiryDate.setDate(expiryDate.getDate() + durationValue);
                                  } else if (durationType === 'weeks') {
                                    expiryDate.setDate(expiryDate.getDate() + (durationValue * 7));
                                  } else {
                                    expiryDate.setMonth(expiryDate.getMonth() + durationValue);
                                  }
                                  
                                  return expiryDate.toLocaleDateString();
                                } else {
                                  // For individual packages: extend from current expiry
                                  const currentExpiry = existingMembers.find(m => m.id === currentMember.id)?.expiry_date;
                                  if (!currentExpiry) return 'Unknown';
                                  const newExpiry = new Date(currentExpiry);
                                  
                                  if (durationType === 'days') {
                                    newExpiry.setDate(newExpiry.getDate() + durationValue);
                                  } else if (durationType === 'weeks') {
                                    newExpiry.setDate(newExpiry.getDate() + (durationValue * 7));
                                  } else {
                                    newExpiry.setMonth(newExpiry.getMonth() + durationValue);
                                  }
                                  
                                  return newExpiry.toLocaleDateString();
                                }
                              })()}
                            </span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            {selectedPackage.max_members > 1 
                              ? `Synchronized billing: All family members start today and expire together`
                              : `Calculated: Current expiry + ${selectedPackage.duration_months || duration} months`
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Enhanced Email Section with Auto-Generate Option */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                    {!currentMember.isExisting && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-email"
                          checked={currentMember.autoGenerateEmail || false}
                          onCheckedChange={toggleAutoGenerateEmail}
                        />
                        <Label htmlFor="auto-email" className="text-sm text-muted-foreground">
                          Auto-generate temp email
                        </Label>
                      </div>
                    )}
                  </div>
                  
                  <ValidatedInput
                    fieldName="email"
                    label=""
                    value={currentMember.email}
                    onChange={(value) => {
                      updateMemberForm(currentMemberIndex, { email: value });
                      handleFieldChange('email', value, true);
                    }}
                    onBlur={(value) => handleFieldBlur('email', value)}
                    getFieldError={getFieldError}
                    isFieldTouched={isFieldTouched}
                    placeholder={currentMember.autoGenerateEmail ? "Will auto-generate as [nationalId]@gmail.com" : "Enter email address"}
                    disabled={currentMember.isExisting || currentMember.autoGenerateEmail}
                    required={true}
                    type="email"
                  />
                  
                  {currentMember.autoGenerateEmail && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <Mail className="h-4 w-4" />
                        <strong>Temporary Account Credentials:</strong>
                      </div>
                      <div className="text-sm text-blue-700 mt-1 space-y-1">
                        <p>Email: {currentMember.nationalId ? `${currentMember.nationalId}@gmail.com` : '[nationalId]@gmail.com'}</p>
                        <p>Password: {currentMember.nationalId || '[nationalId]'}</p>
                        <p className="text-xs">Member can change these after first login.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Phone Input */}
                <ValidatedInput
                  fieldName="phone"
                  label="Phone"
                  value={currentMember.phone}
                  onChange={(value) => {
                    updateMemberForm(currentMemberIndex, { phone: value });
                    handleFieldChange('phone', value, true);
                  }}
                  onBlur={(value) => handleFieldBlur('phone', value)}
                  getFieldError={getFieldError}
                  isFieldTouched={isFieldTouched}
                  placeholder="Enter phone number"
                  disabled={currentMember.isExisting}
                  required={true}
                />
                <div>
                  <Label htmlFor="address" className="text-foreground">Address</Label>
                  <Input
                    id="address"
                    value={currentMember.address}
                    onChange={(e) => updateMemberForm(currentMemberIndex, { address: e.target.value })}
                    placeholder="Enter address (optional)"
                    className="mt-1 bg-background border-border text-foreground"
                    disabled={currentMember.isExisting}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContact" className="text-foreground">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={currentMember.emergencyContact}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyContact: e.target.value })}
                      placeholder="Enter emergency contact name"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone" className="text-foreground">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={currentMember.emergencyPhone}
                      onChange={(e) => updateMemberForm(currentMemberIndex, { emergencyPhone: e.target.value })}
                      placeholder="Enter emergency contact phone"
                      className="mt-1 bg-background border-border text-foreground"
                      disabled={currentMember.isExisting}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'summary':
        const calculatedPrice = calculatePrice();
        const isCustomPrice = parseFloat(customPrice || '0') !== calculatedPrice;
        const expiryDate = calculateExpiryDate();

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                {isExistingMember ? 'Transfer Summary & Dates' : 'Package Summary & Payment'}
              </h3>
              <p className="text-muted-foreground">
                {isExistingMember 
                  ? 'Set transfer details and existing membership dates' 
                  : 'Review your selection and choose payment method'
                }
              </p>
            </div>

            {/* Enhanced: Existing Member Toggle */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">Member Type</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="existing-member"
                      checked={isExistingMember}
                      onCheckedChange={(checked) => {
                        setIsExistingMember(checked);
                        setPaymentMethod(checked ? 'paid' : 'cash');
                        if (checked) {
                          setManualPrice(calculatedPrice.toString());
                        } else {
                          setCustomPrice(calculatedPrice.toString());
                        }
                      }}
                    />
                    <Label htmlFor="existing-member" className="text-foreground">
                      Add Existing Member
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">
                      {isExistingMember ? 'Existing Member Transfer' : 'New Member Registration'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {isExistingMember 
                      ? 'This member is transferring from another gym or has an existing membership. Set their last payment date and amount.'
                      : 'This is a new member joining the gym. Standard pricing and payment flow applies.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Package Summary */}
            <Card className="border-border gym-card-gradient">
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
                    <span className="text-foreground">{selectedPackage ? formatPackagePrice(selectedPackage) : 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="text-foreground">
                      {selectedPackage?.duration_value || selectedPackage?.duration_months || 1} {
                        selectedPackage?.duration_type === 'days' ? 'day' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                        selectedPackage?.duration_type === 'weeks' ? 'week' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                        'month' + ((selectedPackage?.duration_value || selectedPackage?.duration_months || 1) > 1 ? 's' : '')
                      }
                    </span>
                  </div>

                  {isExistingMember ? (
                    // Enhanced: Existing Member Fields
                    <>
                      <Separator className="bg-border" />
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="lastPaidDate" className="text-foreground">Last Paid Date *</Label>
                          <Input
                            id="lastPaidDate"
                            type="date"
                            value={lastPaidDate}
                            onChange={(e) => setLastPaidDate(e.target.value)}
                            className="mt-1 bg-background border-border text-foreground"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="manualPrice" className="text-foreground">Amount Paid *</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="manualPrice"
                              type="number"
                              min="0"
                              step="0.01"
                              value={manualPrice}
                              onChange={(e) => setManualPrice(e.target.value)}
                              placeholder="Enter amount paid"
                              className="mt-1 bg-background border-border text-foreground"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setManualPrice(calculatedPrice.toString())}
                              className="mt-1"
                            >
                              Use Standard
                            </Button>
                          </div>
                        </div>

                        {lastPaidDate && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <Calendar className="h-4 w-4" />
                              <strong>Calculated Expiry Date:</strong>
                            </div>
                            <p className="text-green-700 font-medium">
                              {expiryDate ? new Date(expiryDate).toLocaleDateString() : 'Select last paid date'}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Original: New Member Fields
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-foreground">Duration</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">
                            {selectedPackage?.duration_value || selectedPackage?.duration_months || 1} {
                              selectedPackage?.duration_type === 'days' ? 'day' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                              selectedPackage?.duration_type === 'weeks' ? 'week' + ((selectedPackage?.duration_value || 1) > 1 ? 's' : '') :
                              'month' + ((selectedPackage?.duration_value || selectedPackage?.duration_months || 1) > 1 ? 's' : '')
                            }
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Package Default
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Calculated Total</span>
                        <span className="text-foreground">${calculatedPrice}</span>
                      </div>
                      
                      <div>
                        <Label htmlFor="customPrice" className="text-foreground">Final Price *</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="customPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                            placeholder="Enter final price"
                            className="mt-1 bg-background border-border text-foreground"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetPriceToCalculated}
                            className="mt-1"
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  {isExistingMember ? 'Payment Status' : 'Payment Method'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isExistingMember ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Already Paid</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Member has already paid for this period. No additional payment required.
                    </p>
                  </div>
                ) : (
                  <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'card') => setPaymentMethod(value)}>
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
                )}
              </CardContent>
            </Card>

            {/* Final Summary */}
            <Card className="border-primary/20 bg-primary/10 gym-card-gradient">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">
                    {isExistingMember ? 'Amount Paid' : 'Total Amount'}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    ${isExistingMember ? manualPrice || '0' : customPrice || '0'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {memberForms.length} member{memberForms.length > 1 ? 's' : ''} • 
                  {isExistingMember 
                    ? ` Already paid • Expires ${expiryDate ? new Date(expiryDate).toLocaleDateString() : 'TBD'}`
                    : ` ${selectedPackage?.duration_value || selectedPackage?.duration_months || duration} ${
                        selectedPackage?.duration_type === 'days' ? 'day' + ((selectedPackage?.duration_value || duration) > 1 ? 's' : '') :
                        selectedPackage?.duration_type === 'weeks' ? 'week' + ((selectedPackage?.duration_value || duration) > 1 ? 's' : '') :
                        'month' + ((selectedPackage?.duration_value || selectedPackage?.duration_months || duration) > 1 ? 's' : '')
                      } • ${paymentMethod === 'cash' ? 'Cash' : 'Card'} payment`
                  }
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
                        {isExistingMember ? (
                          <>
                            {parseFloat(manualPrice || '0') < 0 && (
                              <li>• Enter a valid amount paid</li>
                            )}
                            {!lastPaidDate && (
                              <li>• Select the last paid date</li>
                            )}
                          </>
                        ) : (
                          <>
                            {parseFloat(customPrice || '0') <= 0 && (
                              <li>• Enter a valid price amount</li>
                            )}
                            {!paymentMethod && (
                              <li>• Select a payment method</li>
                            )}
                          </>
                        )}
                        {!validateAllMembers() && (
                          <li>• Complete all required member information</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Staff Verification Required</h3>
              <p className="text-muted-foreground">
                Confirm member {isExistingMember ? 'transfer' : 'creation'} and payment processing
              </p>
            </div>

            {/* Transaction Summary */}
            <Card className="border-primary/20 bg-primary/10 gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-primary">
                  {isExistingMember ? 'Transfer Summary' : 'Transaction Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package:</span>
                  <span className="font-medium text-foreground">{selectedPackage?.name}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members ({memberForms.length}):</span>
                  </div>
                  {memberForms.map((member, index) => (
                    <div key={index} className="flex justify-between pl-4">
                      <span className="text-muted-foreground">• {member.firstName} {member.lastName}</span>
                      {member.isExisting && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Existing</span>
                      )}
                    </div>
                  ))}
                </div>
                {isExistingMember ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Paid:</span>
                      <span className="font-medium text-foreground">
                        {lastPaidDate ? new Date(lastPaidDate).toLocaleDateString() : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium text-foreground">
                        {calculateExpiryDate() ? new Date(calculateExpiryDate()).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium text-foreground">${manualPrice || '0'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium text-foreground">
                        {selectedPackage?.duration_value || selectedPackage?.duration_months || duration} {
                          selectedPackage?.duration_type === 'days' ? 'day' + ((selectedPackage?.duration_value || duration) > 1 ? 's' : '') :
                          selectedPackage?.duration_type === 'weeks' ? 'week' + ((selectedPackage?.duration_value || duration) > 1 ? 's' : '') :
                          'month' + ((selectedPackage?.duration_value || selectedPackage?.duration_months || duration) > 1 ? 's' : '')
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <span className="font-medium text-foreground">{paymentMethod === 'cash' ? 'Cash' : 'Card'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium text-foreground">${customPrice || '0'}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Staff PIN Verification - ORIGINAL */}
            <Card className="border-border gym-card-gradient">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Staff Authorization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="staffSelect" className="text-foreground">Authorizing Staff Member</Label>
                  <Select value={verification.staffId} onValueChange={(value) => setVerification(prev => ({ ...prev, staffId: value }))}>
                    <SelectTrigger className="mt-1 bg-background border-border">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="pin" className="text-foreground">Staff PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={4}
                    value={verification.pin}
                    onChange={(e) => setVerification(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Enter 4-digit PIN"
                    className="mt-1 bg-background border-border text-foreground"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold text-foreground">
                {isExistingMember ? 'Members Successfully Transferred!' : 'Members Successfully Created!'}
              </h3>
              <p className="text-muted-foreground">
                {createdAccounts.length} member{createdAccounts.length > 1 ? 's have' : ' has'} been {isExistingMember ? 'transferred' : 'added'} to the system
              </p>
            </div>

            {/* SIMPLE SUCCESS LIST - NEW DESIGN */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Successfully {isExistingMember ? 'Transferred' : 'Created'} Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {createdAccounts.map((account, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">{account.fullName}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button onClick={() => onOpenChange(false)} className="min-w-32">
                Close
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'package': 
        return selectedPackage !== null;
      case 'members': 
        return validateCurrentMember();
      case 'summary': 
        const valid = validateSummary();
        console.log('Can proceed from summary:', valid);
        return valid;
      case 'verification': 
        return verification.staffId && verification.pin;
      default: 
        return false;
    }
  };

  const showBackButton = () => {
    return currentStep !== 'package' && currentStep !== 'success';
  };

  const showNextButton = () => {
    return currentStep !== 'verification' && currentStep !== 'success';
  };

  const showSubmitButton = () => {
    return currentStep === 'verification';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto gym-card-gradient border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isExistingMember ? 'Transfer Existing Member' : 'Add New Member'} - Step {stepInfo.current} of {stepInfo.total}
          </DialogTitle>
          <p className="text-muted-foreground">{stepInfo.title}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          {currentStep !== 'success' && (
            <div className="flex space-x-2">
              {['package', 'members', 'summary', 'verification'].map((step, index) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded ${
                    ['package', 'members', 'summary', 'verification'].indexOf(currentStep) >= index
                      ? 'bg-primary'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons - ORIGINAL LOGIC */}
          {currentStep !== 'success' && (
            <div className="flex justify-between pt-6">
              <div>
                {showBackButton() && (
                  <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {showNextButton() && (
                  <Button 
                    onClick={handleNext} 
                    disabled={!canProceed()}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                
                {showSubmitButton() && (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!canProceed() || loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? 'Processing...' : (isExistingMember ? 'Transfer Member' : 'Create Member')}
                    {!loading && <UserCheck className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};