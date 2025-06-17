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
import { db } from '@/lib/supabase';
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
  const [downloadPeriod, setDownloadPeriod] = useState('');
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

  const getDateRange = (period: string) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'past_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'past_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      startFormatted: startDate.toLocaleDateString(),
      endFormatted: endDate.toLocaleDateString()
    };
  };

  const fetchAdditionalData = async () => {
    try {
      // Fetch members data
      const { data: membersData } = await db.members.getByBranch(branchId);
      
      // Fetch staff data
      const { data: staffData } = await db.staff.getByBranch(branchId);
      
      // Fetch packages data
      const packagesResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/packages/branch/${branchId}`);
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

  const generateComprehensiveCSV = async (period: string) => {
    setDownloadLoading(true);
    
    try {
      const dateRange = getDateRange(period);
      
      // Fetch analytics data for the specific period
      const { data: analyticsData } = await db.analytics.getBranchAnalytics(branchId, dateRange.start, dateRange.end);
      
      // Fetch additional data
      const additionalData = await fetchAdditionalData();
      
      if (!analyticsData) {
        throw new Error('No analytics data available');
      }

      const periodLabel = period === 'current_month' ? 'Current Month' : 
                         period === 'past_month' ? 'Past Month' : 'Past 3 Months';

      // Generate comprehensive CSV content
      const csvContent = generateCSVContent(analyticsData, additionalData, periodLabel, dateRange);
      
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
        title: "Download Complete",
        description: `${periodLabel} analytics report downloaded successfully`,
      });

      setShowDownloadModal(false);
      setDownloadPeriod('');
      
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate analytics report",
        variant: "destructive",
      });
    } finally {
      setDownloadLoading(false);
    }
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
                  Download Analytics Report
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                    <BarChart3 className="h-4 w-4" />
                    Comprehensive Analytics Report
                  </div>
                  <p className="text-sm text-blue-600">
                    Download a detailed CSV report including revenue, members, staff, packages, and all analytics data for {branchName}.
                  </p>
                </div>

                <div>
                  <Label htmlFor="downloadPeriod">Select Report Period</Label>
                  <Select value={downloadPeriod} onValueChange={setDownloadPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Current Month Analytics
                        </div>
                      </SelectItem>
                      <SelectItem value="past_month">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Past Month Analytics
                        </div>
                      </SelectItem>
                      <SelectItem value="past_3_months">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Past 3 Months Analytics
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {downloadPeriod && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h4 className="font-medium text-green-800 mb-2">Report will include:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Executive summary and key metrics</li>
                      <li>• Revenue analysis and comparisons</li>
                      <li>• Member analytics and distribution</li>
                      <li>• Package and staff performance</li>
                      <li>• Daily performance data</li>
                      <li>• Detailed transaction records</li>
                      <li>• Current staff and package directories</li>
                      <li>• Branch information and statistics</li>
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDownloadModal(false)}
                    className="flex-1"
                    disabled={downloadLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => generateComprehensiveCSV(downloadPeriod)}
                    disabled={!downloadPeriod || downloadLoading}
                    className="flex-1"
                  >
                    {downloadLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </>
                    )}
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