
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, TrendingUp } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CheckIn {
  id: string;
  member_id: string;
  branch_id: string;
  check_in_date: string;
  check_in_time: string;
  branches?: {
    name: string;
  };
}

interface MemberCheckInsProps {
  memberId: string;
}

const MemberCheckIns = ({ memberId }: MemberCheckInsProps) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    thisMonth: 0,
    thisWeek: 0,
    averagePerMonth: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCheckIns();
  }, [memberId]);

  const fetchCheckIns = async () => {
    try {
      const { data, error } = await db.checkIns.getByMemberId(memberId);
      if (error) throw error;
      
      const checkInsData = data || [];
      setCheckIns(checkInsData);
      calculateStats(checkInsData);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      toast({
        title: "Error",
        description: "Failed to load check-in history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (checkInsData: CheckIn[]) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thisMonthCount = checkInsData.filter(
      checkIn => new Date(checkIn.check_in_date) >= thisMonth
    ).length;

    const thisWeekCount = checkInsData.filter(
      checkIn => new Date(checkIn.check_in_date) >= thisWeek
    ).length;

    // Calculate average per month (simplified)
    const months = Math.max(1, Math.ceil(checkInsData.length / 30)); // Rough estimate
    const averagePerMonth = Math.round(checkInsData.length / months);

    setStats({
      totalCheckIns: checkInsData.length,
      thisMonth: thisMonthCount,
      thisWeek: thisWeekCount,
      averagePerMonth
    });
  };

  const groupCheckInsByMonth = () => {
    const grouped: { [key: string]: CheckIn[] } = {};
    
    checkIns.forEach(checkIn => {
      const date = new Date(checkIn.check_in_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(checkIn);
    });

    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  };

  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedCheckIns = groupCheckInsByMonth();

  return (
    <div className="space-y-6">
      {/* Check-in Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averagePerMonth}</div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Check-in History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Check-in History
          </CardTitle>
          <CardDescription>
            Your gym visit history by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkIns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No check-ins recorded yet</p>
              <p className="text-sm">Your gym visits will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedCheckIns.map(([monthKey, monthCheckIns]) => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { 
                  month: 'long', 
                  year: 'numeric' 
                });

                return (
                  <div key={monthKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-semibold">{monthName}</h3>
                      <Badge variant="secondary">{monthCheckIns.length} visits</Badge>
                    </div>
                    <div className="grid gap-2">
                      {monthCheckIns.map((checkIn) => (
                        <div key={checkIn.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(checkIn.check_in_date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{checkIn.branches?.name || 'Branch'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(checkIn.check_in_time)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberCheckIns;
