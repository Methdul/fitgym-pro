// backend/src/routes/analytics.ts - WITH PHASE 3 AUDIT-BASED ANALYTICS
import express, { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { 
  commonValidations, 
  strictRateLimit,
  authRateLimit,
  apiRateLimit,
  validateUUID,
  handleValidationErrors,
  validateDate,
  validateEnum,
  validateInteger
} from '../middleware/validation';

// Import RBAC system
import {
  requirePermission,
  requireAnyPermission,
  requireBranchAccess,
  auditLog,
  Permission,
  rbacUtils
} from '../middleware/rbac';

const router = express.Router();

// TypeScript interfaces for better type safety
interface Transaction {
  id: string;
  date: string;
  memberName: string;
  type: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  processedBy: string;
  memberStatus: string;
}

interface RevenueData {
  total: number;
  renewals: number;
  newMemberships: number;
  upgrades: number;
  comparison: {
    previous: number;
    change: number;
    changePercent: number;
  };
  dailyAverage: number;
}

interface MemberAnalytics {
  total: number;
  active: number;
  expired: number;
  newThisPeriod: number;
  renewalsThisPeriod: number;
  retentionRate: number;
  packageDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

interface PackagePerformance {
  id: string;
  name: string;
  type: string;
  price: number;
  sales: number;
  revenue: number;
  newMemberships: number;
  renewals: number;
}

interface StaffPerformance {
  id: string;
  name: string;
  role: string;
  newMembers: number;
  renewals: number;
  totalTransactions: number;
  revenue: number;
}

interface TimeAnalytics {
  daily: Array<{
    date: string;
    revenue: number;
    transactions: number;
    newMembers: number;
    renewals: number;
  }>;
  totalDays: number;
  peakDay: {
    date: string;
    revenue: number;
  };
  averageDaily: number;
}

// Debug middleware for this route
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📊 Analytics Route: ${req.method} ${req.path}`);
  next();
});

// PHASE 1 SECURITY FIXES: Analytics query parameter validation
const analyticsQueryValidation = [
  // Validate optional date parameters
  require('express-validator').query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  require('express-validator').query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  // Validate period parameter
  require('express-validator').query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('period must be one of: day, week, month, quarter, year'),
  // Validate limit parameter for data protection
  require('express-validator').query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('limit must be between 1 and 1000'),
  handleValidationErrors
];

// Get comprehensive analytics for a branch - PHASE 3: NOW USING AUDIT-BASED ANALYTICS
router.get('/branch/:branchId', 
  strictRateLimit,                             // PHASE 1 FIX: Rate limiting for expensive queries
  commonValidations.validateBranchId,         // PHASE 1 FIX: UUID validation
  analyticsQueryValidation,                   // PHASE 1 FIX: Query parameter validation
  authenticate,                               // Must be authenticated
  requireBranchAccess(Permission.ANALYTICS_READ), // Must have analytics permission for this branch
  auditLog('READ_ANALYTICS', 'analytics'),    // Log the action
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      const { startDate, endDate, period = 'month', limit = 100 } = req.query;
      
      console.log(`📊 Getting analytics for branch: ${branchId}`);
      
      // PHASE 1 FIX: Validate date range
      let start: Date, end: Date;
      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        
        // PHASE 1 FIX: Prevent excessive date ranges (max 2 years)
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 730) { // 2 years
          return res.status(400).json({
            status: 'error',
            error: 'Date range too large',
            message: 'Maximum date range is 2 years'
          });
        }
        
        if (start >= end) {
          return res.status(400).json({
            status: 'error',
            error: 'Invalid date range',
            message: 'Start date must be before end date'
          });
        }
      } else {
        // Default to current month
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // PHASE 1 FIX: Apply result limits to prevent resource exhaustion
      const resultLimit = Math.min(parseInt(limit as string) || 10000, 50000);

      // PHASE 3: Use audit-based analytics queries
      console.log('📊 Using audit-based analytics queries');

      // 1. Revenue Overview (from audit logs)
      const revenueData = await getAuditBasedRevenue(branchId, start, end, resultLimit);
      
      // 2. Detailed Transactions (from audit logs)
      const transactions = await getAuditBasedTransactions(branchId, start, end, resultLimit);
      
      // 3. Member Analytics (from audit logs)
      const memberAnalytics = await getAuditBasedMemberAnalytics(branchId, start, end, resultLimit);
      
      // 4. Package Performance (keep existing for now - requires more complex audit analysis)
      const packagePerformance = await getPackagePerformance(branchId, start, end, resultLimit);
      
      // 5. Staff Performance (from audit logs)
      const staffPerformance = await getAuditBasedStaffPerformance(branchId, start, end, resultLimit);
      
      // 6. Time-based Analytics (keep existing for now)
      const timeAnalytics = await getTimeAnalytics(branchId, start, end, resultLimit);

      console.log(`✅ Found analytics data for branch ${branchId}`);
      
      res.json({
        status: 'success',
        data: {
          period: { start: start.toISOString(), end: end.toISOString() },
          revenue: revenueData,
          transactions,
          memberAnalytics,
          packagePerformance,
          staffPerformance,
          timeAnalytics
        },
        meta: {
          resultLimit,
          queriedAt: new Date().toISOString(),
          usingAuditLogs: true // PHASE 3: Indicate we're using audit-based data
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch analytics',
        message: 'An error occurred while fetching analytics data'
      });
    }
  }
);

// PHASE 3: NEW - Get live activity feed from audit logs
router.get('/branch/:branchId/activity',
  strictRateLimit,
  commonValidations.validateBranchId,
  authenticate,
  requireBranchAccess(Permission.ANALYTICS_READ),
  auditLog('READ_ANALYTICS_ACTIVITY', 'analytics'),
  async (req: Request, res: Response) => {
    try {
      const { branchId } = req.params;
      const { limit = 50 } = req.query;
      
      console.log(`📊 Getting activity feed for branch: ${branchId}`);
      
      const activityLimit = Math.min(parseInt(limit as string) || 50, 100);
      
      // Get recent audit logs for activity feed
      const { data: recentActivity, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('branch_id', branchId)
        .not('action', 'like', '%READ%') // Exclude read operations for cleaner feed
        .limit(activityLimit)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching activity data:', error);
        throw error;
      }

      // Transform audit logs into activity feed format
      const activities = recentActivity?.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        resourceType: log.resource_type,
        userEmail: log.user_email,
        success: log.success,
        description: generateActivityDescription(log),
        details: {
          statusCode: log.status_code,
          resourceId: log.resource_id,
          errorMessage: log.error_message
        }
      })) || [];

      // Get activity statistics
      const stats = {
        totalActivities: activities.length,
        successfulActivities: activities.filter(a => a.success).length,
        failedActivities: activities.filter(a => !a.success).length,
        uniqueUsers: new Set(activities.map(a => a.userEmail)).size,
        lastActivity: activities[0]?.timestamp || null
      };

      res.json({
        status: 'success',
        data: {
          activities,
          stats,
          period: {
            generated: new Date().toISOString(),
            limit: activityLimit
          }
        }
      });
      
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch activity feed',
        message: 'An error occurred while fetching activity data'
      });
    }
  }
);

// ====================================================================
// PHASE 3: NEW AUDIT-BASED ANALYTICS FUNCTIONS - ENHANCED VERSION
// ====================================================================

// NEW: Get revenue from audit logs instead of direct table queries - ENHANCED
async function getAuditBasedRevenue(branchId: string, start: Date, end: Date, limit: number): Promise<RevenueData> {
  console.log('📊 Getting audit-based revenue data');
  
  // Get financial transactions from audit logs
  const { data: auditLogs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('branch_id', branchId)
    .in('action', ['CREATE_MEMBER', 'PROCESS_MEMBER_RENEWAL'])
    .eq('success', true)
    .gte('timestamp', start.toISOString())
    .lt('timestamp', end.toISOString())
    .limit(limit)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching audit revenue data:', error);
    throw error;
  }

  console.log(`📊 Found ${auditLogs?.length || 0} financial audit logs`);

  // Extract financial data from request_data JSONB - ENHANCED VERSION
  let totalRevenue = 0;
  let renewalRevenue = 0;
  let newMemberRevenue = 0;
  let upgrades = 0;

  auditLogs?.forEach(log => {
    const requestData = log.request_data || {};
    
    // ENHANCED: Better amount extraction with multiple fallbacks
    let amount = 0;
    if (requestData.package_price) {
      amount = parseFloat(requestData.package_price);
    } else if (requestData.total_amount) {
      amount = parseFloat(requestData.total_amount);
    } else if (requestData.amount_paid) {
      amount = parseFloat(requestData.amount_paid);
    }
    
    console.log(`💰 Processing audit log: Action=${log.action}, Amount=${amount}, Package=${requestData.package_name}`);
    
    if (amount > 0) {
      totalRevenue += amount;
      
      if (log.action === 'PROCESS_MEMBER_RENEWAL') {
        renewalRevenue += amount;
        console.log(`📈 Added ${amount} to renewal revenue`);
      } else if (log.action === 'CREATE_MEMBER') {
        newMemberRevenue += amount;
        console.log(`🆕 Added ${amount} to new member revenue`);
      }
      
      // Check for upgrades (when renewal is more expensive than usual)
      if (log.action === 'PROCESS_MEMBER_RENEWAL' && amount > 50) { // Simplified upgrade detection
        upgrades += amount * 0.1; // Assume 10% of high-value renewals are upgrades
      }
    } else {
      console.log(`⚠️ Audit log ${log.id} has no valid amount: ${JSON.stringify(requestData)}`);
    }
  });

  console.log(`📊 Revenue Summary: Total=${totalRevenue}, New=${newMemberRevenue}, Renewals=${renewalRevenue}, Upgrades=${upgrades}`);

  // Calculate comparison with previous period (simplified for now)
  const periodLength = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodLength);
  const previousEnd = new Date(start.getTime());

  const { data: previousLogs } = await supabase
    .from('audit_logs')
    .select('request_data')
    .eq('branch_id', branchId)
    .in('action', ['CREATE_MEMBER', 'PROCESS_MEMBER_RENEWAL'])
    .eq('success', true)
    .gte('timestamp', previousStart.toISOString())
    .lt('timestamp', previousEnd.toISOString())
    .limit(limit);

  const previousRevenue = previousLogs?.reduce((sum, log) => {
    const amount = parseFloat(log.request_data?.package_price || log.request_data?.amount_paid || 0);
    return sum + amount;
  }, 0) || 0;

  const change = totalRevenue - previousRevenue;
  const changePercent = previousRevenue > 0 ? (change / previousRevenue) * 100 : 0;

  // Calculate daily average
  const days = Math.ceil(periodLength / (1000 * 60 * 60 * 24));
  const dailyAverage = days > 0 ? totalRevenue / days : 0;

  return {
    total: totalRevenue,
    renewals: renewalRevenue,
    newMemberships: newMemberRevenue,
    upgrades: upgrades,
    comparison: {
      previous: previousRevenue,
      change: change,
      changePercent: changePercent
    },
    dailyAverage: dailyAverage
  };
}

// NEW: Get detailed transactions from audit logs - ENHANCED
async function getAuditBasedTransactions(branchId: string, start: Date, end: Date, limit: number): Promise<Transaction[]> {
  console.log('📊 Getting audit-based transactions');
  
  const { data: auditLogs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('branch_id', branchId)
    .in('action', ['CREATE_MEMBER', 'PROCESS_MEMBER_RENEWAL'])
    .eq('success', true)
    .gte('timestamp', start.toISOString())
    .lt('timestamp', end.toISOString())
    .limit(limit)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching audit transaction data:', error);
    throw error;
  }

  // Transform audit logs into transaction format - ENHANCED VERSION
  const transactions: Transaction[] = auditLogs?.map(log => {
    const requestData = log.request_data || {};
    const responseData = log.response_data || {};
    
    // ENHANCED: Better member name extraction
    let memberName = 'Unknown Member';
    if (responseData.member_name) {
      memberName = responseData.member_name;
    } else if (requestData.member_first_name && requestData.member_last_name) {
      memberName = `${requestData.member_first_name} ${requestData.member_last_name}`;
    }
    
    // ENHANCED: Better amount extraction
    let amount = 0;
    if (requestData.package_price) {
      amount = parseFloat(requestData.package_price);
    } else if (requestData.total_amount) {
      amount = parseFloat(requestData.total_amount);
    }
    
    // ENHANCED: Better package name extraction
    let packageName = 'Unknown Package';
    if (requestData.package_name && requestData.package_name !== 'Unknown Package') {
      packageName = requestData.package_name;
    }
    
    // ENHANCED: Better payment method extraction
    let paymentMethod = 'Unknown';
    if (requestData.payment_method) {
      paymentMethod = requestData.payment_method === 'cash' ? 'Cash' : 
                      requestData.payment_method === 'card' ? 'Card' : 
                      requestData.payment_method;
    }
    
    return {
      id: log.id,
      date: log.timestamp,
      memberName: memberName,
      type: log.action === 'CREATE_MEMBER' ? 'New Membership' : 'Renewal',
      packageName: packageName,
      amount: amount,
      paymentMethod: paymentMethod,
      processedBy: log.user_email?.split('@')[0] || 'Unknown Staff',
      memberStatus: responseData.success ? 'Active' : 'Pending'
    };
  }) || [];

  console.log(`📊 Transformed ${transactions.length} audit logs into transactions`);
  return transactions;
}

// NEW: Get member analytics from audit logs
async function getAuditBasedMemberAnalytics(branchId: string, start: Date, end: Date, limit: number): Promise<MemberAnalytics> {
  console.log('📊 Getting audit-based member analytics');
  
  // Get member-related audit logs
  const { data: memberLogs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('branch_id', branchId)
    .in('action', ['CREATE_MEMBER', 'UPDATE_MEMBER', 'DELETE_MEMBER', 'PROCESS_MEMBER_RENEWAL'])
    .eq('success', true)
    .gte('timestamp', start.toISOString())
    .lt('timestamp', end.toISOString())
    .limit(limit)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching audit member data:', error);
    throw error;
  }

  // Analyze member activities
  const newMembers = memberLogs?.filter(log => log.action === 'CREATE_MEMBER').length || 0;
  const renewals = memberLogs?.filter(log => log.action === 'PROCESS_MEMBER_RENEWAL').length || 0;
  
  // Get package distribution from audit logs
  const packageTypes: { [key: string]: number } = {};
  memberLogs?.forEach(log => {
    const packageType = log.request_data?.member_type || log.request_data?.package_type || 'unknown';
    packageTypes[packageType] = (packageTypes[packageType] || 0) + 1;
  });

  const totalMemberActivities = memberLogs?.length || 0;
  const packageDistribution = Object.entries(packageTypes).map(([type, count]) => ({
    type,
    count,
    percentage: totalMemberActivities > 0 ? (count / totalMemberActivities) * 100 : 0
  }));

  // For now, use simplified calculations (in a full implementation, you'd need current member counts)
  return {
    total: newMembers + renewals, // Simplified
    active: newMembers + renewals, // Simplified
    expired: 0, // Would need more complex logic
    newThisPeriod: newMembers,
    renewalsThisPeriod: renewals,
    retentionRate: renewals > 0 && newMembers > 0 ? (renewals / (newMembers + renewals)) * 100 : 0,
    packageDistribution
  };
}

// NEW: Get staff performance from audit logs - ENHANCED
async function getAuditBasedStaffPerformance(branchId: string, start: Date, end: Date, limit: number): Promise<StaffPerformance[]> {
  console.log('📊 Getting audit-based staff performance');
  
  const { data: auditLogs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('branch_id', branchId)
    .in('action', ['CREATE_MEMBER', 'PROCESS_MEMBER_RENEWAL'])
    .eq('success', true)
    .gte('timestamp', start.toISOString())
    .lt('timestamp', end.toISOString())
    .limit(limit)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching audit staff data:', error);
    throw error;
  }

  // Group by staff member - ENHANCED
  const staffStats: { [email: string]: any } = {};
  
  auditLogs?.forEach(log => {
    const staffEmail = log.user_email;
    if (!staffEmail) return;
    
    if (!staffStats[staffEmail]) {
      staffStats[staffEmail] = {
        email: staffEmail,
        newMembers: 0,
        renewals: 0,
        revenue: 0,
        totalTransactions: 0
      };
    }
    
    // ENHANCED: Better amount extraction
    const requestData = log.request_data || {};
    let amount = 0;
    if (requestData.package_price) {
      amount = parseFloat(requestData.package_price);
    } else if (requestData.total_amount) {
      amount = parseFloat(requestData.total_amount);
    } else if (requestData.amount_paid) {
      amount = parseFloat(requestData.amount_paid);
    }
    
    staffStats[staffEmail].revenue += amount;
    staffStats[staffEmail].totalTransactions += 1;
    
    if (log.action === 'CREATE_MEMBER') {
      staffStats[staffEmail].newMembers += 1;
    } else if (log.action === 'PROCESS_MEMBER_RENEWAL') {
      staffStats[staffEmail].renewals += 1;
    }
    
    console.log(`👥 Staff ${staffEmail}: +${amount} revenue, Action: ${log.action}`);
  });

  // Convert to array format
  const performance: StaffPerformance[] = Object.values(staffStats).map((stats: any) => ({
    id: stats.email, // Using email as ID since we don't have staff ID in audit logs
    name: stats.email.split('@')[0], // Extract name from email
    role: 'Staff', // Simplified - would need staff lookup for actual role
    newMembers: stats.newMembers,
    renewals: stats.renewals,
    totalTransactions: stats.totalTransactions,
    revenue: stats.revenue
  }));

  console.log(`📊 Staff performance calculated for ${performance.length} staff members`);
  return performance.sort((a, b) => b.revenue - a.revenue);
}

// ====================================================================
// EXISTING HELPER FUNCTIONS (KEPT FOR FALLBACK/PACKAGE PERFORMANCE)
// ====================================================================

// Helper function: Revenue Overview - PHASE 1 FIX: Added result limits
async function getRevenueOverview(branchId: string, start: Date, end: Date, limit: number): Promise<RevenueData> {
  // Get all renewals in the period (with limit)
  const { data: renewals, error: renewalsError } = await supabase
    .from('member_renewals')
    .select(`
      *,
      members!inner(branch_id)
    `)
    .eq('members.branch_id', branchId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .limit(limit)
    .order('created_at', { ascending: false });

  if (renewalsError) throw renewalsError;

  // Get new members in the period (with limit)
  const { data: newMembers, error: membersError } = await supabase
    .from('members')
    .select('*')
    .eq('branch_id', branchId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .limit(limit)
    .order('created_at', { ascending: false });

  if (membersError) throw membersError;

  // Calculate totals
  const renewalRevenue = renewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0;
  const newMemberRevenue = newMembers?.reduce((sum, m) => sum + m.package_price, 0) || 0;
  const totalRevenue = renewalRevenue + newMemberRevenue;

  // Get previous period for comparison (with limit)
  const prevStart = new Date(start);
  prevStart.setMonth(prevStart.getMonth() - 1);
  const prevEnd = new Date(end);
  prevEnd.setMonth(prevEnd.getMonth() - 1);

  const { data: prevRenewals } = await supabase
    .from('member_renewals')
    .select(`
      *,
      members!inner(branch_id)
    `)
    .eq('members.branch_id', branchId)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', prevEnd.toISOString())
    .limit(limit);

  const { data: prevNewMembers } = await supabase
    .from('members')
    .select('*')
    .eq('branch_id', branchId)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', prevEnd.toISOString())
    .limit(limit);

  const prevRevenue = (prevRenewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0) +
                     (prevNewMembers?.reduce((sum, m) => sum + m.package_price, 0) || 0);

  const revenueChange = totalRevenue - prevRevenue;
  const revenueChangePercent = prevRevenue > 0 ? (revenueChange / prevRevenue) * 100 : 0;

  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const dailyAverage = daysDiff > 0 ? totalRevenue / daysDiff : 0;

  return {
    total: totalRevenue,
    renewals: renewalRevenue,
    newMemberships: newMemberRevenue,
    upgrades: 0, // Calculate if needed
    comparison: {
      previous: prevRevenue,
      change: revenueChange,
      changePercent: revenueChangePercent
    },
    dailyAverage
  };
}

// Helper function: Detailed Transactions - PHASE 1 FIX: Added result limits
async function getDetailedTransactions(branchId: string, start: Date, end: Date, limit: number): Promise<Transaction[]> {
  const transactions: Transaction[] = [];

  // Get renewals with member and staff details (with limit)
  const { data: renewals } = await supabase
    .from('member_renewals')
    .select(`
      *,
      members!inner(branch_id, first_name, last_name, status),
      packages(name),
      branch_staff!renewed_by_staff_id(first_name, last_name)
    `)
    .eq('members.branch_id', branchId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .limit(Math.floor(limit / 2))
    .order('created_at', { ascending: false });

  // Add renewal transactions
  renewals?.forEach(renewal => {
    transactions.push({
      id: renewal.id,
      date: renewal.created_at,
      memberName: `${renewal.members.first_name} ${renewal.members.last_name}`,
      type: 'Renewal',
      packageName: renewal.packages?.name || 'Unknown Package',
      amount: renewal.amount_paid,
      paymentMethod: renewal.payment_method || 'Unknown',
      processedBy: renewal.branch_staff ? 
        `${renewal.branch_staff.first_name} ${renewal.branch_staff.last_name}` : 'System',
      memberStatus: renewal.members.status
    });
  });

  // Get new memberships (with limit)
  const { data: newMembers } = await supabase
    .from('members')
    .select(`
      *,
      branch_staff!processed_by_staff_id(first_name, last_name)
    `)
    .eq('branch_id', branchId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .limit(Math.floor(limit / 2))
    .order('created_at', { ascending: false });

  // Add new membership transactions
  newMembers?.forEach(member => {
    transactions.push({
      id: member.id,
      date: member.created_at,
      memberName: `${member.first_name} ${member.last_name}`,
      type: 'New Membership',
      packageName: member.package_name || 'Unknown Package',
      amount: member.package_price || 0,
      paymentMethod: member.payment_method || 'cash',
      processedBy: member.branch_staff ? 
        `${member.branch_staff.first_name} ${member.branch_staff.last_name}` : 
        'System',
      memberStatus: member.status
    });
  });

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
}

// Helper function: Member Analytics - PHASE 1 FIX: Added result limits
async function getMemberAnalytics(branchId: string, start: Date, end: Date, limit: number): Promise<MemberAnalytics> {
  // Get all members for the branch (with limit)
  const { data: allMembers } = await supabase
    .from('members')
    .select('*')
    .eq('branch_id', branchId)
    .limit(limit);

  // Get new members in period (with limit)
  const { data: newMembers } = await supabase
    .from('members')
    .select('*')
    .eq('branch_id', branchId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .limit(limit);

  // Get renewals in period (with limit)
  const { data: renewals } = await supabase
    .from('member_renewals')
    .select(`
      *,
      members!inner(branch_id)
    `)
    .eq('members.branch_id', branchId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .limit(limit);

  const total = allMembers?.length || 0;
  const active = allMembers?.filter(m => m.status === 'active').length || 0;
  const expired = allMembers?.filter(m => m.status === 'expired').length || 0;
  const newThisPeriod = newMembers?.length || 0;
  const renewalsThisPeriod = renewals?.length || 0;

  // Calculate retention rate (simplified)
  const retentionRate = total > 0 ? ((active / total) * 100) : 0;

  // Package distribution
  const packageDistribution = getPackageDistribution(allMembers || []);

  return {
    total,
    active,
    expired,
    newThisPeriod,
    renewalsThisPeriod,
    retentionRate,
    packageDistribution
  };
}

// Helper function: Package Performance - PHASE 1 FIX: Added result limits
async function getPackagePerformance(branchId: string, start: Date, end: Date, limit: number): Promise<PackagePerformance[]> {
  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .limit(limit);

  const performance = await Promise.all(packages?.map(async (pkg): Promise<PackagePerformance> => {
    // Get new memberships for this package (with limit)
    const { data: newMembers } = await supabase
      .from('members')
      .select('*')
      .eq('branch_id', branchId)
      .eq('package_id', pkg.id)  
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .limit(Math.floor(limit / 10));

    // Get renewals for this package (with limit)
    const { data: renewals } = await supabase
      .from('member_renewals')
      .select(`
        *,
        members!inner(branch_id)
      `)
      .eq('members.branch_id', branchId)
      .eq('package_id', pkg.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .limit(Math.floor(limit / 10));

    const newMemberRevenue = newMembers?.reduce((sum, m) => sum + (m.package_price || 0), 0) || 0;
    const renewalRevenue = renewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0;

    return {
      id: pkg.id,
      name: pkg.name,
      type: pkg.type,
      price: pkg.price || 0,
      sales: (newMembers?.length || 0) + (renewals?.length || 0),
      revenue: newMemberRevenue + renewalRevenue,
      newMemberships: newMembers?.length || 0,
      renewals: renewals?.length || 0
    };
  }) || []);

  return performance.sort((a, b) => b.revenue - a.revenue);
}

// Helper function: Staff Performance - PHASE 1 FIX: Added result limits
async function getStaffPerformance(branchId: string, start: Date, end: Date, limit: number): Promise<StaffPerformance[]> {
  const { data: staff } = await supabase
    .from('branch_staff')
    .select('*')
    .eq('branch_id', branchId)
    .limit(limit);

  const performance = await Promise.all(staff?.map(async (staffMember): Promise<StaffPerformance> => {
    const { data: newMembers } = await supabase
      .from('members')
      .select('*')
      .eq('branch_id', branchId)
      .eq('processed_by_staff_id', staffMember.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .limit(Math.floor(limit / 10));

    const { data: renewals } = await supabase
      .from('member_renewals')
      .select(`
        *,
        members!inner(branch_id)
      `)
      .eq('members.branch_id', branchId)
      .eq('renewed_by_staff_id', staffMember.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .limit(Math.floor(limit / 10));

    const newMemberRevenue = newMembers?.reduce((sum, m) => sum + m.package_price, 0) || 0;
    const renewalRevenue = renewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0;

    return {
      id: staffMember.id,
      name: `${staffMember.first_name} ${staffMember.last_name}`,
      role: staffMember.role,
      newMembers: newMembers?.length || 0,
      renewals: renewals?.length || 0,
      totalTransactions: (newMembers?.length || 0) + (renewals?.length || 0),
      revenue: newMemberRevenue + renewalRevenue
    };
  }) || []);

  return performance.sort((a, b) => b.revenue - a.revenue);
}

// Helper function: Time Analytics - PHASE 1 FIX: Added result limits and date validation
async function getTimeAnalytics(branchId: string, start: Date, end: Date, limit: number): Promise<TimeAnalytics> {
  const dailyData: Array<{
    date: string;
    revenue: number;
    transactions: number;
    newMembers: number;
    renewals: number;
  }> = [];
  
  const currentDate = new Date(start);
  let dayCount = 0;
  const maxDays = Math.min(365, limit); // PHASE 1 FIX: Limit to prevent excessive iteration
  
  while (currentDate <= end && dayCount < maxDays) {
    const dayStart = new Date(currentDate);
    const dayEnd = new Date(currentDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Get renewals for this day (with limit)
    const { data: renewals } = await supabase
      .from('member_renewals')
      .select(`
        *,
        members!inner(branch_id)
      `)
      .eq('members.branch_id', branchId)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .limit(Math.floor(limit / maxDays));

    // Get new members for this day (with limit)
    const { data: newMembers } = await supabase
      .from('members')
      .select('*')
      .eq('branch_id', branchId)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .limit(Math.floor(limit / maxDays));

    const dailyRevenue = (renewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0) +
                        (newMembers?.reduce((sum, m) => sum + m.package_price, 0) || 0);

    dailyData.push({
      date: dayStart.toISOString().split('T')[0],
      revenue: dailyRevenue,
      transactions: (renewals?.length || 0) + (newMembers?.length || 0),
      newMembers: newMembers?.length || 0,
      renewals: renewals?.length || 0
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayCount++;
  }

  return {
    daily: dailyData,
    totalDays: dailyData.length,
    peakDay: dailyData.reduce((max, day) => day.revenue > max.revenue ? day : max, dailyData[0] || { date: '', revenue: 0 }),
    averageDaily: dailyData.length > 0 ? dailyData.reduce((sum, day) => sum + day.revenue, 0) / dailyData.length : 0
  };
}

// Helper function: Package Distribution
function getPackageDistribution(members: any[]): Array<{ type: string; count: number; percentage: number; }> {
  const distribution: { [key: string]: number } = {};
  
  members.forEach(member => {
    const packageType = member.package_type || 'unknown';
    distribution[packageType] = (distribution[packageType] || 0) + 1;
  });

  return Object.entries(distribution).map(([type, count]) => ({
    type,
    count,
    percentage: members.length > 0 ? (count / members.length) * 100 : 0
  }));
}

// PHASE 3: Helper function to generate human-readable activity descriptions
function generateActivityDescription(log: any): string {
  const user = log.user_email?.split('@')[0] || 'Unknown user';
  const requestData = log.request_data || {};
  
  switch (log.action) {
    case 'CREATE_MEMBER':
      return `${user} created a new member (${requestData.package_name || 'package'})`;
    case 'PROCESS_MEMBER_RENEWAL':
      return `${user} processed a membership renewal (${requestData.payment_method || 'payment'})`;
    case 'UPDATE_MEMBER':
      return `${user} updated member information`;
    case 'DELETE_MEMBER':
      return `${user} deleted a member`;
    case 'CREATE_STAFF':
      return `${user} added a new staff member`;
    case 'UPDATE_STAFF':
      return `${user} updated staff information`;
    case 'DELETE_STAFF':
      return `${user} removed a staff member`;
    case 'CREATE_PACKAGE':
      return `${user} created a new package`;
    case 'UPDATE_PACKAGE':
      return `${user} updated package information`;
    case 'DELETE_PACKAGE':
      return `${user} deleted a package`;
    default:
      return `${user} performed ${log.action} on ${log.resource_type}`;
  }
}

console.log('📊 Analytics routes loaded successfully - WITH PHASE 3 AUDIT-BASED SYSTEM');

export { router as analyticsRoutes };