import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText
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

  const handleExportData = (format: 'csv' | 'pdf') => {
    if (!analytics) return;

    if (format === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const headers = ['Date', 'Member Name', 'Type', 'Package', 'Amount', 'Payment Method', 'Processed By', 'Status'];
    const rows = analytics.transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.memberName,
      t.type,
      t.packageName,
      t.amount.toString(),
      t.paymentMethod,
      t.processedBy,
      t.memberStatus
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${branchName}-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Analytics data exported to CSV successfully",
    });
  };

  const exportToPDF = () => {
    // This would typically use a library like jsPDF
    // For now, we'll create a simple summary
    const summaryData = analytics ? `
Analytics Report - ${branchName}
Period: ${new Date(analytics.period.start).toLocaleDateString()} - ${new Date(analytics.period.end).toLocaleDateString()}

Revenue Summary:
- Total Revenue: $${analytics.revenue.total.toFixed(2)}
- New Memberships: $${analytics.revenue.newMemberships.toFixed(2)}
- Renewals: $${analytics.revenue.renewals.toFixed(2)}
- Daily Average: $${analytics.revenue.dailyAverage.toFixed(2)}

Member Analytics:
- Total Members: ${analytics.memberAnalytics.total}
- Active Members: ${analytics.memberAnalytics.active}
- New This Period: ${analytics.memberAnalytics.newThisPeriod}
- Retention Rate: ${analytics.memberAnalytics.retentionRate}%

Top Performing Packages:
${analytics.packagePerformance.slice(0, 3).map(p => `- ${p.name}: $${p.revenue.toFixed(2)} (${p.sales} sales)`).join('\n')}
    ` : '';

    const blob = new Blob([summaryData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${branchName}-analytics-summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Analytics summary exported successfully",
    });
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
          <Button variant="outline" size="sm" onClick={() => handleExportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportData('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Summary
          </Button>
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