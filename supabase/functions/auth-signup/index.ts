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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, userData } = await req.json();

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: userData?.first_name || '',
        last_name: userData?.last_name || '',
        phone: userData?.phone || '',
        role: userData?.role || 'member',
      },
    });

    if (authError) {
      throw authError;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        profile: userProfile,
        message: 'User created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});