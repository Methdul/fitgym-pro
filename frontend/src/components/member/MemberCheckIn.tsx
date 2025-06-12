
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';

interface Branch {
  id: string;
  name: string;
  address: string;
  facilities: string[];
}

interface MemberCheckInProps {
  memberId: string;
  branches: Branch[];
}

const MemberCheckIn = ({ memberId, branches }: MemberCheckInProps) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleCheckIn = async (branchId: string) => {
    setIsCheckingIn(true);
    try {
      const checkInData = {
        member_id: memberId,
        branch_id: branchId,
        check_in_date: new Date().toISOString().split('T')[0],
        check_in_time: new Date().toTimeString().split(' ')[0]
      };

      const { error } = await db.checkIns.create(checkInData);
      if (error) throw error;

      setLastCheckIn(new Date());
      toast({
        title: "Check-in Successful",
        description: `You've successfully checked in to ${branches.find(b => b.id === branchId)?.name}`,
      });
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Check-in Failed",
        description: "Unable to process check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const isCheckedInToday = lastCheckIn && 
    lastCheckIn.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quick Check-In
          </CardTitle>
          <CardDescription>
            Check in to your gym visit today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCheckedInToday ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-green-600">Already Checked In Today!</h3>
              <p className="text-muted-foreground">
                You checked in at {lastCheckIn?.toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((branch) => (
                <Card key={branch.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {branch.name}
                    </CardTitle>
                    <CardDescription>{branch.address}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {branch.facilities.slice(0, 3).map((facility, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {facility}
                        </Badge>
                      ))}
                      {branch.facilities.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{branch.facilities.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handleCheckIn(branch.id)}
                      disabled={isCheckingIn}
                    >
                      {isCheckingIn ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Check In Here
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check-In Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Check-In Benefits</h4>
              <p className="text-sm text-muted-foreground">
                Regular check-ins help us track your fitness journey and provide personalized recommendations.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Track Your Progress</h4>
              <p className="text-sm text-muted-foreground">
                View your check-in history and workout frequency in your profile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberCheckIn;
