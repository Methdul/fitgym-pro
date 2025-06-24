import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

// Import routes (including the updated package routes)
import { authRoutes } from './routes/auth';
import { staffRoutes } from './routes/staff';
import { memberRoutes } from './routes/members';
import { packageRoutes } from './routes/packages';
import { branchRoutes } from './routes/branches';
import { renewalRoutes } from './routes/renewals';
import { analyticsRoutes } from './routes/analytics';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());

// Logging middleware
app.use(morgan('combined'));


// CORS middleware - Fixed for production and preview URLs
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', 
  'https://fitgym-pro-system.vercel.app',                              // ✅ Production URL
  'https://fitgym-pro-system-q9r0nktfl-methduls-projects.vercel.app'  // ✅ Current preview URL
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 CORS check for origin:', origin);
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      console.log('✅ No origin - allowing');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin allowed:', origin);
      return callback(null, true);
    }
    
    // Also allow any vercel app URLs as backup
    if (origin.includes('fitgym-pro-system') && origin.includes('vercel.app')) {
      console.log('✅ Vercel domain allowed:', origin);
      return callback(null, true);
    }
    
    console.log('❌ Origin blocked:', origin);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'FitGym Pro API is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API Routes - ENHANCED WITH ALL ROUTES INCLUDING ANALYTICS
console.log('🔧 Registering API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/analytics', analyticsRoutes);
console.log('✅ Routes registered: /api/auth, /api/staff, /api/members, /api/packages, /api/branches, /api/renewals, /api/analytics');

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Test endpoint working',
    availableRoutes: [
      'GET /api/health',
      'GET /api/test',
      '--- AUTH ROUTES ---',
      'POST /api/auth/signin',
      'POST /api/auth/signup',
      'GET /api/auth/profile',
      'POST /api/auth/reset-password',
      '--- STAFF ROUTES ---',
      'GET /api/staff/branch/:branchId',
      'POST /api/staff/verify-pin',
      'POST /api/staff',
      'GET /api/staff',
      'PUT /api/staff/:id',
      'DELETE /api/staff/:id',
      'GET /api/staff/:id',
      '--- MEMBER ROUTES ---',
      'GET /api/members/branch/:branchId',
      'POST /api/members',
      'GET /api/members',
      'PUT /api/members/:id',
      'DELETE /api/members/:id',
      'GET /api/members/:id',
      'GET /api/members/search/:branchId',
      '--- PACKAGE ROUTES (BRANCH-SPECIFIC) ---',
      'GET /api/packages/branch/:branchId',
      'GET /api/packages/branch/:branchId/active',
      'GET /api/packages/active (admin only)',
      'GET /api/packages (admin only)',
      'POST /api/packages',
      'PUT /api/packages/:id',
      'DELETE /api/packages/:id',
      'GET /api/packages/:id',
      '--- BRANCH ROUTES ---',
      'GET /api/branches',
      'GET /api/branches/:id',
      '--- RENEWAL ROUTES ---',
      'POST /api/renewals/process',
      'GET /api/renewals/member/:memberId',
      'GET /api/renewals/recent/:branchId',
      'GET /api/renewals/eligibility/:memberId',
      '--- ANALYTICS ROUTES ---',
      'GET /api/analytics/branch/:branchId'
    ]
  });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    status: 'error',
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    })
  });
});

// 404 handler - ENHANCED WITH LOGGING
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Authentication: Enhanced with Supabase`);
  console.log(`📦 Packages: Branch-specific management enabled`);
  console.log(`📊 Analytics: Revenue and performance tracking enabled`);
  console.log(`🧪 Test routes: http://localhost:${PORT}/api/test`);
});

export default app;