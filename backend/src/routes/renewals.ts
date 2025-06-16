// backend/src/routes/renewals.ts
import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Type definitions for API responses
interface EdgeFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Process a member renewal (uses Edge Function when available, fallback to direct DB)
router.post('/process', async (req, res) => {
  try {
    const {
      memberId,
      packageId,
      paymentMethod,
      amountPaid,
      durationMonths,
      staffId,
      staffPin
    } = req.body;

    // Validate required fields
    if (!memberId || !packageId || !paymentMethod || !amountPaid || !durationMonths || !staffId || !staffPin) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields'
      });
    }

    try {
      // Try to use Edge Function first
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/member-renewal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({
          action: 'process',
          memberId,
          packageId,
          paymentMethod,
          amountPaid,
          durationMonths,
          staffId,
          staffPin
        })
      });

      const result = await response.json() as EdgeFunctionResponse;
      
      if (result.success) {
        return res.json({
          status: 'success',
          data: result.data
        });
      } else {
        return res.status(400).json({
          status: 'error',
          error: result.error
        });
      }

    } catch (edgeFunctionError) {
      console.log('Edge function not available, using direct database approach');
      
      // Fallback to direct database processing
      // Step 1: Verify staff PIN
      const { data: staff, error: staffError } = await supabase
        .from('branch_staff')
        .select('*')
        .eq('id', staffId)
        .single();

      if (staffError || !staff) {
        return res.status(404).json({
          status: 'error',
          error: 'Staff member not found'
        });
      }

      if (staff.pin !== staffPin) {
        return res.status(401).json({
          status: 'error',
          error: 'Invalid PIN'
        });
      }

      // Step 2: Get member details
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberError || !member) {
        return res.status(404).json({
          status: 'error',
          error: 'Member not found'
        });
      }

      // Step 3: Check if member is expired
      const currentDate = new Date();
      const expiryDate = new Date(member.expiry_date);
      
      if (member.status !== 'expired' && expiryDate > currentDate) {
        return res.status(400).json({
          status: 'error',
          error: 'Member is not expired. Renewals can only be processed after expiry.'
        });
      }

      // Step 4: Get package details
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .eq('is_active', true)
        .single();

      if (packageError || !packageData) {
        return res.status(404).json({
          status: 'error',
          error: 'Package not found or inactive'
        });
      }

      // Step 5: Calculate new expiry date
      const previousExpiry = new Date(member.expiry_date);
      const newExpiry = new Date(previousExpiry);
      newExpiry.setMonth(newExpiry.getMonth() + parseInt(durationMonths));

      // Step 6: Create renewal record
      const { data: renewal, error: renewalError } = await supabase
        .from('member_renewals')
        .insert({
          member_id: memberId,
          package_id: packageId,
          payment_method: paymentMethod,
          amount_paid: parseFloat(amountPaid),
          previous_expiry: member.expiry_date,
          new_expiry: newExpiry.toISOString(),
          renewed_by_staff_id: staffId
        })
        .select()
        .single();

      if (renewalError) {
        throw renewalError;
      }

      // Step 7: Update member
      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({
          status: 'active',
          expiry_date: newExpiry.toISOString(),
          package_name: packageData.name,
          package_price: parseFloat(amountPaid),
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (memberUpdateError) {
        throw memberUpdateError;
      }

      // Step 8: Log the action
      await supabase
        .from('staff_actions_log')
        .insert({
          staff_id: staffId,
          member_id: memberId,
          action_type: 'RENEWAL_PROCESSED',
          description: `Renewed membership for ${member.first_name} ${member.last_name}. Package: ${packageData.name}, Amount: $${amountPaid}, Duration: ${durationMonths} months`,
          created_at: new Date().toISOString()
        });

      // Return success
      return res.json({
        status: 'success',
        data: {
          renewal,
          message: `Membership renewed successfully. New expiry date: ${newExpiry.toLocaleDateString()}`
        }
      });
    }

  } catch (error) {
    console.error('Error processing renewal:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get renewal history for a member
router.get('/member/:memberId', optionalAuth, async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data, error } = await supabase
      .from('member_renewals')
      .select(`
        *,
        packages (name, type),
        branch_staff (first_name, last_name, role)
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'success',
      data
    });

  } catch (error) {
    console.error('Error fetching renewal history:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch renewal history'
    });
  }
});

// Get recent renewals for a branch
router.get('/recent/:branchId', optionalAuth, async (req, res) => {
  try {
    const { branchId } = req.params;
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from('member_renewals')
      .select(`
        *,
        members!inner (branch_id, first_name, last_name, email),
        packages (name, type),
        branch_staff (first_name, last_name, role)
      `)
      .eq('members.branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) throw error;

    res.json({
      status: 'success',
      data
    });

  } catch (error) {
    console.error('Error fetching recent renewals:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch recent renewals'
    });
  }
});

// Check if member is eligible for renewal
router.get('/eligibility/:memberId', optionalAuth, async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error || !member) {
      return res.status(404).json({
        status: 'error',
        error: 'Member not found'
      });
    }

    const currentDate = new Date();
    const expiryDate = new Date(member.expiry_date);
    const isExpired = expiryDate < currentDate;
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      status: 'success',
      data: {
        isEligible: isExpired,
        memberStatus: member.status,
        expiryDate: member.expiry_date,
        daysUntilExpiry: isExpired ? Math.abs(daysUntilExpiry) : daysUntilExpiry,
        isExpired,
        message: isExpired 
          ? 'Member is eligible for renewal' 
          : `Member expires in ${daysUntilExpiry} days. Renewal only available after expiry.`
      }
    });

  } catch (error) {
    console.error('Error checking renewal eligibility:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to check renewal eligibility'
    });
  }
});

export { router as renewalRoutes };