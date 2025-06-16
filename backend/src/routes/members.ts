import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Debug middleware for this route
router.use((req, res, next) => {
  console.log(`🔧 Members Route: ${req.method} ${req.path}`);
  next();
});

// Get members by branch
router.get('/branch/:branchId', optionalAuth, async (req, res) => {
  try {
    console.log(`📋 Getting members for branch: ${req.params.branchId}`);
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('branch_id', req.params.branchId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} members`);
    
    res.json({ 
      status: 'success', 
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch members',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new member
router.post('/', async (req, res) => {
  try {
    console.log('➕ Creating new member:', req.body);
    
    const { 
      branch_id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      national_id,
      status = 'active',
      package_type = 'individual',
      package_name,
      package_price,
      start_date,
      expiry_date,
      is_verified = false
    } = req.body;

    // Validation
    if (!branch_id || !first_name || !last_name || !email || !phone || !national_id) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: branch_id, first_name, last_name, email, phone, national_id'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({
        status: 'error',
        error: 'Invalid email format'
      });
    }

    // Check if email already exists
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .single();

    if (existingMember) {
      console.log('❌ Email already exists');
      return res.status(409).json({
        status: 'error',
        error: 'Member with this email already exists'
      });
    }

    // Check if national_id already exists
    const { data: existingNationalId } = await supabase
      .from('members')
      .select('id')
      .eq('national_id', national_id)
      .single();

    if (existingNationalId) {
      console.log('❌ National ID already exists');
      return res.status(409).json({
        status: 'error',
        error: 'Member with this national ID already exists'
      });
    }

    // Check if branch exists
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id')
      .eq('id', branch_id)
      .single();

    if (branchError || !branch) {
      console.log('❌ Branch not found');
      return res.status(404).json({
        status: 'error',
        error: 'Branch not found'
      });
    }

    // Create member
    console.log('💾 Inserting member into database...');
    const { data, error } = await supabase
      .from('members')
      .insert({
        branch_id,
        first_name,
        last_name,
        email,
        phone,
        national_id,
        status,
        package_type,
        package_name: package_name || 'Basic Package',
        package_price: package_price || 0,
        start_date: start_date || new Date().toISOString().split('T')[0],
        expiry_date: expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        is_verified,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Failed to create member',
        message: error.message
      });
    }

    console.log('✅ Member created successfully:', data.id);

    res.status(201).json({
      status: 'success',
      data: {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        national_id: data.national_id,
        status: data.status,
        package_type: data.package_type,
        package_name: data.package_name,
        package_price: data.package_price,
        start_date: data.start_date,
        expiry_date: data.expiry_date,
        is_verified: data.is_verified,
        branch_id: data.branch_id,
        created_at: data.created_at
      },
      message: 'Member created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating member:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all members
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('📋 Getting all members');
    
    const { data, error } = await supabase
      .from('members')
      .select('*, branches(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ Found ${data?.length || 0} total members`);
    
    res.json({ 
      status: 'success', 
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching all members:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch members'
    });
  }
});

// Update member
router.put('/:id', authenticate, async (req, res) => {
  try {
    console.log(`🔄 Updating member: ${req.params.id}`);
    
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date().toISOString() };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // Get existing member
    const { data: existingMember, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingMember) {
      return res.status(404).json({
        status: 'error',
        error: 'Member not found'
      });
    }

    // Update member
    const { data, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to update member',
        message: error.message
      });
    }

    console.log('✅ Member updated successfully');

    res.json({
      status: 'success',
      data,
      message: 'Member updated successfully'
    });

  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete member
router.delete('/:id', authenticate, async (req, res) => {
  try {
    console.log(`🗑️ Deleting member: ${req.params.id}`);
    
    const { id } = req.params;

    // Get member to verify existence
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('*, branches(name)')
      .eq('id', id)
      .single();

    if (fetchError || !member) {
      return res.status(404).json({
        status: 'error',
        error: 'Member not found'
      });
    }

    // Delete member
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to delete member',
        message: error.message
      });
    }

    console.log('✅ Member deleted successfully');

    res.json({
      status: 'success',
      message: `Member ${member.first_name} ${member.last_name} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single member
router.get('/:id', authenticate, async (req, res) => {
  try {
    console.log(`👤 Getting member: ${req.params.id}`);
    
    const { id } = req.params;

    const { data, error } = await supabase
      .from('members')
      .select('*, branches(name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        status: 'error',
        error: 'Member not found'
      });
    }

    console.log('✅ Member found');

    res.json({
      status: 'success',
      data
    });

  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search members
router.get('/search/:branchId', optionalAuth, async (req, res) => {
  try {
    const { branchId } = req.params;
    const { q: query } = req.query;
    
    console.log(`🔍 Searching members in branch ${branchId} for: ${query}`);

    if (!query) {
      return res.status(400).json({
        status: 'error',
        error: 'Search query is required'
      });
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('branch_id', branchId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,national_id.ilike.%${query}%`);

    if (error) throw error;

    console.log(`✅ Found ${data?.length || 0} matching members`);

    res.json({
      status: 'success',
      data: data || []
    });

  } catch (error) {
    console.error('Error searching members:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to search members',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

console.log('📋 Members routes loaded successfully');

export { router as memberRoutes };