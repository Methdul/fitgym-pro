"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.authRoutes = router;
// Sign in with email/password
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                error: 'Email and password are required'
            });
        }
        const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            return res.status(400).json({
                status: 'error',
                error: error.message
            });
        }
        // Get user profile WITH verification status
        const { data: profile } = await supabase_1.supabase
            .from('users')
            .select('*, is_verified')
            .eq('auth_user_id', data.user.id)
            .single();
        res.json({
            status: 'success',
            data: {
                user: data.user,
                session: data.session,
                profile,
                verification: {
                    isVerified: profile?.is_verified || false,
                    needsVerification: !profile?.is_verified
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Sign up with email/password
router.post('/signup', async (req, res) => {
    try {
        const { email, password, userData } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                error: 'Email and password are required'
            });
        }
        // Call Edge Function for custom signup
        const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/auth-signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ email, password, userData })
        });
        const result = await response.json();
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                error: result.error
            });
        }
        res.status(201).json({
            status: 'success',
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get current user profile
router.get('/profile', auth_1.authenticate, async (req, res) => {
    try {
        // Call Edge Function for comprehensive profile
        const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/user-profile`, {
            method: 'GET',
            headers: {
                'Authorization': req.headers.authorization || ''
            }
        });
        const result = await response.json();
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                error: result.error
            });
        }
        res.json({
            status: 'success',
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Internal server error'
        });
    }
});
// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                status: 'error',
                error: 'Email is required'
            });
        }
        const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`
        });
        if (error) {
            return res.status(400).json({
                status: 'error',
                error: error.message
            });
        }
        res.json({
            status: 'success',
            message: 'Password reset email sent'
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Internal server error'
        });
    }
});
// Send verification email
router.post('/send-verification', auth_1.authenticate, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                status: 'error',
                error: 'Email is required'
            });
        }
        // Get user profile
        const { data: userProfile, error: userError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (userError || !userProfile) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found'
            });
        }
        if (userProfile.is_verified) {
            return res.status(400).json({
                status: 'error',
                error: 'Email is already verified'
            });
        }
        // Generate verification token
        const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        // Store verification token (you could add this to users table or create a separate table)
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({
            verification_token: verificationToken,
            verification_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
            .eq('id', userProfile.id);
        if (updateError) {
            throw updateError;
        }
        // In a real app, you'd send an actual email here
        // For now, we'll just return the token for testing
        console.log(`📧 Verification email would be sent to ${email} with token: ${verificationToken}`);
        res.json({
            status: 'success',
            message: 'Verification email sent',
            // Remove this in production - only for testing
            verificationToken: verificationToken
        });
    }
    catch (error) {
        console.error('Error sending verification email:', error);
        res.status(500).json({
            status: 'error',
            error: 'Failed to send verification email'
        });
    }
});
// Verify email with token
router.post('/verify-email', async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            return res.status(400).json({
                status: 'error',
                error: 'Email and verification token are required'
            });
        }
        // Find user with matching token
        const { data: userProfile, error: userError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('verification_token', token)
            .single();
        if (userError || !userProfile) {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid verification token'
            });
        }
        // Check if token has expired
        const now = new Date();
        const tokenExpires = new Date(userProfile.verification_token_expires);
        if (now > tokenExpires) {
            return res.status(400).json({
                status: 'error',
                error: 'Verification token has expired'
            });
        }
        // Mark as verified
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({
            is_verified: true,
            verification_token: null,
            verification_token_expires: null,
            updated_at: new Date().toISOString()
        })
            .eq('id', userProfile.id);
        if (updateError) {
            throw updateError;
        }
        res.json({
            status: 'success',
            message: 'Email verified successfully'
        });
    }
    catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({
            status: 'error',
            error: 'Failed to verify email'
        });
    }
});
// Check verification status
router.get('/verification-status/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { data: userProfile, error } = await supabase_1.supabase
            .from('users')
            .select('is_verified, first_name, last_name')
            .eq('email', email)
            .single();
        if (error || !userProfile) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found'
            });
        }
        res.json({
            status: 'success',
            data: {
                isVerified: userProfile.is_verified,
                name: `${userProfile.first_name} ${userProfile.last_name}`
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Failed to check verification status'
        });
    }
});
//# sourceMappingURL=auth.js.map