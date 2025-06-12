
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar, 
  Shield,
  TrendingUp,
  Clock
} from 'lucide-react';
import type { Member } from '@/types';

interface ViewMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
}

export const ViewMemberModal = ({ open, onOpenChange, member }: ViewMemberModalProps) => {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'suspended': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = () => {
    const today = new Date();
    const expiryDate = new Date(member.expiry_date);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Member Profile: {member.first_name} {member.last_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <Card className="gym-card-gradient border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{member.first_name} {member.last_name}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm">{member.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm">{member.phone}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">National ID</p>
                <p className="text-sm font-mono">{member.national_id}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Verification Status</p>
                  <Badge variant={member.is_verified ? "default" : "secondary"}>
                    {member.is_verified ? "Verified" : "Not Verified"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Membership Status */}
          <Card className="gym-card-gradient border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Membership Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <Badge className={getStatusBadgeColor(member.status)}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Package</p>
                <p className="font-medium">{member.package_name}</p>
                <Badge variant="outline" className="mt-1">
                  {member.package_type}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Package Price</p>
                <p className="text-lg font-bold text-primary">${member.package_price}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-sm">{formatDate(member.start_date)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Expiry Date</p>
                  <p className="text-sm">{formatDate(member.expiry_date)}</p>
                  {daysUntilExpiry > 0 ? (
                    <p className="text-xs text-green-600">{daysUntilExpiry} days remaining</p>
                  ) : (
                    <p className="text-xs text-red-600">Expired {Math.abs(daysUntilExpiry)} days ago</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member Statistics */}
          <Card className="gym-card-gradient border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Member Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">{formatDate(member.created_at)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(member.updated_at)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Quick Stats</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Total Renewals</p>
                    <p className="font-bold">0</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="font-bold">${member.package_price}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Member ID</p>
                <p className="text-xs font-mono bg-muted p-2 rounded">{member.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
