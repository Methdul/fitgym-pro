import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';
import { staffAuth } from '../middleware/staffAuth';
import { sessionManager } from '../lib/sessionManager';

const router = express.Router();

// Import security utilities if available (graceful fallback)
let hashPin: any = null;
let verifyPin: any = null;
let validatePin: any = null;
let pinAttemptTracker: any = null;

try {
  const securityModule = require('../lib/security');
  hashPin = securityModule.hashPin;
  verifyPin = securityModule.verifyPin;
  validatePin = securityModule.validatePin;
  pinAttemptTracker = securityModule.pinAttemptTracker;
  console.log('✅ Security module loaded - using enhanced PIN security');
} catch (error) {
  console.log('⚠️ Security module not found - using legacy PIN handling');
}

// Helper function to check if new security features are available
const hasSecurityFeatures = () => {
  return hashPin && verifyPin && validatePin && pinAttemptTracker;
};

// Helper function to safely get branch name from Supabase join result
const getBranchName = (branches: any): string | undefined => {
  if (!branches) return undefined;
  if (Array.isArray(branches)) {
    return branches[0]?.name;
  }
  return branches?.name;
};

// Helper function to validate PIN format (basic validation)
const basicPinValidation = (pin: string): { isValid: boolean; error?: string } => {
  if (!pin) {
    return { isValid: false, error: 'PIN is required' };
  }
  
  if (!/^\d{4}$/.test(pin)) {
    return { isValid: false, error: 'PIN must be exactly 4 digits' };
  }
  
  return { isValid: true };
};

// Get staff by branch (public access for PIN auth)
router.get('/branch/:branchId', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branch_staff')
      .select('id, first_name, last_name, role, email, phone, last_active')
      .eq('branch_id', req.params.branchId)
      .order('role');
    
    if (error) throw error;
    
    res.json({ 
      status: 'success', 
      data 
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch staff',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify staff PIN - ENHANCED WITH SESSION TOKEN
router.post('/verify-pin', async (req, res) => {
  try {
    const { staffId, pin } = req.body;

    console.log('🔐 PIN verification request:', { 
      staffId, 
      pinLength: pin?.length,
      hasStaffId: !!staffId,
      hasPin: !!pin 
    });

    if (!staffId || !pin) {
      return res.status(400).json({
        status: 'error',
        error: 'Staff ID and PIN are required'
      });
    }

    // Rate limiting check (if available)
    if (hasSecurityFeatures()) {
      const attemptCheck = pinAttemptTracker.checkAttempts(staffId);
      if (!attemptCheck.allowed) {
        console.log(`🚫 PIN attempt blocked for staff ${staffId} - rate limited`);
        return res.status(429).json({
          status: 'error',
          error: 'Too many failed attempts',
          message: 'Account temporarily locked due to too many failed attempts',
          lockedUntil: attemptCheck.lockedUntil
        });
      }
    }

    // Get staff member
    const { data: staff, error } = await supabase
      .from('branch_staff')
      .select('*')
      .eq('id', staffId)
      .single();

    if (error || !staff) {
      console.log('❌ Staff not found:', { staffId, error });
      if (hasSecurityFeatures()) {
        pinAttemptTracker.recordFailedAttempt(staffId);
      }
      return res.json({
        status: 'success',
        isValid: false,
        staff: null,
        error: 'Staff not found'
      });
    }

    console.log('📋 Staff found:', {
      id: staff.id,
      name: `${staff.first_name} ${staff.last_name}`,
      hasPin: !!staff.pin,
      hasPinHash: !!staff.pin_hash,
      pinStoredType: staff.pin === 'HASHED' ? 'HASHED' : staff.pin ? 'PLAIN' : 'NONE'
    });

    let isValid = false;

    // PIN verification logic
    if (hasSecurityFeatures() && staff.pin_hash) {
      console.log('🔐 Using secure PIN verification (bcrypt)');
      isValid = await verifyPin(pin, staff.pin_hash);
      console.log('🔐 Bcrypt verification result:', isValid);
    } else if (staff.pin && staff.pin !== 'HASHED') {
      console.log('⚠️ Using legacy PIN verification (plain text)');
      console.log('📍 PIN comparison:', {
        enteredPin: pin,
        storedPin: staff.pin,
        exactMatch: staff.pin === pin,
        trimmedMatch: staff.pin?.trim() === pin.trim()
      });
      
      // Try both exact and trimmed comparison
      isValid = staff.pin === pin || staff.pin?.trim() === pin.trim();
    } else {
      console.log('❌ No valid PIN method available');
      isValid = false;
    }

    console.log('✅ Final PIN verification result:', isValid);

    // Handle security tracking
    if (hasSecurityFeatures()) {
      if (isValid) {
        pinAttemptTracker.resetAttempts(staffId);
      } else {
        pinAttemptTracker.recordFailedAttempt(staffId);
      }
    }

    if (isValid) {
      // Update last_active
      await supabase
        .from('branch_staff')
        .update({ last_active: new Date().toISOString() })
        .eq('id', staffId);

      // CREATE SESSION TOKEN
      const sessionToken = sessionManager.createSession(
        staff.id,
        staff.branch_id,
        staff.role
      );

      console.log('🎫 Created session token for staff:', staff.id);

      res.json({
        status: 'success',
        isValid: true,
        staff: {
          id: staff.id,
          first_name: staff.first_name,
          last_name: staff.last_name,
          role: staff.role,
          email: staff.email,
          branch_id: staff.branch_id
        },
        sessionToken, // Return the session token
        error: null
      });
    } else {
      console.log('🔐 Failed PIN attempt for staff:', staffId);
      res.json({
        status: 'success',
        isValid: false,
        staff: null,
        error: 'Invalid PIN'
      });
    }

  } catch (error) {
    console.error('❌ PIN verification error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create staff member - SECURED WITH PIN HASHING
router.post('/', staffAuth, async (req, res) => {
  try {
    console.log('Creating new staff member:', { ...req.body, pin: '[REDACTED]' });
    
    const { branch_id, first_name, last_name, email, phone, role, pin } = req.body;

    // Validation
    if (!branch_id || !first_name || !last_name || !email || !role || !pin) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: branch_id, first_name, last_name, email, role, pin'
      });
    }

    // PIN validation (enhanced if available, basic otherwise)
    let pinValidation: { isValid: boolean; error?: string };
    if (hasSecurityFeatures()) {
      pinValidation = validatePin(pin);
    } else {
      pinValidation = basicPinValidation(pin);
    }

    if (!pinValidation.isValid) {
      return res.status(400).json({
        status: 'error',
        error: pinValidation.error
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid email format'
      });
    }

    // Validate role
    const validRoles = ['manager', 'senior_staff', 'associate'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid role. Must be one of: manager, senior_staff, associate'
      });
    }

    // Check if email already exists in this branch
    const { data: existingStaff } = await supabase
      .from('branch_staff')
      .select('id')
      .eq('branch_id', branch_id)
      .eq('email', email)
      .single();

    if (existingStaff) {
      return res.status(409).json({
        status: 'error',
        error: 'Staff member with this email already exists in this branch'
      });
    }

    // Check if branch exists
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id')
      .eq('id', branch_id)
      .single();

    if (branchError || !branch) {
      return res.status(404).json({
        status: 'error',
        error: 'Branch not found'
      });
    }

    // Prepare insert data
    const insertData: any = {
      branch_id,
      first_name,
      last_name,
      email,
      phone: phone || null,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Use secure PIN hashing if available, otherwise fallback to plain text
    if (hasSecurityFeatures()) {
      console.log('🔐 Using secure PIN hashing for new staff member');
      insertData.pin_hash = await hashPin(pin);
      // Set placeholder in old pin column (for compatibility)
      insertData.pin = 'HASHED';
    } else {
      console.log('⚠️ Security module not available - using plain text PIN (upgrade recommended)');
      insertData.pin = pin;
    }

    // Create staff member
    const { data, error } = await supabase
      .from('branch_staff')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Failed to create staff member',
        message: error.message
      });
    }

    console.log('Staff member created successfully:', data.id);

    res.status(201).json({
      status: 'success',
      data: {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        branch_id: data.branch_id,
        created_at: data.created_at
      },
      message: 'Staff member created successfully'
    });

  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all staff (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    // Don't select PIN or PIN_HASH in the response for security
    const { data, error } = await supabase
      .from('branch_staff')
      .select('id, first_name, last_name, email, phone, role, branch_id, last_active, created_at, updated_at, branches(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Fix TypeScript issue with branches relationship
    const staffData = data?.map(staff => ({
      ...staff,
      branch_name: getBranchName(staff.branches)
    })) || [];
    
    res.json({ 
      status: 'success', 
      data: staffData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch staff'
    });
  }
});

// Update staff member - NOW USES staffAuth
router.put('/:id', staffAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, role, pin } = req.body;

    // Get existing staff member
    const { data: existingStaff, error: fetchError } = await supabase
      .from('branch_staff')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingStaff) {
      return res.status(404).json({
        status: 'error',
        error: 'Staff member not found'
      });
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: 'error',
          error: 'Invalid email format'
        });
      }
      updateData.email = email;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (role) {
      const validRoles = ['manager', 'senior_staff', 'associate'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          status: 'error',
          error: 'Invalid role'
        });
      }
      updateData.role = role;
    }
    
    // Handle PIN update (secure if available, fallback to plain text)
    if (pin) {
      let pinValidation: { isValid: boolean; error?: string };
      if (hasSecurityFeatures()) {
        pinValidation = validatePin(pin);
      } else {
        pinValidation = basicPinValidation(pin);
      }

      if (!pinValidation.isValid) {
        return res.status(400).json({
          status: 'error',
          error: pinValidation.error
        });
      }
      
      if (hasSecurityFeatures()) {
        console.log('🔐 Updating PIN with secure hashing');
        updateData.pin_hash = await hashPin(pin);
        updateData.pin = 'HASHED';
        // Reset security tracking
        pinAttemptTracker.resetAttempts(id);
      } else {
        console.log('⚠️ Updating PIN with plain text (upgrade to security module recommended)');
        updateData.pin = pin;
      }
    }

    // Update staff member
    const { data, error } = await supabase
      .from('branch_staff')
      .update(updateData)
      .eq('id', id)
      .select('id, first_name, last_name, email, phone, role, branch_id, updated_at')
      .single();

    if (error) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to update staff member',
        message: error.message
      });
    }

    res.json({
      status: 'success',
      data,
      message: 'Staff member updated successfully'
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete staff member - NOW USES staffAuth
router.delete('/:id', staffAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Log who is performing the deletion
    if (req.staffSession) {
      console.log(`🗑️ Staff ${req.staffSession.staffId} is deleting staff ${id}`);
    }

    // Get staff member to verify existence
    const { data: staff, error: fetchError } = await supabase
      .from('branch_staff')
      .select('*, branches(name)')
      .eq('id', id)
      .single();

    if (fetchError || !staff) {
      return res.status(404).json({
        status: 'error',
        error: 'Staff member not found'
      });
    }

    // Check if this is the last manager in the branch
    if (staff.role === 'manager') {
      const { data: managers } = await supabase
        .from('branch_staff')
        .select('id')
        .eq('branch_id', staff.branch_id)
        .eq('role', 'manager');

      if (managers && managers.length <= 1) {
        return res.status(400).json({
          status: 'error',
          error: 'Cannot delete the last manager in the branch'
        });
      }
    }

    // Delete staff member
    const { error } = await supabase
      .from('branch_staff')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to delete staff member',
        message: error.message
      });
    }

    // Clean up security tracking if available
    if (hasSecurityFeatures()) {
      pinAttemptTracker.resetAttempts(id);
    }

    console.log(`✅ Staff member deleted: ${staff.first_name} ${staff.last_name}`);

    res.json({
      status: 'success',
      message: `Staff member ${staff.first_name} ${staff.last_name} deleted successfully`
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single staff member (NO PIN DATA EXPOSED)
router.get('/:id', staffAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('branch_staff')
      .select('id, first_name, last_name, email, phone, role, branch_id, last_active, created_at, updated_at, branches(name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        status: 'error',
        error: 'Staff member not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        branch_id: data.branch_id,
        last_active: data.last_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        branch_name: getBranchName(data.branches)
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Migration endpoint for converting existing staff to secure PINs
router.post('/migrate-pin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!hasSecurityFeatures()) {
      return res.status(400).json({
        status: 'error',
        error: 'Security module not available. Please install security dependencies first.'
      });
    }

    if (!pin) {
      return res.status(400).json({
        status: 'error',
        error: 'PIN is required for migration'
      });
    }

    // Validate PIN
    const pinValidation = validatePin(pin);
    if (!pinValidation.isValid) {
      return res.status(400).json({
        status: 'error',
        error: pinValidation.error
      });
    }

    // Get existing staff member
    const { data: staff, error: fetchError } = await supabase
      .from('branch_staff')
      .select('id, first_name, last_name, pin, pin_hash')
      .eq('id', id)
      .single();

    if (fetchError || !staff) {
      return res.status(404).json({
        status: 'error',
        error: 'Staff member not found'
      });
    }

    // Hash the new PIN
    const pinHash = await hashPin(pin);

    // Update with hashed PIN and set placeholder
    const { error: updateError } = await supabase
      .from('branch_staff')
      .update({
        pin_hash: pinHash,
        pin: 'HASHED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to migrate PIN',
        message: updateError.message
      });
    }

    console.log(`🔄 PIN migrated to secure hash for staff: ${staff.first_name} ${staff.last_name}`);

    res.json({
      status: 'success',
      message: 'PIN successfully migrated to secure hash'
    });

  } catch (error) {
    console.error('PIN migration error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as staffRoutes };