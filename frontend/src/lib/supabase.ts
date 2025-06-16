import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rjznvhjitbbvitnvdgfo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqem52aGppdGJidml0bnZkZ2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3Mzg3MDQsImV4cCI6MjA1MjMxNDcwNH0.example-anon-key';

// Only validate in production
if (import.meta.env.PROD && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    'Missing Supabase environment variables. Using fallback values for development.\n' +
    'For production, please set:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced auth helpers
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
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error };
    } catch (error) {
      console.error('Get user error:', error);
      return { user: null, error };
    }
  },

  // Reset password
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
};

// Enhanced database helpers
export const db = {
  // Staff operations - UPDATED TO USE BACKEND API
  staff: {
    getByBranch: async (branchId: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        console.log('🔍 Using API URL for staff:', API_BASE_URL);
        
        const response = await fetch(`${API_BASE_URL}/staff/branch/${branchId}`);
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

    getAll: async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/staff`);
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
          headers: {
            'Content-Type': 'application/json',
          },
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
          headers: {
            'Content-Type': 'application/json',
          },
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
        const response = await fetch(`${API_BASE_URL}/staff/${id}`);
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

  // Members - UPDATED TO USE BACKEND API
  members: {
    getByBranch: async (branchId: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/members/branch/${branchId}`);
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
        const response = await fetch(`${API_BASE_URL}/members`);
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
        const response = await fetch(`${API_BASE_URL}/members/${id}`);
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
          headers: {
            'Content-Type': 'application/json',
          },
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
          headers: {
            'Content-Type': 'application/json',
          },
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
        const response = await fetch(`${API_BASE_URL}/members/search/${branchId}?q=${encodeURIComponent(query)}`);
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
        const response = await fetch(`${API_BASE_URL}/members`);
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

  // Packages - UPDATED TO USE BACKEND API
  packages: {
    getActive: async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/active`);
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

    getAll: async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages`);
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

    getById: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/${id}`);
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

    create: async (pkg: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

    update: async (id: string, updates: any) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
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

    delete: async (id: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
          method: 'DELETE',
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

  // Partnerships - UNCHANGED
  partnerships: {
    getAll: () => supabase.from('partnerships').select('*').order('name'),
    getActive: () => supabase.from('partnerships').select('*').eq('is_active', true).order('name'),
    getById: (id: string) => supabase.from('partnerships').select('*').eq('id', id).single(),
    create: (partnership: any) => supabase.from('partnerships').insert(partnership).select().single(),
    update: (id: string, updates: any) => supabase.from('partnerships').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('partnerships').delete().eq('id', id),
  },

  // Gym Staff - UNCHANGED
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

  // Renewals - UNCHANGED
  renewals: {
    create: (renewal: any) => supabase.from('member_renewals').insert(renewal).select().single(),
    getByMemberId: (memberId: string) => 
      supabase.from('member_renewals').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    getAll: () => supabase.from('member_renewals').select('*, members(first_name, last_name), packages(name)').order('created_at', { ascending: false }),
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

  // Users - UNCHANGED
  users: {
    getById: (id: string) => supabase.from('users').select('*').eq('id', id).single(),
    getByAuthId: (authId: string) => supabase.from('users').select('*').eq('auth_user_id', authId).single(),
    create: (user: any) => supabase.from('users').insert(user).select().single(),
    update: (id: string, updates: any) => supabase.from('users').update(updates).eq('id', id).select().single(),
    getAll: () => supabase.from('users').select('*').order('created_at', { ascending: false }),
  },
};