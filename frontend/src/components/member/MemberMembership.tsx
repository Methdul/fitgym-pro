import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Calendar, DollarSign, CreditCard, Clock, Repeat, Shield } from 'lucide-react';
import { Member, MemberRenewal } from '@/types';
import { db } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface MemberMembershipProps {
  member: Member;
  onMemberUpdate: (member: Member) => void;
  isReadOnly?: boolean;  // ✅ ADDED: Read-only prop for staff view
}

const MemberMembership = ({ member, onMemberUpdate, isReadOnly = false }: MemberMembershipProps) => {
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
      if (!isReadOnly) {  // Only show error toast for non-staff users
        toast({
          title: "Error",
          description: "Failed to load renewal history",
          variant: "destructive",
        });
      }
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

  const getRenewalDuration = (renewal: MemberRenewal): number => {
    // Try different possible property names for duration
    if ('duration_months' in renewal) return (renewal as any).duration_months;
    if ('duration' in renewal) return (renewal as any).duration;
    if ('months' in renewal) return (renewal as any).months;
    // Default to 1 month if no duration found
    return 1;
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
            {/* ✅ ADDED: Read-only indicator */}
            {isReadOnly && (
              <Badge variant="secondary" className="ml-auto">
                Staff View - Read Only
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isReadOnly 
              ? "Member's active membership details (staff view)"
              : "Your active membership details"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge className={getStatusColor(member.status)}>
                {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Unknown'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Package</label>
              <div>
                <p className="font-medium">{member.package_name}</p>
                <p className="text-sm text-muted-foreground capitalize">{member.package_type}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Price</label>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-bold text-green-600">${member.package_price}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Expiry</label>
              <div>
                <p className="text-sm font-medium">{new Date(member.expiry_date).toLocaleDateString()}</p>
                <p className={`text-xs font-medium ${
                  daysRemaining > 7 ? 'text-green-600' : 
                  daysRemaining > 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {daysRemaining > 0 ? `${daysRemaining} days left` : `Expired ${Math.abs(daysRemaining)} days ago`}
                </p>
              </div>
            </div>
          </div>

          {/* ✅ CONDITIONAL: Show different messages for staff vs member view */}
          {!isReadOnly ? (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Need to renew your membership?</h4>
                <p className="text-sm text-muted-foreground">
                  Please visit our front desk or contact our staff for membership renewal assistance.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-sm text-muted-foreground text-center italic bg-muted/30 p-3 rounded">
                <Shield className="h-4 w-4 inline mr-2" />
                Staff View - Membership actions are disabled
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renewal History */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Renewal History
          </CardTitle>
          <CardDescription>
            {isReadOnly 
              ? "Member's past membership renewals"
              : "Your past membership renewals"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading renewal history...</p>
            </div>
          ) : renewals.length > 0 ? (
            <div className="space-y-4">
              {renewals.map((renewal, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{new Date(renewal.created_at).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">Renewed for {getRenewalDuration(renewal)} month(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${renewal.amount_paid}</p>
                    <p className="text-xs text-muted-foreground">{renewal.payment_method || 'Cash'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Repeat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2">No Renewals Yet</h4>
              <p className="text-sm text-muted-foreground">
                {isReadOnly 
                  ? "This member hasn't renewed their membership yet."
                  : "You haven't renewed your membership yet."
                }
              </p>
            </div>
          )}

          {/* ✅ ADDED: Staff view note */}
          {isReadOnly && renewals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded text-center">
                👁️ You are viewing this member's renewal history in read-only mode
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberMembership;