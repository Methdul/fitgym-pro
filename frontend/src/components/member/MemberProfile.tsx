
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin, AlertCircle, Shield } from 'lucide-react';
import { Member } from '@/types';

interface MemberProfileProps {
  member: Member;
}

const MemberProfile = ({ member }: MemberProfileProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Personal Information */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your basic profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">First Name</label>
              <p className="text-sm font-medium">{member.first_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Name</label>
              <p className="text-sm font-medium">{member.last_name}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Member ID</label>
            <p className="text-sm font-medium font-mono">{member.id.substring(0, 8).toUpperCase()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-sm">{member.phone}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">National ID</label>
            <p className="text-sm font-mono">{member.national_id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
            <div className="flex items-center gap-2 mt-1">
              {member.is_verified ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Verified</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600">Pending Verification</span>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Member Since</label>
            <p className="text-sm">{new Date(member.created_at).toLocaleDateString()}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Account Type</label>
            <p className="text-sm capitalize">{member.package_type}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <p className="text-sm">{new Date(member.updated_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberProfile;
