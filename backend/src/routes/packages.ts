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
      .order('price');
    
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
      .order('price');
    
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

// Get all active packages (public access) - ADMIN ONLY NOW
router.get('/active', authenticate, async (req, res) => {
  try {
    console.log('📦 Getting all active packages (admin)');
    
    const { data, error } = await supabase
      .from('packages')
      .select('*, branches(name)')
      .eq('is_active', true)
      .order('price');
    
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
      .order('price');
    
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

// Create new package (with branch_id)
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('➕ Creating new package:', req.body);
    
    const { branch_id, name, type, price, duration_months, features, is_active = true } = req.body;

    // Validation
    if (!branch_id || !name || !type || price === undefined || !duration_months) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: branch_id, name, type, price, duration_months'
      });
    }

    // Validate type
    const validTypes = ['individual', 'couple'];
    if (!validTypes.includes(type)) {
      console.log('❌ Invalid package type');
      return res.status(400).json({
        status: 'error',
        error: 'Invalid package type. Must be individual or couple'
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

    // Create package
    console.log('💾 Inserting package into database...');
    const { data, error } = await supabase
      .from('packages')
      .insert({
        branch_id,
        name,
        type,
        price: parseFloat(price),
        duration_months: parseInt(duration_months),
        features: features || [],
        is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        status: 'error',
        error: 'Failed to create package',
        message: error.message
      });
    }

    console.log('✅ Package created successfully:', data.id);

    res.status(201).json({
      status: 'success',
      data,
      message: 'Package created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating package:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
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