// supabase/functions/member-renewal/index.ts
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

    const { 
      memberId, 
      packageId, 
      paymentMethod, 
      amountPaid, 
      durationMonths, 
      staffId, 
      staffPin,
      action = 'process'
    } = await req.json();

    switch (action) {
      case 'process':
        return await processRenewal(supabaseClient, {
          memberId, packageId, paymentMethod, amountPaid, durationMonths, staffId, staffPin
        });
      
      case 'check_eligibility':
        return await checkEligibility(supabaseClient, { memberId });
      
      case 'get_analytics':
        return await getRenewalAnalytics(supabaseClient, req);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Renewal error:', error);
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

// Process member renewal
async function processRenewal(supabaseClient: any, params: any) {
  const { memberId, packageId, paymentMethod, amountPaid, durationMonths, staffId, staffPin } = params;

  // Validate required fields
  if (!memberId || !packageId || !paymentMethod || !amountPaid || !durationMonths || !staffId || !staffPin) {
    throw new Error('Missing required fields for renewal');
  }

  // Use RPC to process renewal (matching your pattern)
  const { data, error } = await supabaseClient.rpc('process_member_renewal', {
    p_member_id: memberId,
    p_package_id: packageId,
    p_payment_method: paymentMethod,
    p_amount_paid: parseFloat(amountPaid),
    p_duration_months: parseInt(durationMonths),
    p_staff_id: staffId,
    p_staff_pin: staffPin
  });

  if (error) {
    throw error;
  }

  const result = data?.[0];
  
  if (!result?.success) {
    throw new Error(result?.error_message || 'Renewal processing failed');
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        renewal: result.renewal_data,
        member: result.member_data,
        message: result.success_message,
        details: {
          packageName: result.package_name,
          newExpiry: result.new_expiry,
          processedBy: result.staff_name
        }
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

// Check renewal eligibility
async function checkEligibility(supabaseClient: any, params: any) {
  const { memberId } = params;

  if (!memberId) {
    throw new Error('Member ID is required');
  }

  const { data, error } = await supabaseClient.rpc('check_renewal_eligibility', {
    p_member_id: memberId
  });

  if (error) {
    throw error;
  }

  const result = data?.[0];

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        isEligible: result?.is_eligible || false,
        memberStatus: result?.member_status,
        expiryDate: result?.expiry_date,
        daysUntilExpiry: result?.days_until_expiry,
        isExpired: result?.is_expired,
        message: result?.message
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

// Get renewal analytics  
async function getRenewalAnalytics(supabaseClient: any, req: Request) {
  const url = new URL(req.url);
  const branchId = url.searchParams.get('branchId');
  const timeframe = url.searchParams.get('timeframe') || 'month';

  if (!branchId) {
    throw new Error('Branch ID is required for analytics');
  }

  const { data, error } = await supabaseClient.rpc('get_renewal_analytics', {
    p_branch_id: branchId,
    p_timeframe: timeframe
  });

  if (error) {
    throw error;
  }

  const analytics = data?.[0];

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        totalRenewals: analytics?.total_renewals || 0,
        totalRevenue: analytics?.total_revenue || 0,
        averageAmount: analytics?.average_amount || 0,
        paymentMethods: analytics?.payment_methods || {},
        popularPackages: analytics?.popular_packages || {},
        monthlyTrends: analytics?.monthly_trends || {},
        timeframe: timeframe
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}