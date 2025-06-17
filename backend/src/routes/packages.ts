import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Debug middleware for this route
router.use((req, res, next) => {
  console.log(`🔧 Packages Route: ${req.method} ${req.path}`);
  next();
});

// Get packages by branch (for staff dashboard)
router.get('/branch/:branchId', optionalAuth, async (req, res) => {
  try {
    console.log(`📦 Getting packages for branch: ${req.params.branchId}`);
    
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('branch_id', req.params.branchId)
      .order('max_members', { ascending: true });
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} packages for branch`);
    
    res.json({ 
      status: 'success', 
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching branch packages:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch branch packages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all active packages for a branch (public access)
router.get('/branch/:branchId/active', optionalAuth, async (req, res) => {
  try {
    console.log(`📦 Getting active packages for branch: ${req.params.branchId}`);
    
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('branch_id', req.params.branchId)
      .eq('is_active', true)
      .order('max_members', { ascending: true });
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} active packages for branch`);
    
    res.json({ 
      status: 'success', 
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching active branch packages:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch active branch packages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all active packages (admin only)
router.get('/active', authenticate, async (req, res) => {
  try {
    console.log('📦 Getting all active packages (admin)');
    
    const { data, error } = await supabase
      .from('packages')
      .select('*, branches(name)')
      .eq('is_active', true)
      .order('max_members', { ascending: true });
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} active packages across all branches`);
    
    res.json({ 
      status: 'success', 
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching all active packages:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch active packages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all packages (admin access)
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('📦 Getting all packages (admin)');
    
    const { data, error } = await supabase
      .from('packages')
      .select('*, branches(name)')
      .order('max_members', { ascending: true });
    
    if (error) throw error;
    
    console.log(`✅ Found ${data?.length || 0} total packages across all branches`);
    
    res.json({ 
      status: 'success', 
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching all packages:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch packages'
    });
  }
});

// Get single package
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    console.log(`📦 Getting package: ${req.params.id}`);
    
    const { id } = req.params;

    const { data, error } = await supabase
      .from('packages')
      .select('*, branches(name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        status: 'error',
        error: 'Package not found'
      });
    }

    console.log('✅ Package found');

    res.json({
      status: 'success',
      data
    });

  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new package (with improved error handling)
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('➕ Creating new package with data:', req.body);
    
    const { branch_id, name, type, price, duration_months, max_members, features, is_active = true } = req.body;

    // Basic validation with detailed logging
    if (!branch_id) {
      console.log('❌ Missing branch_id');
      return res.status(400).json({
        status: 'error',
        error: 'Missing branch_id'
      });
    }

    if (!name) {
      console.log('❌ Missing name');
      return res.status(400).json({
        status: 'error',
        error: 'Missing package name'
      });
    }

    if (!type) {
      console.log('❌ Missing type');
      return res.status(400).json({
        status: 'error',
        error: 'Missing package type'
      });
    }

    if (price === undefined || price === null) {
      console.log('❌ Missing price');
      return res.status(400).json({
        status: 'error',
        error: 'Missing price'
      });
    }

    if (!duration_months) {
      console.log('❌ Missing duration_months');
      return res.status(400).json({
        status: 'error',
        error: 'Missing duration_months'
      });
    }

    // Handle max_members with default fallback
    let maxMembersValue = 1; // Default value
    if (max_members !== undefined && max_members !== null && max_members !== '') {
      maxMembersValue = parseInt(max_members);
      if (isNaN(maxMembersValue) || maxMembersValue < 1 || maxMembersValue > 10) {
        console.log('❌ Invalid max_members value:', max_members);
        return res.status(400).json({
          status: 'error',
          error: 'Max members must be between 1 and 10'
        });
      }
    }

    // Set default max_members based on type if not provided
    if (!max_members || max_members === '') {
      switch (type) {
        case 'individual': maxMembersValue = 1; break;
        case 'couple': maxMembersValue = 2; break;
        case 'family': maxMembersValue = 4; break;
        default: maxMembersValue = 1; break;
      }
    }

    console.log('🔧 Processing with max_members:', maxMembersValue);

    // Validate type
    const validTypes = ['individual', 'couple', 'family'];
    if (!validTypes.includes(type)) {
      console.log('❌ Invalid package type:', type);
      return res.status(400).json({
        status: 'error',
        error: 'Invalid package type. Must be individual, couple, or family'
      });
    }

    // Convert and validate price
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      console.log('❌ Invalid price value:', price);
      return res.status(400).json({
        status: 'error',
        error: 'Price must be 0 or greater'
      });
    }

    // Convert and validate duration
    const durationNum = parseInt(duration_months);
    if (isNaN(durationNum) || durationNum < 1) {
      console.log('❌ Invalid duration value:', duration_months);
      return res.status(400).json({
        status: 'error',
        error: 'Duration must be at least 1 month'
      });
    }

    // Check if branch exists
    console.log('🔍 Checking if branch exists:', branch_id);
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id')
      .eq('id', branch_id)
      .single();

    if (branchError || !branch) {
      console.log('❌ Branch not found or error:', branchError);
      return res.status(404).json({
        status: 'error',
        error: 'Branch not found'
      });
    }

    // Prepare package data
    const packageData = {
      branch_id,
      name: name.trim(),
      type,
      price: priceNum,
      duration_months: durationNum,
      max_members: maxMembersValue,
      features: Array.isArray(features) ? features : ['Gym Access', 'Locker Room'],
      is_active: Boolean(is_active),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Inserting package with data:', packageData);

    // Create package
    const { data, error } = await supabase
      .from('packages')
      .insert(packageData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error details:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Failed to create package',
        message: error.message,
        details: error.details || 'No additional details'
      });
    }

    console.log('✅ Package created successfully:', data.id);

    res.status(201).json({
      status: 'success',
      data,
      message: 'Package created successfully'
    });

  } catch (error) {
    console.error('❌ Unexpected error creating package:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : '') : undefined
    });
  }
});

// Update package
router.put('/:id', authenticate, async (req, res) => {
  try {
    console.log(`🔄 Updating package: ${req.params.id}`);
    
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date().toISOString() };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // Validate max_members if provided
    if (updateData.max_members !== undefined) {
      const maxMembersNum = parseInt(updateData.max_members);
      if (isNaN(maxMembersNum) || maxMembersNum < 1 || maxMembersNum > 10) {
        return res.status(400).json({
          status: 'error',
          error: 'Max members must be between 1 and 10'
        });
      }
      updateData.max_members = maxMembersNum;
    }

    // Validate price if provided
    if (updateData.price !== undefined) {
      const priceNum = parseFloat(updateData.price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({
          status: 'error',
          error: 'Price must be 0 or greater'
        });
      }
      updateData.price = priceNum;
    }

    // Validate duration if provided
    if (updateData.duration_months !== undefined) {
      const durationNum = parseInt(updateData.duration_months);
      if (isNaN(durationNum) || durationNum < 1) {
        return res.status(400).json({
          status: 'error',
          error: 'Duration must be at least 1 month'
        });
      }
      updateData.duration_months = durationNum;
    }

    // Get existing package
    const { data: existingPackage, error: fetchError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPackage) {
      return res.status(404).json({
        status: 'error',
        error: 'Package not found'
      });
    }

    // Update package
    const { data, error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Failed to update package',
        message: error.message
      });
    }

    console.log('✅ Package updated successfully');

    res.json({
      status: 'success',
      data,
      message: 'Package updated successfully'
    });

  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete package
router.delete('/:id', authenticate, async (req, res) => {
  try {
    console.log(`🗑️ Deleting package: ${req.params.id}`);
    
    const { id } = req.params;

    // Get package to verify existence
    const { data: packageData, error: fetchError } = await supabase
      .from('packages')
      .select('*, branches(name)')
      .eq('id', id)
      .single();

    if (fetchError || !packageData) {
      return res.status(404).json({
        status: 'error',
        error: 'Package not found'
      });
    }

    // Delete package
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Failed to delete package',
        message: error.message
      });
    }

    console.log('✅ Package deleted successfully');

    res.json({
      status: 'success',
      message: `Package ${packageData.name} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

console.log('📦 Package routes loaded successfully');

export { router as packageRoutes };