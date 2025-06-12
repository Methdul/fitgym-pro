
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Calendar, DollarSign, CreditCard, Clock, Repeat } from 'lucide-react';
import { Member, MemberRenewal } from '@/types';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface MemberMembershipProps {
  member: Member;
  onMemberUpdate: (member: Member) => void;
}

const MemberMembership = ({ member, onMemberUpdate }: MemberMembershipProps) => {
  const [renewals, setRenewals] = useState<MemberRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRenewals();
  }, [member.id]);

  const fetchRenewals = async () => {
    try {
      const { data, error } = await db.renewals.getByMemberId(member.id);
      if (error) throw error;
      setRenewals(data || []);
    } catch (error) {
      console.error('Error fetching renewals:', error);
      toast({
        title: "Error",
        description: "Failed to load renewal history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysRemaining = () => {
    const expiry = new Date(member.expiry_date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Current Membership */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Membership
          </CardTitle>
          <CardDescription>
            Your active membership details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge className={getStatusColor(member.status)}>
                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
              </Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Package</label>
              <p className="text-sm font-medium">{member.package_name}</p>
              <p className="text-xs text-muted-foreground">
                {member.package_type} • ${member.package_price}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{new Date(member.start_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{new Date(member.expiry_date).toLocaleDateString()}</p>
                  <p className={`text-xs ${
                    daysRemaining > 7 ? 'text-green-600' : 
                    daysRemaining > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 
                     daysRemaining === 0 ? 'Expires today' : 'Expired'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {(member.status === 'expired' || daysRemaining <= 7) && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800">
                  {member.status === 'expired' ? 'Membership Expired' : 'Membership Expiring Soon'}
                </p>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Contact your gym staff to renew your membership and continue enjoying all benefits.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renewal History */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Renewal History
          </CardTitle>
          <CardDescription>
            Your membership renewal records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : renewals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No renewal history yet</p>
              <p className="text-sm">Renewals will appear here once processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {renewals.map((renewal) => (
                <div key={renewal.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Date</label>
                      <p className="text-sm">{new Date(renewal.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Amount</label>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <p className="text-sm font-medium">{renewal.amount_paid}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        <p className="text-sm capitalize">{renewal.payment_method}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Extended from {new Date(renewal.previous_expiry).toLocaleDateString()} to{' '}
                      {new Date(renewal.new_expiry).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberMembership;
