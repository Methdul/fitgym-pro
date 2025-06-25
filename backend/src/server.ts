// backend/src/server.ts - COMPLETE WORKING VERSION
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

// Import security middleware
import { 
  apiRateLimit, 
  securityHeaders, 
  ipProtection, 
  validateRequestSize 
} from './middleware/validation';

// Import routes
import { authRoutes } from './routes/auth';
import { staffRoutes } from './routes/staff';
import { memberRoutes } from './routes/members';
import { debugRoutes } from './routes/debug';
import { packageRoutes } from './routes/packages';
import { branchRoutes } from './routes/branches';
import { renewalRoutes } from './routes/renewals';
import { analyticsRoutes } from './routes/analytics';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy (CRITICAL for rate limiting to work correctly)
app.set('trust proxy', 1);

console.log('🔧 Setting up middleware...');

// Security middleware (apply in order)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

app.use(securityHeaders);
app.use(ipProtection);

// Logging middleware  
app.use(morgan('combined'));

// CORS middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', 
  'https://fitgym-pro-system.vercel.app',
  'https://fitgym-pro-system-q9r0nktfl-methduls-projects.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 CORS check for origin:', origin);
    
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    if (origin.includes('fitgym-pro-system') && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    console.log('❌ Origin blocked:', origin);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}));

// Request size validation
app.use(validateRequestSize);

// Body parsing middleware (with size limits)
app.use(express.json({ 
  limit: '1mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb'
}));

console.log('✅ Basic middleware applied');

// APPLY RATE LIMITING TO ALL /api/* ROUTES
console.log('🚦 Applying rate limiting...');
app.use('/api', apiRateLimit);
console.log('✅ Rate limiting applied to /api/* routes');

// Health check endpoint (will be rate limited)
app.get('/api/health', (req, res) => {
  console.log(`🏥 Health check from ${req.ip}`);
  res.json({
    status: 'success',
    message: 'FitGym Pro API is running! 🚀',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    security: 'Enhanced with input validation and rate limiting',
    ip: req.ip,
    rateLimit: {
      applied: true,
      window: '15 minutes',
      maxRequests: 10
    }
  });
});

// API Routes with validation
console.log('🔧 Registering secured API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/analytics', analyticsRoutes);
console.log('✅ Secured routes registered with validation');

// Test endpoint for debugging rate limiting
app.get('/api/test-rate-limit', (req, res) => {
  console.log(`🧪 Rate limit test from ${req.ip}`);
  res.json({
    status: 'success',
    message: 'Rate limit test endpoint',
    timestamp: new Date().toISOString(),
    ip: req.ip,
    headers: {
      'x-ratelimit-limit': req.get('X-RateLimit-Limit'),
      'x-ratelimit-remaining': req.get('X-RateLimit-Remaining'),
      'x-ratelimit-reset': req.get('X-RateLimit-Reset')
    }
  });
});

// Test endpoint without rate limiting (for comparison)
app.get('/no-limit-test', (req, res) => {
  console.log(`🆓 No rate limit test from ${req.ip}`);
  res.json({
    status: 'success',
    message: 'This endpoint has no rate limiting',
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Test endpoint working',
    security: {
      rateLimiting: 'Enabled',
      inputValidation: 'Enabled',
      ipProtection: 'Enabled',
      requestSizeLimits: 'Enabled'
    },
    availableRoutes: [
      'GET /api/health',
      'GET /api/test',
      'GET /api/test-rate-limit',
      '--- SECURED ROUTES ---',
      'All routes now have input validation and rate limiting'
    ]
  });
});

// Global error handling middleware (enhanced)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Global error handler:', err);
  
  // Rate limiting errors
  if (err.message && err.message.includes('Too many requests')) {
    return res.status(429).json({
      status: 'error',
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later'
    });
  }
  
  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      status: 'error',
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
  }
  
  // Request size errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      status: 'error',
      error: 'Request too large',
      message: 'Request body exceeds size limit'
    });
  }
  
  // JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }
  
  // Generic error response (don't expose internal details)
  res.status(err.status || 500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    })
  });
});

// 404 handler
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
  console.log(`🛡️ Security: Enhanced with validation, rate limiting, and IP protection`);
  console.log(`📦 Rate Limits: 10 requests per 15 minutes per IP`);
  console.log(`🔒 Request Size Limit: 1MB`);
  console.log(`🧪 Test rate limiting: http://localhost:${PORT}/api/test-rate-limit`);
  console.log(`🆓 No limit test: http://localhost:${PORT}/no-limit-test`);
});

export default app;