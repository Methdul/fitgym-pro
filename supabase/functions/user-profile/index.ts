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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile, error: profileError } = await supabaseClient.rpc('get_user_profile');

    if (profileError) {
      throw profileError;
    }

    const userProfile = profile?.[0];

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    let additionalData = {};

    if (userProfile.role === 'member' && userProfile.member_data) {
      const { data: recentCheckins } = await supabaseClient
        .from('member_check_ins')
        .select('*, branches(name)')
        .eq('member_id', userProfile.member_data.member_id)
        .order('check_in_date', { ascending: false })
        .limit(10);

      const { data: reports } = await supabaseClient
        .from('member_reports')
        .select('*')
        .eq('member_id', userProfile.member_data.member_id)
        .order('created_at', { ascending: false });

      additionalData = {
        recent_checkins: recentCheckins || [],
        reports: reports || [],
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile: userProfile,
        additional_data: additionalData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Profile error:', error);
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