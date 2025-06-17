import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationBannerProps {
  userEmail: string;
  isVerified: boolean;
  onVerificationComplete?: () => void;
}

export const VerificationBanner = ({ userEmail, isVerified, onVerificationComplete }: VerificationBannerProps) => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  if (isVerified) {
    return null; // Don't show banner if already verified
  }

  const sendVerificationEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ email: userEmail })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setEmailSent(true);
        toast({
          title: "Verification Email Sent",
          description: "Please check your email for verification instructions",
        });

        // For testing - show the token
        if (result.verificationToken) {
          console.log('🧪 Test verification token:', result.verificationToken);
          toast({
            title: "Test Mode - Verification Token",
            description: `Token: ${result.verificationToken}`,
            duration: 10000,
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    if (!verificationToken.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter the verification token",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail,
          token: verificationToken.trim()
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified",
        });
        
        setShowVerifyDialog(false);
        setVerificationToken('');
        
        // Update localStorage
        const currentStatus = localStorage.getItem('user_verification_status');
        if (currentStatus) {
          const status = JSON.parse(currentStatus);
          status.isVerified = true;
          localStorage.setItem('user_verification_status', JSON.stringify(status));
        }
        
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid token",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Alert className="border-yellow-500/20 bg-yellow-500/5 mb-4">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium text-yellow-800">Email not verified</span>
            <p className="text-sm text-yellow-700 mt-1">
              Please verify your email address to access all features
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={sendVerificationEmail}
              disabled={loading || emailSent}
            >
              <Mail className="h-4 w-4 mr-2" />
              {emailSent ? 'Email Sent' : loading ? 'Sending...' : 'Send Verification'}
            </Button>
            {emailSent && (
              <Button 
                size="sm" 
                onClick={() => setShowVerifyDialog(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Enter Token
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Verification Token Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verify Your Email
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Check your email <strong>{userEmail}</strong> for the verification token, then enter it below.
              </p>
            </div>

            <div>
              <Label htmlFor="verificationToken">Verification Token</Label>
              <Input
                id="verificationToken"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                placeholder="Enter verification token"
                className="font-mono"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowVerifyDialog(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={verifyEmail} 
                disabled={verifying} 
                className="flex-1"
              >
                {verifying ? 'Verifying...' : 'Verify Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};