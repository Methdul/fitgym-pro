import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Download,
  RefreshCw,
  Package,
  Crown,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  CalendarDays
} from 'lucide-react';
import { db, getAuthHeaders } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  period: { start: string; end: string };
  revenue: {
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
  };
  transactions: Array<{
    id: string;
    date: string;
    memberName: string;
    type: string;
    packageName: string;
    amount: number;
    paymentMethod: string;
    processedBy: string;
    memberStatus: string;
  }>;
  memberAnalytics: {
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
  };
  packagePerformance: Array<{
    id: string;
    name: string;
    type: string;
    price: number;
    sales: number;
    revenue: number;
    newMemberships: number;
    renewals: number;
  }>;
  staffPerformance: Array<{
    id: string;
    name: string;
    role: string;
    newMembers: number;
    renewals: number;
    totalTransactions: number;
    revenue: number;
  }>;
  timeAnalytics: {
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
  };
}

interface AnalyticsTabProps {
  branchId: string;
  branchName: string;
}

const AnalyticsTab = ({ branchId, branchName }: AnalyticsTabProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [branchId, dateRange, customStartDate, customEndDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let startDate, endDate;

      if (dateRange === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const now = new Date();
        switch (dateRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0];
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        }
      }

      const { data, error } = await db.analytics.getBranchAnalytics(branchId, startDate, endDate);
      
      if (error) {
        throw error;
      }

      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPeriodLabel = () => {
    switch (dateRange) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      case 'custom': return 'Custom Period';
      default: return 'This Month';
    }
  };

  const fetchAdditionalData = async () => {
    try {
      // Fetch members data
      const { data: membersData } = await db.members.getByBranch(branchId);
      
      // Fetch staff data
      const { data: staffData } = await db.staff.getByBranch(branchId);
      
      // Fetch packages data
      const packagesResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`, {
        headers: getAuthHeaders()
      });
      const packagesResult = await packagesResponse.json();
      const packagesData = packagesResult.status === 'success' ? packagesResult.data : [];

      // Fetch branch data
      const { data: branchData } = await db.branches.getById(branchId);

      return {
        members: membersData || [],
        staff: staffData || [],
        packages: packagesData || [],
        branch: branchData
      };
    } catch (error) {
      console.error('Error fetching additional data:', error);
      return {
        members: [],
        staff: [],
        packages: [],
        branch: null
      };
    }
  };

  const generateCSVReport = async () => {
    if (!analytics) {
      toast({
        title: "No Data",
        description: "No analytics data available to generate report",
        variant: "destructive",
      });
      return;
    }

    setDownloadLoading(true);
    
    try {
      // Fetch additional data
      const additionalData = await fetchAdditionalData();
      
      const periodLabel = getCurrentPeriodLabel();

      // Generate comprehensive CSV content
      const csvContent = generateCSVContent(analytics, additionalData, periodLabel, {
        startFormatted: new Date(analytics.period.start).toLocaleDateString(),
        endFormatted: new Date(analytics.period.end).toLocaleDateString()
      });
      
      // Download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${branchName.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "CSV Download Complete! 📊",
        description: `${periodLabel} analytics report downloaded successfully`,
      });

      setShowDownloadModal(false);
      
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate CSV report",
        variant: "destructive",
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const generatePDFReport = async () => {
    if (!analytics) {
      toast({
        title: "No Data",
        description: "No analytics data available to generate report",
        variant: "destructive",
      });
      return;
    }

    setDownloadLoading(true);
    
    try {
      // For now, we'll create a simple HTML report that can be printed as PDF
      const additionalData = await fetchAdditionalData();
      const periodLabel = getCurrentPeriodLabel();
      
      // Create a new window with formatted HTML content
      const htmlContent = generateHTMLReport(analytics, additionalData, periodLabel);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Automatically trigger print dialog
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      toast({
        title: "PDF Report Opened! 📄",
        description: `${periodLabel} report opened in new window. Use browser's print function to save as PDF.`,
      });

      setShowDownloadModal(false);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF report. Please try CSV format.",
        variant: "destructive",
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const generateHTMLReport = (analytics: AnalyticsData, additionalData: any, periodLabel: string) => {
    const { members, staff, packages } = additionalData;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FitGym Pro Analytics Report - ${branchName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { background: #2980b9; color: white; padding: 20px; margin: -40px -40px 30px -40px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .section { margin: 30px 0; }
        .section h2 { color: #2980b9; border-bottom: 2px solid #2980b9; padding-bottom: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2980b9; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2980b9; }
        .metric-label { font-size: 14px; color: #666; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        @media print { body { margin: 20px; } .header { margin: -20px -20px 20px -20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>FitGym Pro Analytics Report</h1>
        <p>${branchName} • ${periodLabel} • ${new Date(analytics.period.start).toLocaleDateString()} - ${new Date(analytics.period.end).toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value">$${analytics.revenue.total.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Total Members</div>
                <div class="metric-value">${analytics.memberAnalytics.total}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Active Members</div>
                <div class="metric-value">${analytics.memberAnalytics.active}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Daily Average</div>
                <div class="metric-value">$${analytics.revenue.dailyAverage.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Retention Rate</div>
                <div class="metric-value">${analytics.memberAnalytics.retentionRate}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">New Members</div>
                <div class="metric-value">${analytics.memberAnalytics.newThisPeriod}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Revenue Breakdown</h2>
        <table>
            <tr><th>Category</th><th>Amount</th><th>Percentage</th></tr>
            <tr><td>New Memberships</td><td>$${analytics.revenue.newMemberships.toFixed(2)}</td><td>${((analytics.revenue.newMemberships / analytics.revenue.total) * 100).toFixed(1)}%</td></tr>
            <tr><td>Renewals</td><td>$${analytics.revenue.renewals.toFixed(2)}</td><td>${((analytics.revenue.renewals / analytics.revenue.total) * 100).toFixed(1)}%</td></tr>
            <tr><td>Upgrades</td><td>$${analytics.revenue.upgrades.toFixed(2)}</td><td>${((analytics.revenue.upgrades / analytics.revenue.total) * 100).toFixed(1)}%</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Member Analytics</h2>
        <table>
            <tr><th>Metric</th><th>Count</th><th>Percentage</th></tr>
            <tr><td>Total Members</td><td>${analytics.memberAnalytics.total}</td><td>100.0%</td></tr>
            <tr><td>Active Members</td><td>${analytics.memberAnalytics.active}</td><td>${((analytics.memberAnalytics.active / analytics.memberAnalytics.total) * 100).toFixed(1)}%</td></tr>
            <tr><td>Expired Members</td><td>${analytics.memberAnalytics.expired}</td><td>${((analytics.memberAnalytics.expired / analytics.memberAnalytics.total) * 100).toFixed(1)}%</td></tr>
            <tr><td>New This Period</td><td>${analytics.memberAnalytics.newThisPeriod}</td><td>${((analytics.memberAnalytics.newThisPeriod / analytics.memberAnalytics.total) * 100).toFixed(1)}%</td></tr>
        </table>
    </div>

    ${analytics.packagePerformance.length > 0 ? `
    <div class="section">
        <h2>Package Performance</h2>
        <table>
            <tr><th>Package</th><th>Type</th><th>Sales</th><th>Revenue</th></tr>
            ${analytics.packagePerformance.map(pkg => 
                `<tr><td>${pkg.name}</td><td>${pkg.type}</td><td>${pkg.sales}</td><td>$${pkg.revenue.toFixed(2)}</td></tr>`
            ).join('')}
        </table>
    </div>
    ` : ''}

    ${analytics.staffPerformance.length > 0 ? `
    <div class="section">
        <h2>Staff Performance</h2>
        <table>
            <tr><th>Staff</th><th>Role</th><th>New Members</th><th>Renewals</th><th>Revenue</th></tr>
            ${analytics.staffPerformance.map(staff => 
                `<tr><td>${staff.name}</td><td>${staff.role.replace('_', ' ')}</td><td>${staff.newMembers}</td><td>${staff.renewals}</td><td>$${staff.revenue.toFixed(2)}</td></tr>`
            ).join('')}
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>Generated by FitGym Pro Analytics on ${new Date().toLocaleString()} | Report contains ${analytics.transactions.length} transactions</p>
    </div>
</body>
</html>`;
  };

  const generateCSVContent = (analytics: AnalyticsData, additionalData: any, periodLabel: string, dateRange: any) => {
    const { members, staff, packages, branch } = additionalData;
    const csvRows: string[] = [];

    // Helper function to escape CSV values
    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Header Section
    csvRows.push(`FITGYM PRO - COMPREHENSIVE ANALYTICS REPORT`);
    csvRows.push(``);
    csvRows.push(`Branch Name,${escapeCSV(branchName)}`);
    csvRows.push(`Report Period,${periodLabel}`);
    csvRows.push(`Date Range,${dateRange.startFormatted} to ${dateRange.endFormatted}`);
    csvRows.push(`Generated On,${new Date().toLocaleString()}`);
    csvRows.push(`Total Days in Period,${analytics.timeAnalytics.totalDays}`);
    csvRows.push(``);

    // Executive Summary
    csvRows.push(`=== EXECUTIVE SUMMARY ===`);
    csvRows.push(`Total Revenue,$${analytics.revenue.total.toFixed(2)}`);
    csvRows.push(`Total Members,${analytics.memberAnalytics.total}`);
    csvRows.push(`Active Members,${analytics.memberAnalytics.active}`);
    csvRows.push(`Total Staff,${staff.length}`);
    csvRows.push(`Total Packages,${packages.length}`);
    csvRows.push(`Daily Average Revenue,$${analytics.revenue.dailyAverage.toFixed(2)}`);
    csvRows.push(`Member Retention Rate,${analytics.memberAnalytics.retentionRate}%`);
    csvRows.push(``);

    // Revenue Analysis
    csvRows.push(`=== REVENUE ANALYSIS ===`);
    csvRows.push(`Category,Amount,Percentage of Total`);
    csvRows.push(`New Memberships,$${analytics.revenue.newMemberships.toFixed(2)},${((analytics.revenue.newMemberships / analytics.revenue.total) * 100).toFixed(1)}%`);
    csvRows.push(`Renewals,$${analytics.revenue.renewals.toFixed(2)},${((analytics.revenue.renewals / analytics.revenue.total) * 100).toFixed(1)}%`);
    csvRows.push(`Upgrades,$${analytics.revenue.upgrades.toFixed(2)},${((analytics.revenue.upgrades / analytics.revenue.total) * 100).toFixed(1)}%`);
    csvRows.push(`Total Revenue,$${analytics.revenue.total.toFixed(2)},100.0%`);
    csvRows.push(``);
    csvRows.push(`Previous Period Comparison`);
    csvRows.push(`Previous Period Revenue,$${analytics.revenue.comparison.previous.toFixed(2)}`);
    csvRows.push(`Change Amount,$${analytics.revenue.comparison.change.toFixed(2)}`);
    csvRows.push(`Change Percentage,${analytics.revenue.comparison.changePercent.toFixed(1)}%`);
    csvRows.push(``);

    // Member Analytics
    csvRows.push(`=== MEMBER ANALYTICS ===`);
    csvRows.push(`Metric,Count,Percentage`);
    csvRows.push(`Total Members,${analytics.memberAnalytics.total},100.0%`);
    csvRows.push(`Active Members,${analytics.memberAnalytics.active},${((analytics.memberAnalytics.active / analytics.memberAnalytics.total) * 100).toFixed(1)}%`);
    csvRows.push(`Expired Members,${analytics.memberAnalytics.expired},${((analytics.memberAnalytics.expired / analytics.memberAnalytics.total) * 100).toFixed(1)}%`);
    csvRows.push(`New This Period,${analytics.memberAnalytics.newThisPeriod},${((analytics.memberAnalytics.newThisPeriod / analytics.memberAnalytics.total) * 100).toFixed(1)}%`);
    csvRows.push(`Renewals This Period,${analytics.memberAnalytics.renewalsThisPeriod},-`);
    csvRows.push(``);

    // Package Distribution
    csvRows.push(`=== PACKAGE DISTRIBUTION ===`);
    csvRows.push(`Package Type,Member Count,Percentage`);
    analytics.memberAnalytics.packageDistribution.forEach(dist => {
      csvRows.push(`${escapeCSV(dist.type)},${dist.count},${dist.percentage.toFixed(1)}%`);
    });
    csvRows.push(``);

    // Package Performance
    csvRows.push(`=== PACKAGE PERFORMANCE ===`);
    csvRows.push(`Package Name,Type,Price,Total Sales,Revenue,New Memberships,Renewals`);
    analytics.packagePerformance.forEach(pkg => {
      csvRows.push(`${escapeCSV(pkg.name)},${escapeCSV(pkg.type)},$${pkg.price.toFixed(2)},${pkg.sales},$${pkg.revenue.toFixed(2)},${pkg.newMemberships},${pkg.renewals}`);
    });
    csvRows.push(``);

    // Staff Performance
    csvRows.push(`=== STAFF PERFORMANCE ===`);
    csvRows.push(`Staff Name,Role,New Members,Renewals,Total Transactions,Revenue Generated`);
    analytics.staffPerformance.forEach(staff => {
      csvRows.push(`${escapeCSV(staff.name)},${escapeCSV(staff.role)},${staff.newMembers},${staff.renewals},${staff.totalTransactions},$${staff.revenue.toFixed(2)}`);
    });
    csvRows.push(``);

    // Daily Performance
    csvRows.push(`=== DAILY PERFORMANCE ===`);
    csvRows.push(`Date,Revenue,Transactions,New Members,Renewals`);
    analytics.timeAnalytics.daily.forEach(day => {
      csvRows.push(`${day.date},$${day.revenue.toFixed(2)},${day.transactions},${day.newMembers},${day.renewals}`);
    });
    csvRows.push(``);
    csvRows.push(`Peak Performance Day,${analytics.timeAnalytics.peakDay.date},$${analytics.timeAnalytics.peakDay.revenue.toFixed(2)}`);
    csvRows.push(`Average Daily Revenue,$${analytics.timeAnalytics.averageDaily.toFixed(2)}`);
    csvRows.push(``);

    // Detailed Transactions
    csvRows.push(`=== DETAILED TRANSACTIONS ===`);
    csvRows.push(`Date,Member Name,Transaction Type,Package,Amount,Payment Method,Processed By,Member Status`);
    analytics.transactions.forEach(transaction => {
      csvRows.push(`${new Date(transaction.date).toLocaleDateString()},${escapeCSV(transaction.memberName)},${escapeCSV(transaction.type)},${escapeCSV(transaction.packageName)},$${transaction.amount.toFixed(2)},${escapeCSV(transaction.paymentMethod)},${escapeCSV(transaction.processedBy)},${escapeCSV(transaction.memberStatus)}`);
    });
    csvRows.push(``);

    // Current Staff Directory
    csvRows.push(`=== CURRENT STAFF DIRECTORY ===`);
    csvRows.push(`Name,Role,Email,Phone,Joined Date,Last Active`);
    staff.forEach((staffMember: any) => {
      csvRows.push(`${escapeCSV(staffMember.first_name)} ${escapeCSV(staffMember.last_name)},${escapeCSV(staffMember.role)},${escapeCSV(staffMember.email)},${escapeCSV(staffMember.phone || 'N/A')},${new Date(staffMember.created_at).toLocaleDateString()},${staffMember.last_active ? new Date(staffMember.last_active).toLocaleDateString() : 'N/A'}`);
    });
    csvRows.push(``);

    // Current Packages
    csvRows.push(`=== CURRENT PACKAGES ===`);
    csvRows.push(`Package Name,Type,Price,Duration (Months),Max Members,Status,Features`);
    packages.forEach((pkg: any) => {
      csvRows.push(`${escapeCSV(pkg.name)},${escapeCSV(pkg.type)},$${pkg.price.toFixed(2)},${pkg.duration_months},${pkg.max_members},${pkg.is_active ? 'Active' : 'Inactive'},${escapeCSV(pkg.features.join('; '))}`);
    });
    csvRows.push(``);

    // Member Status Summary
    csvRows.push(`=== MEMBER STATUS SUMMARY ===`);
    const activeMembers = members.filter((m: any) => {
      const now = new Date();
      const expiryDate = new Date(m.expiry_date);
      return m.status === 'active' && expiryDate > now;
    }).length;
    const expiredMembers = members.filter((m: any) => {
      const now = new Date();
      const expiryDate = new Date(m.expiry_date);
      return m.status === 'expired' || expiryDate <= now;
    }).length;
    const suspendedMembers = members.filter((m: any) => m.status === 'suspended').length;
    
    csvRows.push(`Status,Count,Percentage`);
    csvRows.push(`Active,${activeMembers},${members.length > 0 ? ((activeMembers / members.length) * 100).toFixed(1) : 0}%`);
    csvRows.push(`Expired,${expiredMembers},${members.length > 0 ? ((expiredMembers / members.length) * 100).toFixed(1) : 0}%`);
    csvRows.push(`Suspended,${suspendedMembers},${members.length > 0 ? ((suspendedMembers / members.length) * 100).toFixed(1) : 0}%`);
    csvRows.push(``);

    // Branch Information
    csvRows.push(`=== BRANCH INFORMATION ===`);
    if (branch) {
      csvRows.push(`Branch ID,${escapeCSV(branch.id)}`);
      csvRows.push(`Branch Name,${escapeCSV(branch.name)}`);
      csvRows.push(`Location,${escapeCSV(branch.location || 'N/A')}`);
      csvRows.push(`Phone,${escapeCSV(branch.phone || 'N/A')}`);
      csvRows.push(`Email,${escapeCSV(branch.email || 'N/A')}`);
      csvRows.push(`Established,${branch.created_at ? new Date(branch.created_at).toLocaleDateString() : 'N/A'}`);
    }
    csvRows.push(``);

    // Footer
    csvRows.push(`=== REPORT END ===`);
    csvRows.push(`This report was generated by FitGym Pro Analytics System`);
    csvRows.push(`Report contains ${analytics.transactions.length} transactions, ${members.length} members, ${staff.length} staff, and ${packages.length} packages`);

    return csvRows.join('\n');
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getChangeColor = (change: number) => change >= 0 ? 'text-green-600' : 'text-red-600';
  const getChangeIcon = (change: number) => change >= 0 ? '↗' : '↘';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
            <p className="text-muted-foreground">Financial and operational insights for {branchName}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-8 bg-muted rounded mb-1" />
                <div className="h-3 bg-muted rounded w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">Unable to load analytics data for this period</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Financial and operational insights for {branchName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Download Report
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                    <BarChart3 className="h-4 w-4" />
                    Report for {getCurrentPeriodLabel()}
                  </div>
                  <p className="text-sm text-blue-600">
                    Download analytics report for {branchName} covering {new Date(analytics.period.start).toLocaleDateString()} to {new Date(analytics.period.end).toLocaleDateString()}.
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">Choose your preferred format:</p>
                  
                  <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
                    <Button 
                      onClick={generatePDFReport}
                      disabled={downloadLoading}
                      className="h-16 flex flex-col items-center justify-center gap-1 bg-red-600 hover:bg-red-700 w-full"
                    >
                      {downloadLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Generating...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-lg">PDF</span>
                          <span className="text-xs opacity-90">Printable Report</span>
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={generateCSVReport}
                      disabled={downloadLoading}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center gap-1 border-2 w-full"
                    >
                      {downloadLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Generating...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-lg">CSV</span>
                          <span className="text-xs opacity-70">Raw Data Export</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowDownloadModal(false)}
                    disabled={downloadLoading}
                    className="px-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="dateRange">Period:</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="startDate">From:</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="endDate">To:</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </>
            )}

            <Badge variant="outline" className="ml-auto">
              {new Date(analytics.period.start).toLocaleDateString()} - {new Date(analytics.period.end).toLocaleDateString()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.total)}</p>
                <p className={`text-xs ${getChangeColor(analytics.revenue.comparison.change)}`}>
                  {getChangeIcon(analytics.revenue.comparison.change)} {formatCurrency(Math.abs(analytics.revenue.comparison.change))} ({analytics.revenue.comparison.changePercent.toFixed(1)}%)
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Memberships</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.newMemberships)}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.memberAnalytics.newThisPeriod} members
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Renewals</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.renewals)}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.memberAnalytics.renewalsThisPeriod} renewals
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Average</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.dailyAverage)}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.timeAnalytics.totalDays} days
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Member</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Package</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Payment</th>
                      <th className="text-left p-2">Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                        <td className="p-2 font-medium">{transaction.memberName}</td>
                        <td className="p-2">
                          <Badge variant={transaction.type === 'New Membership' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </td>
                        <td className="p-2">{transaction.packageName}</td>
                        <td className="p-2 font-bold text-green-600">{formatCurrency(transaction.amount)}</td>
                        <td className="p-2">{transaction.paymentMethod}</td>
                        <td className="p-2">{transaction.processedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {analytics.transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Members</span>
                  <span className="font-bold">{analytics.memberAnalytics.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Members</span>
                  <span className="font-bold text-green-600">{analytics.memberAnalytics.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Expired Members</span>
                  <span className="font-bold text-red-600">{analytics.memberAnalytics.expired}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>New This Period</span>
                  <span className="font-bold text-blue-600">{analytics.memberAnalytics.newThisPeriod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Renewals</span>
                  <span className="font-bold text-purple-600">{analytics.memberAnalytics.renewalsThisPeriod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Retention Rate</span>
                  <span className="font-bold">{analytics.memberAnalytics.retentionRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Package Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.memberAnalytics.packageDistribution.map((dist) => (
                    <div key={dist.type} className="flex items-center justify-between">
                      <span className="capitalize">{dist.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{dist.count} members</span>
                        <Badge variant="outline">{dist.percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>Package Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.packagePerformance.map((pkg) => (
                  <Card key={pkg.id} className="border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <Badge variant="outline">{pkg.type}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <span className="font-bold text-green-600">{formatCurrency(pkg.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Sales:</span>
                        <span className="font-bold">{pkg.sales}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New Members:</span>
                        <span className="text-blue-600">{pkg.newMemberships}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Renewals:</span>
                        <span className="text-purple-600">{pkg.renewals}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Staff Member</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">New Members</th>
                      <th className="text-left p-2">Renewals</th>
                      <th className="text-left p-2">Total Transactions</th>
                      <th className="text-left p-2">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.staffPerformance.map((staff) => (
                      <tr key={staff.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{staff.name}</td>
                        <td className="p-2">
                          <Badge variant="outline">{staff.role.replace('_', ' ')}</Badge>
                        </td>
                        <td className="p-2">{staff.newMembers}</td>
                        <td className="p-2">{staff.renewals}</td>
                        <td className="p-2">{staff.totalTransactions}</td>
                        <td className="p-2 font-bold text-green-600">{formatCurrency(staff.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analytics.timeAnalytics.daily.map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-2 border rounded">
                      <span>{new Date(day.date).toLocaleDateString()}</span>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{formatCurrency(day.revenue)}</div>
                        <div className="text-xs text-muted-foreground">{day.transactions} transactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 border rounded bg-green-50">
                  <div className="font-medium text-green-800">Peak Day</div>
                  <div className="text-sm text-green-600">
                    {new Date(analytics.timeAnalytics.peakDay.date).toLocaleDateString()}: {formatCurrency(analytics.timeAnalytics.peakDay.revenue)}
                  </div>
                </div>
                <div className="p-3 border rounded bg-blue-50">
                  <div className="font-medium text-blue-800">Daily Average</div>
                  <div className="text-sm text-blue-600">
                    {formatCurrency(analytics.timeAnalytics.averageDaily)} per day
                  </div>
                </div>
                <div className="p-3 border rounded bg-purple-50">
                  <div className="font-medium text-purple-800">Top Package</div>
                  <div className="text-sm text-purple-600">
                    {analytics.packagePerformance[0]?.name}: {formatCurrency(analytics.packagePerformance[0]?.revenue || 0)}
                  </div>
                </div>
                <div className="p-3 border rounded bg-orange-50">
                  <div className="font-medium text-orange-800">Top Staff</div>
                  <div className="text-sm text-orange-600">
                    {analytics.staffPerformance[0]?.name}: {formatCurrency(analytics.staffPerformance[0]?.revenue || 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsTab;