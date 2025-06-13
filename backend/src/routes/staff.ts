import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';

const router = express.Router();

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

// Verify staff PIN
router.post('/verify-pin', async (req, res) => {
  try {
    const { staffId, pin } = req.body;

    if (!staffId || !pin) {
      return res.status(400).json({
        status: 'error',
        error: 'Staff ID and PIN are required'
      });
    }

    // Call Edge Function for PIN verification
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
  } catch (error) {
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

export { router as staffRoutes };