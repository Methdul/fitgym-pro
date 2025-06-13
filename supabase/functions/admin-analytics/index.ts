import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userData } = await supabaseClient
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const [
      { count: totalMembers },
      { count: activeMembers },
      { count: expiredMembers },
      { count: totalStaff },
      { count: totalBranches },
      { data: recentCheckins },
      { data: recentRenewals },
      { data: membersByBranch },
      { data: revenueData }
    ] = await Promise.all([
      supabaseClient.from('members').select('*', { count: 'exact', head: true }),
      supabaseClient.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseClient.from('members').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
      supabaseClient.from('branch_staff').select('*', { count: 'exact', head: true }),
      supabaseClient.from('branches').select('*', { count: 'exact', head: true }),
      supabaseClient.from('member_check_ins').select('*, members(first_name, last_name), branches(name)').order('created_at', { ascending: false }).limit(10),
      supabaseClient.from('member_renewals').select('*, members(first_name, last_name), packages(name)').order('created_at', { ascending: false }).limit(10),
      supabaseClient.from('branches').select('id, name, member_count, staff_count'),
      supabaseClient.from('member_renewals').select('amount_paid, created_at').order('created_at', { ascending: false }).limit(50)
    ]);

    const analytics = {
      overview: {
        total_members: totalMembers || 0,
        active_members: activeMembers || 0,
        expired_members: expiredMembers || 0,
        total_staff: totalStaff || 0,
        total_branches: totalBranches || 0,
        total_revenue: revenueData?.reduce((sum, r) => sum + Number(r.amount_paid), 0) || 0,
      },
      recent_activity: {
        checkins: recentCheckins || [],
        renewals: recentRenewals || [],
      },
      branch_analytics: membersByBranch || [],
      revenue_trend: revenueData || [],
    };

    return new Response(
      JSON.stringify({
        success: true,
        analytics,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }
});