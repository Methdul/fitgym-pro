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

    const { memberId, branchId, staffId } = await req.json();

    const { data: member, error: memberError } = await supabaseClient
      .from('members')
      .select('*, branches(name)')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      throw new Error('Member not found');
    }

    if (member.status !== 'active') {
      throw new Error(`Member is ${member.status}. Cannot check in.`);
    }

    const today = new Date().toISOString().split('T')[0];
    if (member.expiry_date < today) {
      throw new Error('Membership expired. Please renew to continue.');
    }

    const { data: existingCheckin } = await supabaseClient
      .from('member_check_ins')
      .select('id')
      .eq('member_id', memberId)
      .eq('check_in_date', today)
      .maybeSingle();

    if (existingCheckin) {
      throw new Error('Member already checked in today');
    }

    const { data: checkinData, error: checkinError } = await supabaseClient
      .from('member_check_ins')
      .insert({
        member_id: memberId,
        branch_id: branchId,
        check_in_date: today,
        check_in_time: new Date().toTimeString().split(' ')[0],
      })
      .select()
      .single();

    if (checkinError) {
      throw checkinError;
    }

    if (staffId) {
      await supabaseClient.rpc('log_staff_action', {
        p_staff_id: staffId,
        p_action_type: 'member_checkin',
        p_description: `Member check-in: ${member.first_name} ${member.last_name}`,
        p_member_id: memberId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkin: checkinData,
        member: {
          name: `${member.first_name} ${member.last_name}`,
          package: member.package_name,
          expiry: member.expiry_date,
        },
        message: 'Check-in successful',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Check-in error:', error);
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