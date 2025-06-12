// src/routes/index.ts
import express from 'express';
import { branchRoutes } from './branches';
import { memberRoutes } from './members';
import { staffRoutes } from './staff';
import { authRoutes } from './auth';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
router.use('/members', memberRoutes);
router.use('/staff', staffRoutes);

export { router as apiRoutes };

// src/routes/branches.ts
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/branches
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');
    
    if (error) throw error;
    res.json({ data, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

// GET /api/branches/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json({ data, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

// POST /api/branches
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .insert(req.body)
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json({ data, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

export { router as branchRoutes };

// src/routes/members.ts
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/members/branch/:branchId
router.get('/branch/:branchId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('branch_id', req.params.branchId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ data, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

// POST /api/members
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .insert(req.body)
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json({ data, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

export { router as memberRoutes };

// src/routes/staff.ts
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/staff/branch/:branchId
router.get('/branch/:branchId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branch_staff')
      .select('*')
      .eq('branch_id', req.params.branchId);
    
    if (error) throw error;
    res.json({ data, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

// POST /api/staff/verify-pin
router.post('/verify-pin', async (req, res) => {
  try {
    const { staffId, pin } = req.body;
    
    const { data: staff, error } = await supabase
      .from('branch_staff')
      .select('*')
      .eq('id', staffId)
      .single();
    
    if (error || !staff) {
      return res.status(404).json({ error: 'Staff not found', status: 'error' });
    }
    
    const isValid = staff.pin === pin;
    
    if (isValid) {
      // Update last_active
      await supabase
        .from('branch_staff')
        .update({ last_active: new Date().toISOString() })
        .eq('id', staffId);
    }
    
    res.json({ 
      isValid, 
      staff: isValid ? staff : null,
      status: 'success' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

export { router as staffRoutes };

// src/routes/auth.ts
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    res.json({ data, status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message, status: 'error' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, userData } = req.body;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: userData }
    });
    
    if (error) throw error;
    res.json({ data, status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message, status: 'error' });
  }
});

export { router as authRoutes };

// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Update src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRoutes } from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'FitGym Pro API is running!',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
});

export default app;