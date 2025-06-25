// backend/src/routes/analytics.ts - WITH SECURITY FIXES (Phase 1)
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

// Get comprehensive analytics for a branch - PHASE 1 SECURITY FIXES APPLIED
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
      const resultLimit = Math.min(parseInt(limit as string) || 100, 1000);

      // 1. Revenue Overview
      const revenueData = await getRevenueOverview(branchId, start, end, resultLimit);
      
      // 2. Detailed Transactions
      const transactions = await getDetailedTransactions(branchId, start, end, resultLimit);
      
      // 3. Member Analytics
      const memberAnalytics = await getMemberAnalytics(branchId, start, end, resultLimit);
      
      // 4. Package Performance
      const packagePerformance = await getPackagePerformance(branchId, start, end, resultLimit);
      
      // 5. Staff Performance
      const staffPerformance = await getStaffPerformance(branchId, start, end, resultLimit);
      
      // 6. Time-based Analytics
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
          queriedAt: new Date().toISOString()
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
      branch_staff(first_name, last_name)
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
    .select('*')
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
      paymentMethod: 'Unknown',
      processedBy: 'Staff',
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
      .eq('package_type', pkg.type)
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

console.log('📊 Analytics routes loaded successfully - WITH PHASE 1 SECURITY FIXES');

export { router as analyticsRoutes };