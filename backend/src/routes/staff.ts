import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Get staff by branch (public access for PIN auth) - EXISTING
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

// Verify staff PIN - EXISTING WITH ENHANCEMENT
router.post('/verify-pin', async (req, res) => {
  try {
    const { staffId, pin } = req.body;

    if (!staffId || !pin) {
      return res.status(400).json({
        status: 'error',
        error: 'Staff ID and PIN are required'
      });
    }

    // Call Edge Function for PIN verification OR direct database check
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/staff-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ staffId, pin, action: 'verify' })
      });

      const result = await response.json() as any;

      res.json({
        status: 'success',
        isValid: result.isValid,
        staff: result.staff,
        error: result.error
      });
    } catch (edgeFunctionError) {
      // Fallback to direct database check if Edge Function fails
      console.log('Edge Function failed, using direct database check');
      
      const { data: staff, error } = await supabase
        .from('branch_staff')
        .select('*')
        .eq('id', staffId)
        .single();

      if (error || !staff) {
        return res.json({
          status: 'success',
          isValid: false,
          staff: null,
          error: 'Staff not found'
        });
      }

      const isValid = staff.pin === pin;

      if (isValid) {
        // Update last_active
        await supabase
          .from('branch_staff')
          .update({ last_active: new Date().toISOString() })
          .eq('id', staffId);
      }

      res.json({
        status: 'success',
        isValid,
        staff: isValid ? {
          id: staff.id,
          first_name: staff.first_name,
          last_name: staff.last_name,
          role: staff.role,
          email: staff.email,
          branch_id: staff.branch_id
        } : null,
        error: isValid ? null : 'Invalid PIN'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// NEW: Create staff member - THIS WAS MISSING
router.post('/', async (req, res) => {
  try {
    console.log('Creating new staff member:', req.body);
    
    const { branch_id, first_name, last_name, email, phone, role, pin } = req.body;

    // Validation
    if (!branch_id || !first_name || !last_name || !email || !role || !pin) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: branch_id, first_name, last_name, email, role, pin'
      });
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        status: 'error',
        error: 'PIN must be exactly 4 digits'
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

    // Create staff member
    const { data, error } = await supabase
      .from('branch_staff')
      .insert({
        branch_id,
        first_name,
        last_name,
        email,
        phone: phone || null,
        role,
        pin,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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

// Get all staff (admin only) - EXISTING
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branch_staff')
      .select('*, branches(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ 
      status: 'success', 
      data 
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch staff'
    });
  }
});

// NEW: Update staff member
router.put('/:id', authenticate, async (req, res) => {
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
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          status: 'error',
          error: 'PIN must be exactly 4 digits'
        });
      }
      updateData.pin = pin;
    }

    // Update staff member
    const { data, error } = await supabase
      .from('branch_staff')
      .update(updateData)
      .eq('id', id)
      .select()
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
      data: {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        branch_id: data.branch_id,
        updated_at: data.updated_at
      },
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

// NEW: Delete staff member
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

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

// NEW: Get single staff member
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('branch_staff')
      .select('*, branches(name)')
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
        branch_name: data.branches?.name
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

export { router as staffRoutes };