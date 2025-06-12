import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nuvigdslneyjmvgghyax.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dmlnZHNsbmV5am12Z2doeWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NTYzOTQsImV4cCI6MjA2NTIzMjM5NH0.bVpi6PeqxiLinDmUfC4tUhYTruVPXBJivJnILraf2F8';

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

// Auth helpers
export const auth = {
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

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error };
    } catch (error) {
      console.error('Get user error:', error);
      return { user: null, error };
    }
  },

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

  resetPassword: async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      return { data, error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { data: null, error };
    }
  }
};

// Database helpers with proper error handling
export const db = {
  branches: {
    getAll: () => supabase.from('branches').select('*').order('name'),
    getById: (id: string) => supabase.from('branches').select('*').eq('id', id).single(),
    create: (branch: any) => supabase.from('branches').insert(branch).select().single(),
    update: (id: string, updates: any) => supabase.from('branches').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('branches').delete().eq('id', id),
  },

  members: {
    getByBranch: (branchId: string) => 
      supabase.from('members').select('*').eq('branch_id', branchId).order('created_at', { ascending: false }),
    getByUserId: (userId: string) => 
      supabase.from('members').select('*').eq('user_id', userId).single(),
    getById: (id: string) => supabase.from('members').select('*').eq('id', id).single(),
    create: (member: any) => supabase.from('members').insert(member).select().single(),
    update: (id: string, updates: any) => supabase.from('members').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('members').delete().eq('id', id),
    search: (branchId: string, query: string) => 
      supabase.from('members')
        .select('*')
        .eq('branch_id', branchId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,national_id.ilike.%${query}%`),
    getAll: () => supabase.from('members').select('*').order('created_at', { ascending: false }),
  },

  staff: {
    getByBranch: (branchId: string) => 
      supabase.from('branch_staff').select('*').eq('branch_id', branchId).order('role'),
    getAll: () => supabase.from('branch_staff').select('*').order('created_at', { ascending: false }),
    create: (staff: any) => supabase.from('branch_staff').insert(staff).select().single(),
    update: (id: string, updates: any) => supabase.from('branch_staff').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('branch_staff').delete().eq('id', id),
    verifyPin: async (staffId: string, pin: string) => {
      try {
        const { data: staff, error } = await supabase
          .from('branch_staff')
          .select('*')
          .eq('id', staffId)
          .single();
        
        if (error || !staff) {
          return { isValid: false, staff: null, error: 'Staff member not found' };
        }

        // In production, you should hash PINs. For demo, direct comparison
        const isValid = staff.pin === pin;
        
        if (isValid) {
          // Update last_active timestamp
          await supabase
            .from('branch_staff')
            .update({ last_active: new Date().toISOString() })
            .eq('id', staffId);
        }

        return { 
          isValid, 
          staff: isValid ? staff : null,
          error: isValid ? null : 'Invalid PIN'
        };
      } catch (error) {
        console.error('PIN verification error:', error);
        return { isValid: false, staff: null, error: 'Verification failed' };
      }
    },
  },

  packages: {
    getAll: () => supabase.from('packages').select('*').order('price'),
    getActive: () => supabase.from('packages').select('*').eq('is_active', true).order('price'),
    getById: (id: string) => supabase.from('packages').select('*').eq('id', id).single(),
    create: (pkg: any) => supabase.from('packages').insert(pkg).select().single(),
    update: (id: string, updates: any) => supabase.from('packages').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('packages').delete().eq('id', id),
  },

  partnerships: {
    getAll: () => supabase.from('partnerships').select('*').order('name'),
    getActive: () => supabase.from('partnerships').select('*').eq('is_active', true).order('name'),
    getById: (id: string) => supabase.from('partnerships').select('*').eq('id', id).single(),
    create: (partnership: any) => supabase.from('partnerships').insert(partnership).select().single(),
    update: (id: string, updates: any) => supabase.from('partnerships').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('partnerships').delete().eq('id', id),
  },

  gymStaff: {
    getDisplayed: () => supabase.from('gym_staff').select('*').eq('is_displayed', true).order('name'),
    getAll: () => supabase.from('gym_staff').select('*').order('name'),
    getById: (id: string) => supabase.from('gym_staff').select('*').eq('id', id).single(),
    create: (staff: any) => supabase.from('gym_staff').insert(staff).select().single(),
    update: (id: string, updates: any) => supabase.from('gym_staff').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('gym_staff').delete().eq('id', id),
  },

  renewals: {
    create: (renewal: any) => supabase.from('member_renewals').insert(renewal).select().single(),
    getByMemberId: (memberId: string) => 
      supabase.from('member_renewals').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    getAll: () => supabase.from('member_renewals').select('*, members(first_name, last_name), packages(name)').order('created_at', { ascending: false }),
  },

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

  actionLogs: {
    create: (log: any) => supabase.from('staff_actions_log').insert(log),
    getByBranch: (branchId: string) => 
      supabase.from('staff_actions_log')
        .select('*, branch_staff(first_name, last_name), members(first_name, last_name)')
        .eq('branch_staff.branch_id', branchId)
        .order('created_at', { ascending: false }),
    getAll: () => supabase.from('staff_actions_log').select('*, branch_staff(first_name, last_name), members(first_name, last_name)').order('created_at', { ascending: false }),
  },

  users: {
    getById: (id: string) => supabase.from('users').select('*').eq('id', id).single(),
    getByAuthId: (authId: string) => supabase.from('users').select('*').eq('auth_user_id', authId).single(),
    create: (user: any) => supabase.from('users').insert(user).select().single(),
    update: (id: string, updates: any) => supabase.from('users').update(updates).eq('id', id).select().single(),
    getAll: () => supabase.from('users').select('*').order('created_at', { ascending: false }),
  },

  // Analytics helpers
  analytics: {
    getTotalMembers: async () => {
      const { count } = await supabase.from('members').select('*', { count: 'exact', head: true });
      return count || 0;
    },
    
    getActiveMembers: async () => {
      const { count } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active');
      return count || 0;
    },
    
    getTotalRevenue: async () => {
      const { data } = await supabase.from('member_renewals').select('amount_paid');
      return data?.reduce((sum, renewal) => sum + Number(renewal.amount_paid), 0) || 0;
    },
    
    getMonthlyCheckIns: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count } = await supabase
        .from('member_check_ins')
        .select('*', { count: 'exact', head: true })
        .gte('check_in_date', startOfMonth.toISOString().split('T')[0]);
      return count || 0;
    }
  }
};