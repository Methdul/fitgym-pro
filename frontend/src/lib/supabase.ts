import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION - UNCHANGED FROM YOUR VERSION
// =============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rjznvhjitbbvitnvdgfo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqem52aGppdGJidml0bnZkZ2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3Mzg3MDQsImV4cCI6MjA1MjMxNDcwNH0.example-anon-key';

if (import.meta.env.PROD && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    'Missing Supabase environment variables. Using fallback values for development.\n' +
    'For production, please set:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================================================
// SESSION MANAGEMENT - ENHANCED VERSION FROM YOUR CODE
// =============================================================================

let staffSessionToken: string | null = null;

export const setStaffSessionToken = (token: string | null) => {
  staffSessionToken = token;
  if (token) {
    localStorage.setItem('staff_session_token', token);
    const expiry = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem('staff_session_expiry', expiry.toString());
    console.log('✅ Session token stored with expiry:', new Date(expiry));
  } else {
    localStorage.removeItem('staff_session_token');
    localStorage.removeItem('staff_session_expiry');
    console.log('🗑️ Session token cleared');
  }
};

export const getStaffSessionToken = () => {
  if (!staffSessionToken) {
    const storedToken = localStorage.getItem('staff_session_token');
    const storedExpiry = localStorage.getItem('staff_session_expiry');
    
    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry);
      if (Date.now() < expiryTime) {
        staffSessionToken = storedToken;
        console.log('📱 Retrieved valid session token from storage');
      } else {
        console.log('⏰ Session token expired, clearing...');
        localStorage.removeItem('staff_session_token');
        localStorage.removeItem('staff_session_expiry');
        staffSessionToken = null;
      }
    }
  }
  return staffSessionToken;
};

export const isAuthenticated = (): boolean => {
  const sessionToken = getStaffSessionToken();
  const branchSession = localStorage.getItem('branch_session');
  
  if (sessionToken) {
    console.log('✅ Authenticated via session token');
    return true;
  }
  
  if (branchSession) {
    try {
      const sessionData = JSON.parse(branchSession);
      if (sessionData.sessionToken && sessionData.userType === 'branch_staff') {
        console.log('✅ Authenticated via branch session');
        return true;
      }
    } catch (error) {
      console.error('❌ Invalid branch session data');
    }
  }
  
  console.log('❌ No valid authentication found');
  return false;
};

export const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 1. Try to get staff session token first (highest priority)
  const sessionToken = getStaffSessionToken();
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
    headers['X-Session-Token'] = sessionToken;
    console.log('🔐 Using staff session token for auth');
    return headers;
  }

  // 2. Try to get branch session from localStorage
  const branchSession = localStorage.getItem('branch_session');
  if (branchSession) {
    try {
      const sessionData = JSON.parse(branchSession);
      if (sessionData.sessionToken) {
        headers['Authorization'] = `Bearer ${sessionData.sessionToken}`;
        headers['X-Session-Token'] = sessionData.sessionToken;
        headers['X-Branch-Auth'] = 'true';
        headers['X-Branch-ID'] = sessionData.branchId;
        console.log('🏢 Using branch session token for auth');
        return headers;
      }
    } catch (error) {
      console.error('Error parsing branch session:', error);
    }
  }

  // 3. Try to get JWT token (fallback)
  const authToken = localStorage.getItem('access_token');
  if (authToken) {
    try {
      const tokenData = JSON.parse(authToken);
      if (tokenData.access_token) {
        headers['Authorization'] = `Bearer ${tokenData.access_token}`;
      }
    } catch {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    console.log('🎫 Using JWT token for auth');
    return headers;
  }

  console.warn('⚠️ No authentication token found');
  return headers;
};

// =============================================================================
// AUTH HELPERS - COMPLETE VERSION FROM YOUR CODE
// =============================================================================

export const auth = {
  // Sign in with email/password
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  },

  // Sign up with custom user data
  signUp: async (email: string, password: string, userData: any = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  },

  // Sign out
  signOut: async () => {
    try {
      // Clear session token
      setStaffSessionToken(null);
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  },

  // Get current user - RESTORED
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error };
    } catch (error) {
      console.error('Get user error:', error);
      return { user: null, error };
    }
  },

  // Reset password - RESTORED
  resetPassword: async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { data, error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { data: null, error };
    }
  },

  // Update user email - RESTORED
  updateEmail: async (newEmail: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });
      return { data, error };
    } catch (error) {
      console.error('Update email error:', error);
      return { data: null, error };
    }
  },

  // Update user profile data - RESTORED
  updateProfile: async (updates: any) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      return { data, error };
    } catch (error) {
      console.error('Update profile error:', error);
      return { data: null, error };
    }
  },

  // Check if email confirmation is required - RESTORED
  checkEmailConfirmation: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      return {
        isConfirmed: user?.email_confirmed_at ? true : false,
        email: user?.email,
        confirmationSentAt: user?.confirmation_sent_at
      };
    } catch (error) {
      console.error('Check email confirmation error:', error);
      return { isConfirmed: false, email: null, confirmationSentAt: null };
    }
  },

  // Resend email confirmation - RESTORED
  resendEmailConfirmation: async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: (await supabase.auth.getUser()).data.user?.email || ''
      });
      return { error };
    } catch (error) {
      console.error('Resend confirmation error:', error);
      return { error };
    }
  },
};

// =============================================================================
// DATABASE HELPERS - COMPLETE VERSION WITH BACKEND API INTEGRATION
// =============================================================================

export const db = {
  // Staff operations - BACKEND API INTEGRATION + RESTORED FUNCTIONS
  staff: {
    getByBranch: async (branchId: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        console.log('🔍 Using API URL for staff:', API_BASE_URL);
        
        const response = await fetch(`${API_BASE_URL}/staff/branch/${branchId}`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch staff');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching staff:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },
    
    verifyPin: async (staffId: string, pin: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/staff/verify-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ staffId, pin }),
        });

        const result = await response.json();

        if (!response.ok) {
          return { isValid: false, staff: null, error: result.error || 'Verification failed' };
        }

        // Store session token if provided
        if (result.sessionToken) {
          setStaffSessionToken(result.sessionToken);
          console.log('🎫 Stored session token');
        }

        return {
          isValid: result.isValid || false,
          staff: result.staff || null,
          error: result.error || null,
        };
      } catch (error) {
        console.error('PIN verification error:', error);
        return { isValid: false, staff: null, error: 'Verification failed' };
      }
    },

    // RESTORED - Staff getAll function
    getAll: async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/staff`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch all staff');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching all staff:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    create: async (staff: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        console.log('🔧 Creating staff via API:', API_BASE_URL);
        
        const response = await fetch(`${API_BASE_URL}/staff`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(staff),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create staff member');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error creating staff:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    update: async (id: string, updates: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update staff member');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error updating staff:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    delete: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete staff member');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error deleting staff:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    getById: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch staff member');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching staff member:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },
  },

  // Branches - UNCHANGED
  branches: {
    getAll: () => supabase.from('branches').select('*').order('name'),
    getById: (id: string) => supabase.from('branches').select('*').eq('id', id).single(),
    create: (branch: any) => supabase.from('branches').insert(branch).select().single(),
    update: (id: string, updates: any) => supabase.from('branches').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('branches').delete().eq('id', id),
  },

  // Members - BACKEND API INTEGRATION (UPDATED)
  members: {
    getByBranch: async (branchId: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members/branch/${branchId}`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch members');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching members:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    getByUserId: async (userId: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch members');
        }
        
        // Filter by user_id on frontend since we don't have a specific endpoint
        const member = result.data?.find((m: any) => m.user_id === userId);
        return { data: member || null, error: null };
      } catch (error) {
        console.error('Error fetching member by user ID:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    getById: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members/${id}`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch member');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching member:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    create: async (member: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        console.log('🔧 Creating member via API:', API_BASE_URL);
        
        const response = await fetch(`${API_BASE_URL}/members`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(member),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create member');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error creating member:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    update: async (id: string, updates: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update member');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error updating member:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    delete: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete member');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error deleting member:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    search: async (branchId: string, query: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members/search/${branchId}?q=${encodeURIComponent(query)}`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to search members');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error searching members:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    getAll: async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch all members');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching all members:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },
  },

  // Packages - BACKEND API INTEGRATION (UPDATED)
  packages: {
    // NEW: Get active packages for a specific branch
    getActiveByBranch: async (branchId: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/branch/${branchId}/active`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch active packages');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching active packages:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    // NEW: Get all packages for a specific branch
    getByBranch: async (branchId: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/branch/${branchId}`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch packages');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching packages:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    // KEEP: Get single package by ID (unchanged)
    getById: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch package');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching package:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    // KEEP: Create package (unchanged)
    create: async (pkg: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(pkg),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create package');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error creating package:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    // KEEP: Update package (unchanged)
    update: async (id: string, updates: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update package');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error updating package:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },

    // KEEP: Delete package (unchanged)
    delete: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete package');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error deleting package:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },
  },

  // RESTORED - Partnerships table (unchanged from your version)
  partnerships: {
    getAll: () => supabase.from('partnerships').select('*').order('name'),
    getActive: () => supabase.from('partnerships').select('*').eq('is_active', true).order('name'),
    getById: (id: string) => supabase.from('partnerships').select('*').eq('id', id).single(),
    create: (partnership: any) => supabase.from('partnerships').insert(partnership).select().single(),
    update: (id: string, updates: any) => supabase.from('partnerships').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('partnerships').delete().eq('id', id),
  },

  // RESTORED - Gym Staff table (unchanged from your version)
  gymStaff: {
    getDisplayed: () => supabase.from('gym_staff').select('*').eq('is_displayed', true).order('name'),
    getAll: () => supabase.from('gym_staff').select('*').order('name'),
    getById: (id: string) => supabase.from('gym_staff').select('*').eq('id', id).single(),
    create: (staff: any) => supabase.from('gym_staff').insert(staff).select().single(),
    update: (id: string, updates: any) => supabase.from('gym_staff').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('gym_staff').delete().eq('id', id),
  },

  // Check-ins - UNCHANGED
  checkIns: {
    getByMemberId: (memberId: string) => 
      supabase.from('member_check_ins').select('*, branches(name)').eq('member_id', memberId).order('check_in_date', { ascending: false }),
    create: (checkIn: any) => supabase.from('member_check_ins').insert(checkIn).select().single(),
    getByBranch: (branchId: string) => 
      supabase.from('member_check_ins').select('*, members(first_name, last_name)').eq('branch_id', branchId).order('check_in_date', { ascending: false }),
    getTodayByBranch: (branchId: string) => 
      supabase.from('member_check_ins')
        .select('*, members(first_name, last_name)')
        .eq('branch_id', branchId)
        .eq('check_in_date', new Date().toISOString().split('T')[0])
        .order('check_in_time', { ascending: false }),
    getAll: () => supabase.from('member_check_ins').select('*, branches(name), members(first_name, last_name)').order('created_at', { ascending: false }),
  },

  // Renewals - BACKEND API INTEGRATION
  renewals: {
    // Keep all your existing functions unchanged:
    create: (renewal: any) => supabase.from('member_renewals').insert(renewal).select().single(),
    getByMemberId: (memberId: string) => 
      supabase.from('member_renewals').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    getAll: () => supabase.from('member_renewals').select('*, members(first_name, last_name), packages(name)').order('created_at', { ascending: false }),
    
    // ✅ ADD THIS PROCESS FUNCTION (this is what's missing):
    process: async (renewalData: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/renewals/process`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(renewalData),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to process renewal');
        }

        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error processing renewal:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },
  },

  // Reports - UNCHANGED
  reports: {
    getByMemberId: (memberId: string) => 
      supabase.from('member_reports').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    create: (report: any) => supabase.from('member_reports').insert(report).select().single(),
    getAll: () => supabase.from('member_reports').select('*, members(first_name, last_name, branch_id)').order('created_at', { ascending: false }),
    update: (id: string, updates: any) => supabase.from('member_reports').update(updates).eq('id', id).select().single(),
    getByBranch: (branchId: string) => 
      supabase.from('member_reports')
        .select('*, members!inner(first_name, last_name, branch_id)')
        .eq('members.branch_id', branchId)
        .order('created_at', { ascending: false }),
  },

  // Action Logs - UNCHANGED
  actionLogs: {
    create: (log: any) => supabase.from('staff_actions_log').insert(log),
    getByBranch: (branchId: string) => 
      supabase.from('staff_actions_log')
        .select('*, branch_staff(first_name, last_name), members(first_name, last_name)')
        .eq('branch_staff.branch_id', branchId)
        .order('created_at', { ascending: false }),
    getAll: () => supabase.from('staff_actions_log').select('*, branch_staff(first_name, last_name), members(first_name, last_name)').order('created_at', { ascending: false }),
  },

  // Analytics - RESTORED AND ENHANCED
  analytics: {
    // RESTORED - Your original getBranchAnalytics function
    getBranchAnalytics: async (branchId: string, startDate?: string, endDate?: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        
        let url = `${API_BASE_URL}/analytics/branch/${branchId}`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        console.log('🔍 Fetching analytics from:', url);
        
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch analytics');
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        console.error('Error fetching analytics:', error);
        return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
    },
  },

  // Users - UNCHANGED
  users: {
    getById: (id: string) => supabase.from('users').select('*').eq('id', id).single(),
    getByAuthId: (authId: string) => supabase.from('users').select('*').eq('auth_user_id', authId).single(),
    create: (user: any) => supabase.from('users').insert(user).select().single(),
    update: (id: string, updates: any) => supabase.from('users').update(updates).eq('id', id).select().single(),
    getAll: () => supabase.from('users').select('*').order('created_at', { ascending: false }),
  },

  // Health Check - API Health Endpoint
  health: {
    check: async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/health`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Health check failed');
        }
        
        return { data: result, error: null };
      } catch (error) {
        console.error('Error in health check:', error);
        return { 
          data: null, 
          error: error instanceof Error ? error : new Error('Unknown error')
        };
      }
    },
  },
};