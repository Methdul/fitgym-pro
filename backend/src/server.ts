import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

// Import routes (including the new member and package routes)
import { authRoutes } from './routes/auth';
import { staffRoutes } from './routes/staff';
import { memberRoutes } from './routes/members';
import { packageRoutes } from './routes/packages';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());

// Logging middleware
app.use(morgan('combined'));

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
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

// API Routes - ENHANCED WITH MEMBER AND PACKAGE ROUTES
console.log('🔧 Registering API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/packages', packageRoutes);
console.log('✅ Routes registered: /api/auth, /api/staff, /api/members, /api/packages');

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
      '--- PACKAGE ROUTES ---',
      'GET /api/packages/active',
      'GET /api/packages',
      'POST /api/packages',
      'PUT /api/packages/:id',
      'DELETE /api/packages/:id',
      'GET /api/packages/:id'
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
  console.log(`🧪 Test routes: http://localhost:${PORT}/api/test`);
});

export default app;