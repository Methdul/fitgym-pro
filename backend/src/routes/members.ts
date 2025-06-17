import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Debug middleware for this route
router.use((req, res, next) => {
  console.log(`🔧 Members Route: ${req.method} ${req.path}`);
  next();
});

// Helper function to generate email for existing members
const generateMemberEmail = (nationalId: string) => {
  return `${nationalId}@gmail.com`;
};

// Helper function to create user account with rollback support
const createUserAccount = async (email: string, password: string, userData: any) => {
  console.log('🔐 Creating Supabase auth account for:', email);
  
  try {
    // Step 1: Create Supabase Auth user - ALLOW UNVERIFIED LOGIN
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm in Supabase Auth so they can login
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: 'member'
      }
    });

    if (authError || !authData.user) {
      console.error('❌ Auth account creation failed:', authError);
      throw new Error(`Auth account creation failed: ${authError?.message || 'Unknown error'}`);
    }

    console.log('✅ Supabase auth account created:', authData.user.id);

    // Step 2: Create user profile record with is_verified: false
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: 'member',
        is_verified: false, // CUSTOM VERIFICATION FLAG
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile creation failed:', profileError);
      
      // Rollback: Delete the auth user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log('🔄 Rolled back auth user creation');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      
      throw new Error(`User profile creation failed: ${profileError?.message || 'Unknown error'}`);
    }

    console.log('✅ User profile created:', userProfile.id);

    return {
      authUser: authData.user,
      userProfile,
      credentials: {
        email,
        temporaryPassword: password
      }
    };

  } catch (error) {
    console.error('❌ User account creation failed:', error);
    throw error;
  }
};

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

// Create new member with automatic account creation
router.post('/', async (req, res) => {
  try {
    console.log('➕ Creating new member with account:', req.body);
    
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
      is_verified = false,
      is_existing_member = false // New flag to distinguish member types
    } = req.body;

    // Validation
    if (!branch_id || !first_name || !last_name || !phone || !national_id) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: branch_id, first_name, last_name, phone, national_id'
      });
    }

    // Determine email and account type
    let accountEmail = email;
    let accountType = 'new_member';
    
    if (is_existing_member || !email) {
      // For existing members, generate simple email using National ID
      accountEmail = generateMemberEmail(national_id);
      accountType = 'existing_member';
      console.log('🏢 Generated email for existing member:', accountEmail);
    } else {
      // For new members, validate provided email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Invalid email format');
        return res.status(400).json({
          status: 'error',
          error: 'Invalid email format'
        });
      }
      console.log('📧 Using provided email for new member:', accountEmail);
    }

    // Check if national_id already exists FIRST (more specific error)
    const { data: existingNationalId } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, status')
      .eq('national_id', national_id)
      .single();

    if (existingNationalId) {
      console.log('❌ National ID already exists:', existingNationalId);
      return res.status(409).json({
        status: 'error',
        error: 'Member with this National ID already exists',
        details: {
          existingMember: {
            name: `${existingNationalId.first_name} ${existingNationalId.last_name}`,
            email: existingNationalId.email,
            status: existingNationalId.status
          },
          suggestion: 'This person already has an account. Use "Update Member" instead or check if this is a different person.'
        }
      });
    }

    // Check if email already exists in auth system (for edge cases)
    const { data: existingUser } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('email', accountEmail)
      .single();

    if (existingUser) {
      console.log('❌ Email already exists in system:', existingUser);
      return res.status(409).json({
        status: 'error',
        error: 'An account with this email already exists',
        details: {
          existingUser: {
            name: `${existingUser.first_name} ${existingUser.last_name}`,
            email: existingUser.email
          },
          suggestion: accountType === 'existing_member' 
            ? 'This National ID is already in use. Each person can only have one account.'
            : 'This email is already registered. Please use a different email address.'
        }
      });
    }

    // Check if branch exists
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', branch_id)
      .single();

    if (branchError || !branch) {
      console.log('❌ Branch not found');
      return res.status(404).json({
        status: 'error',
        error: 'Branch not found'
      });
    }

    // Create user account (Auth + Profile)
    console.log('🔐 Creating user account...');
    const userAccountData = await createUserAccount(
      accountEmail,
      national_id, // Use national_id as temporary password
      {
        first_name,
        last_name,
        account_type: accountType
      }
    );

    // Create member record
    console.log('💾 Creating member record...');
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert({
        user_id: userAccountData.userProfile.id, // Link to user profile
        branch_id,
        first_name,
        last_name,
        email: accountEmail, // Store the email we used for the account
        phone,
        national_id,
        status,
        package_type,
        package_name: package_name || 'Basic Package',
        package_price: package_price || 0,
        start_date: start_date || new Date().toISOString().split('T')[0],
        expiry_date: expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_verified,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (memberError) {
      console.error('❌ Member creation failed, rolling back user account:', memberError);
      
      // Rollback: Delete user profile and auth user
      try {
        await supabase.from('users').delete().eq('id', userAccountData.userProfile.id);
        await supabase.auth.admin.deleteUser(userAccountData.authUser.id);
        console.log('🔄 Successfully rolled back user account');
      } catch (rollbackError) {
        console.error('❌ Critical: Rollback failed:', rollbackError);
      }
      
      return res.status(500).json({
        status: 'error',
        error: 'Failed to create member',
        message: memberError.message
      });
    }

    console.log('✅ Member created successfully:', memberData.id);

    // Prepare response
    const response = {
      status: 'success',
      data: {
        member: {
          id: memberData.id,
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          email: memberData.email,
          phone: memberData.phone,
          national_id: memberData.national_id,
          status: memberData.status,
          package_type: memberData.package_type,
          package_name: memberData.package_name,
          package_price: memberData.package_price,
          start_date: memberData.start_date,
          expiry_date: memberData.expiry_date,
          is_verified: memberData.is_verified,
          branch_id: memberData.branch_id,
          created_at: memberData.created_at
        },
        account: {
          email: userAccountData.credentials.email,
          temporaryPassword: userAccountData.credentials.temporaryPassword,
          accountType: accountType,
          authUserId: userAccountData.authUser.id,
          needsEmailVerification: true, // All new accounts need verification
          needsPasswordChange: true // All members should change from national_id password
        },
        branch: {
          id: branch.id,
          name: branch.name
        }
      },
      message: `Member created successfully with ${accountType === 'existing_member' ? 'generated' : 'provided'} email account`
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('❌ Error creating member:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ... rest of the routes remain the same as previous version ...
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