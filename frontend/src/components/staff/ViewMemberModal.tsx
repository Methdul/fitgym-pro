import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar, 
  Shield,
  TrendingUp,
  Clock,
  ExternalLink  // ✅ ADDED: Import for the new button
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

  // ✅ ADDED: Function to handle opening member dashboard in new tab
  const handleViewMoreDetails = (memberId: string) => {
    const url = `/member-dashboard/${memberId}?staffView=true`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
        
        {/* Single Professional Card with All Information */}
        <Card className="gym-card-gradient border-border">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Member Profile: {member.first_name} {member.last_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
                  <p className="font-medium">{member.first_name} {member.last_name}</p>
                </div>
                
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <p className="text-sm">{member.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                    <p className="text-sm">{member.phone}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">National ID</p>
                  <p className="text-sm font-mono bg-muted/30 px-2 py-1 rounded">{member.national_id}</p>
                </div>
                
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Verification Status</p>
                    <Badge variant={member.is_verified ? "default" : "secondary"}>
                      {member.is_verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Membership Information Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Membership Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Current Status</p>
                  <Badge className={getStatusBadgeColor(member.status)}>
                    {(member.status || 'Unknown').charAt(0).toUpperCase() + (member.status || 'unknown').slice(1)}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Package</p>
                  <p className="font-medium">{member.package_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.package_type}</p>
                </div>
                
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Expiry Date</p>
                    <p className="text-sm font-medium">{formatDate(member.expiry_date)}</p>
                    {daysUntilExpiry > 0 ? (
                      <p className="text-xs text-green-600 font-medium">{daysUntilExpiry} days remaining</p>
                    ) : (
                      <p className="text-xs text-red-600 font-medium">Expired {Math.abs(daysUntilExpiry)} days ago</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Section - Professional placement */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-sm text-muted-foreground">
              View complete member dashboard with detailed information and activity history
            </div>
            <Button 
              onClick={() => handleViewMoreDetails(member.id)}
              variant="outline"
              className="min-w-[180px]"
              size="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View More Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};