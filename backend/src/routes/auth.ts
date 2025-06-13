import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({
        status: 'error',
        error: error.message
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    res.json({
      status: 'success',
      data: {
        user: data.user,
        session: data.session,
        profile
      }
    });
  } catch (error) {
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

    const result = await response.json() as any;

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
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    // Call Edge Function for comprehensive profile
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/user-profile`, {
      method: 'GET',
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });

    const result = await response.json() as any;

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
  } catch (error) {
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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
});

export { router as authRoutes };