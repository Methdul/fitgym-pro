"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.analyticsRoutes = router;
// Debug middleware for this route
router.use((req, res, next) => {
    console.log(`📊 Analytics Route: ${req.method} ${req.path}`);
    next();
});
// Get comprehensive analytics for a branch
router.get('/branch/:branchId', auth_1.optionalAuth, async (req, res) => {
    try {
        const { branchId } = req.params;
        const { startDate, endDate, period = 'month' } = req.query;
        console.log(`📊 Getting analytics for branch: ${branchId}`);
        // Calculate date range
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        }
        else {
            // Default to current month
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        // 1. Revenue Overview
        const revenueData = await getRevenueOverview(branchId, start, end);
        // 2. Detailed Transactions
        const transactions = await getDetailedTransactions(branchId, start, end);
        // 3. Member Analytics
        const memberAnalytics = await getMemberAnalytics(branchId, start, end);
        // 4. Package Performance
        const packagePerformance = await getPackagePerformance(branchId, start, end);
        // 5. Staff Performance
        const staffPerformance = await getStaffPerformance(branchId, start, end);
        // 6. Time-based Analytics
        const timeAnalytics = await getTimeAnalytics(branchId, start, end);
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
            }
        });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Helper function: Revenue Overview
async function getRevenueOverview(branchId, start, end) {
    // Get all renewals in the period
    const { data: renewals, error: renewalsError } = await supabase_1.supabase
        .from('member_renewals')
        .select(`
      *,
      members!inner(branch_id)
    `)
        .eq('members.branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());
    if (renewalsError)
        throw renewalsError;
    // Get new members in the period
    const { data: newMembers, error: membersError } = await supabase_1.supabase
        .from('members')
        .select('*')
        .eq('branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());
    if (membersError)
        throw membersError;
    // Calculate totals
    const renewalRevenue = renewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0;
    const newMemberRevenue = newMembers?.reduce((sum, m) => sum + m.package_price, 0) || 0;
    const totalRevenue = renewalRevenue + newMemberRevenue;
    // Get previous period for comparison
    const prevStart = new Date(start);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(end);
    prevEnd.setMonth(prevEnd.getMonth() - 1);
    const { data: prevRenewals } = await supabase_1.supabase
        .from('member_renewals')
        .select(`
      *,
      members!inner(branch_id)
    `)
        .eq('members.branch_id', branchId)
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', prevEnd.toISOString());
    const { data: prevNewMembers } = await supabase_1.supabase
        .from('members')
        .select('*')
        .eq('branch_id', branchId)
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', prevEnd.toISOString());
    const prevRevenue = (prevRenewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0) +
        (prevNewMembers?.reduce((sum, m) => sum + m.package_price, 0) || 0);
    const revenueChange = totalRevenue - prevRevenue;
    const revenueChangePercent = prevRevenue > 0 ? (revenueChange / prevRevenue) * 100 : 0;
    return {
        total: totalRevenue,
        renewals: renewalRevenue,
        newMemberships: newMemberRevenue,
        upgrades: 0, // Not implemented yet
        comparison: {
            previous: prevRevenue,
            change: revenueChange,
            changePercent: revenueChangePercent
        },
        dailyAverage: totalRevenue / ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    };
}
// Helper function: Detailed Transactions
async function getDetailedTransactions(branchId, start, end) {
    const transactions = [];
    // Get renewals
    const { data: renewals } = await supabase_1.supabase
        .from('member_renewals')
        .select(`
      *,
      members!inner(branch_id, first_name, last_name),
      packages(name),
      branch_staff(first_name, last_name)
    `)
        .eq('members.branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: false });
    renewals?.forEach(renewal => {
        transactions.push({
            id: renewal.id,
            date: renewal.created_at,
            memberName: `${renewal.members.first_name} ${renewal.members.last_name}`,
            type: 'Renewal',
            packageName: renewal.packages?.name || 'Unknown Package',
            amount: renewal.amount_paid,
            paymentMethod: renewal.payment_method,
            processedBy: renewal.branch_staff ?
                `${renewal.branch_staff.first_name} ${renewal.branch_staff.last_name}` :
                'System',
            memberStatus: 'Existing'
        });
    });
    // Get new memberships
    const { data: newMembers } = await supabase_1.supabase
        .from('members')
        .select(`
      *,
      branch_staff(first_name, last_name)
    `)
        .eq('branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: false });
    newMembers?.forEach(member => {
        transactions.push({
            id: member.id,
            date: member.created_at,
            memberName: `${member.first_name} ${member.last_name}`,
            type: 'New Membership',
            packageName: member.package_name,
            amount: member.package_price,
            paymentMethod: 'Cash', // Default since new memberships don't track payment method
            processedBy: member.branch_staff ?
                `${member.branch_staff.first_name} ${member.branch_staff.last_name}` :
                'System',
            memberStatus: 'New'
        });
    });
    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return transactions;
}
// Helper function: Member Analytics
async function getMemberAnalytics(branchId, start, end) {
    const { data: allMembers } = await supabase_1.supabase
        .from('members')
        .select('*')
        .eq('branch_id', branchId);
    const { data: newMembers } = await supabase_1.supabase
        .from('members')
        .select('*')
        .eq('branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());
    const { data: renewals } = await supabase_1.supabase
        .from('member_renewals')
        .select(`
      *,
      members!inner(branch_id)
    `)
        .eq('members.branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());
    const now = new Date();
    const activeMembers = allMembers?.filter(m => {
        const expiryDate = new Date(m.expiry_date);
        return expiryDate > now;
    }).length || 0;
    const expiredMembers = allMembers?.filter(m => {
        const expiryDate = new Date(m.expiry_date);
        return expiryDate <= now;
    }).length || 0;
    const retentionRate = allMembers && allMembers.length > 0 ?
        (activeMembers / allMembers.length) * 100 : 0;
    return {
        total: allMembers?.length || 0,
        active: activeMembers,
        expired: expiredMembers,
        newThisPeriod: newMembers?.length || 0,
        renewalsThisPeriod: renewals?.length || 0,
        retentionRate: Math.round(retentionRate),
        packageDistribution: getPackageDistribution(allMembers || [])
    };
}
// Helper function: Package Performance
async function getPackagePerformance(branchId, start, end) {
    const { data: packages } = await supabase_1.supabase
        .from('packages')
        .select('*')
        .eq('branch_id', branchId);
    const performance = await Promise.all(packages?.map(async (pkg) => {
        // Count new memberships with this package
        const { data: newMembers } = await supabase_1.supabase
            .from('members')
            .select('*')
            .eq('branch_id', branchId)
            .eq('package_name', pkg.name)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
        // Count renewals with this package
        const { data: renewals } = await supabase_1.supabase
            .from('member_renewals')
            .select(`
        *,
        packages!inner(name),
        members!inner(branch_id)
      `)
            .eq('members.branch_id', branchId)
            .eq('packages.name', pkg.name)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
        const newMemberRevenue = newMembers?.reduce((sum, m) => sum + m.package_price, 0) || 0;
        const renewalRevenue = renewals?.reduce((sum, r) => sum + r.amount_paid, 0) || 0;
        return {
            id: pkg.id,
            name: pkg.name,
            type: pkg.type,
            price: pkg.price,
            sales: (newMembers?.length || 0) + (renewals?.length || 0),
            revenue: newMemberRevenue + renewalRevenue,
            newMemberships: newMembers?.length || 0,
            renewals: renewals?.length || 0
        };
    }) || []);
    return performance.sort((a, b) => b.revenue - a.revenue);
}
// Helper function: Staff Performance
async function getStaffPerformance(branchId, start, end) {
    const { data: staff } = await supabase_1.supabase
        .from('branch_staff')
        .select('*')
        .eq('branch_id', branchId);
    const performance = await Promise.all(staff?.map(async (staffMember) => {
        const { data: newMembers } = await supabase_1.supabase
            .from('members')
            .select('*')
            .eq('branch_id', branchId)
            .eq('processed_by_staff_id', staffMember.id)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
        const { data: renewals } = await supabase_1.supabase
            .from('member_renewals')
            .select(`
        *,
        members!inner(branch_id)
      `)
            .eq('members.branch_id', branchId)
            .eq('renewed_by_staff_id', staffMember.id)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
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
// Helper function: Time Analytics
async function getTimeAnalytics(branchId, start, end) {
    const dailyData = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setDate(dayEnd.getDate() + 1);
        // Get renewals for this day
        const { data: renewals } = await supabase_1.supabase
            .from('member_renewals')
            .select(`
        *,
        members!inner(branch_id)
      `)
            .eq('members.branch_id', branchId)
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString());
        // Get new members for this day
        const { data: newMembers } = await supabase_1.supabase
            .from('members')
            .select('*')
            .eq('branch_id', branchId)
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString());
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
    }
    return {
        daily: dailyData,
        totalDays: dailyData.length,
        peakDay: dailyData.reduce((max, day) => day.revenue > max.revenue ? day : max, dailyData[0] || { date: '', revenue: 0 }),
        averageDaily: dailyData.reduce((sum, day) => sum + day.revenue, 0) / dailyData.length
    };
}
// Helper function: Package Distribution
function getPackageDistribution(members) {
    const distribution = {};
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
console.log('📊 Analytics routes loaded successfully');
//# sourceMappingURL=analytics.js.map