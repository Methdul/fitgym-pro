import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  member_id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  staff_response?: string;
}

interface MemberReportsProps {
  memberId: string;
}

const MemberReports = ({ memberId }: MemberReportsProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newReport, setNewReport] = useState<{
    category: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>({
    category: '',
    title: '',
    description: '',
    priority: 'medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [memberId]);

  const fetchReports = async () => {
    try {
      const { data, error } = await db.reports.getByMemberId(memberId);
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!newReport.category || !newReport.title || !newReport.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const reportData = {
        member_id: memberId,
        category: newReport.category,
        title: newReport.title,
        description: newReport.description,
        priority: newReport.priority,
        status: 'pending' as const
      };

      const { error } = await db.reports.create(reportData);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Report submitted successfully",
      });

      setNewReport({
        category: '',
        title: '',
        description: '',
        priority: 'medium'
      });
      setIsCreateModalOpen(false);
      fetchReports();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertTriangle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const reportCategories = [
    'Equipment Issue',
    'Facility Problem',
    'Staff Complaint',
    'Safety Concern',
    'Cleanliness',
    'Billing Issue',
    'Other'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending' || r.status === 'in_progress');
  const resolvedReports = reports.filter(r => r.status === 'resolved' || r.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Header with Submit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Issues</h2>
          <p className="text-muted-foreground">Submit and track your gym-related reports</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Submit Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit New Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={newReport.category} onValueChange={(value) => 
                  setNewReport(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <input
                  id="title"
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md"
                  value={newReport.title}
                  onChange={(e) => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of the issue"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newReport.priority} onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setNewReport(prev => ({ ...prev, priority: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newReport.description}
                  onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the issue..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitReport} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No reports submitted yet</p>
            <p className="text-sm text-muted-foreground">
              Submit a report if you encounter any issues at the gym
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pending Reports */}
          {pendingReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Reports ({pendingReports.length})
                </CardTitle>
                <CardDescription>
                  Reports currently being processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingReports.map(report => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-muted-foreground">{report.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(report.priority)}>
                          {report.priority}
                        </Badge>
                        <Badge className={getStatusColor(report.status)}>
                          {getStatusIcon(report.status)}
                          <span className="ml-1 capitalize">{report.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{report.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted on {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    {report.staff_response && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-800">Staff Response:</p>
                        <p className="text-sm text-blue-700">{report.staff_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Resolved Reports */}
          {resolvedReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Resolved Reports ({resolvedReports.length})
                </CardTitle>
                <CardDescription>
                  Previously resolved reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resolvedReports.map(report => (
                  <div key={report.id} className="border rounded-lg p-4 opacity-75">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-muted-foreground">{report.category}</p>
                      </div>
                      <Badge className={getStatusColor(report.status)}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1 capitalize">{report.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{report.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Resolved on {new Date(report.updated_at).toLocaleDateString()}
                    </p>
                    {report.staff_response && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-800">Resolution:</p>
                        <p className="text-sm text-green-700">{report.staff_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default MemberReports;
