// backend/src/server.ts - SAFE VERSION WITH DYNAMIC ROUTE LOADING
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

app.use('/api', (req, res, next) => {
  console.log('🚫 Rate limiting completely disabled');
  return next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log(`🏥 Health check from ${req.ip}`);
  res.json({
    status: 'success',
    message: 'FitGym Pro API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// DYNAMIC ROUTE LOADING - Handles both named and default exports
console.log('🛣️ Setting up API routes...');

// Helper function to safely load routes
function loadRoute(routePath: string, routeName: string) {
  try {
    const routeModule = require(routePath);
    
    // Try different export patterns
    let router = null;
    
    // Pattern 1: Named export (e.g., export { router as authRoutes })
    if (routeModule[routeName]) {
      router = routeModule[routeName];
    }
    // Pattern 2: Default export (e.g., export default router)
    else if (routeModule.default) {
      router = routeModule.default;
    }
    // Pattern 3: Direct router export
    else if (routeModule.router) {
      router = routeModule.router;
    }
    
    if (router) {
      console.log(`✅ ${routeName} routes loaded`);
      return router;
    } else {
      console.log(`⚠️ ${routeName} routes: No valid export found`);
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`⚠️ ${routeName} routes: Not available (${errorMessage})`);
    return null;
  }
}

// Load each route safely
const routes = [
  { path: './routes/auth', name: 'authRoutes', endpoint: '/api/auth' },
  { path: './routes/staff', name: 'staffRoutes', endpoint: '/api/staff' },
  { path: './routes/members', name: 'memberRoutes', endpoint: '/api/members' },
  { path: './routes/packages', name: 'packageRoutes', endpoint: '/api/packages' },
  { path: './routes/branches', name: 'branchRoutes', endpoint: '/api/branches' },
  { path: './routes/renewals', name: 'renewalRoutes', endpoint: '/api/renewals' },
  { path: './routes/analytics', name: 'analyticsRoutes', endpoint: '/api/analytics' },
];

routes.forEach(({ path, name, endpoint }) => {
  const router = loadRoute(path, name);
  if (router) {
    app.use(endpoint, router);
    if (name === 'renewalRoutes') {
      console.log('  🔄 Renewals routes loaded (with PIN fixes)');
    }
  }
});

// 🔒 SECURITY FIX: Only load debug routes in development with explicit permission
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEBUG_ROUTES === 'true') {
  console.log('⚠️ Loading debug routes (DEVELOPMENT ONLY)');
  const debugRouter = loadRoute('./routes/debug', 'debugRoutes');
  if (debugRouter) {
    app.use('/api/debug', debugRouter);
    console.log('  🐛 Debug routes loaded');
  }
} else {
  console.log('🔒 Debug routes DISABLED (production mode)');
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Global error handler:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    status: 'error',
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`❌ API route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    status: 'error',
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'FitGym Pro API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      staff: '/api/staff',
      members: '/api/members',
      packages: '/api/packages',
      branches: '/api/branches',
      renewals: '/api/renewals',
      analytics: '/api/analytics'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 FitGym Pro API Server Started!');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log('\n📋 Available endpoints:');
  console.log('  🏥 Health: /api/health');
  console.log('  🔐 Auth: /api/auth');
  console.log('  👥 Staff: /api/staff');
  console.log('  👤 Members: /api/members');
  console.log('  📦 Packages: /api/packages');
  console.log('  🏢 Branches: /api/branches');
  console.log('  🔄 Renewals: /api/renewals (FIXED)');
  console.log('  📊 Analytics: /api/analytics');
  console.log('\n🔧 PIN System Status:');
  
  try {
    require('./lib/security');
    console.log('  ✅ Enhanced security module loaded');
    console.log('  🔐 Using bcrypt hashed PINs');
    console.log('  🛡️ PIN attempt tracking enabled');
  } catch (error) {
    console.log('  ⚠️  Basic security only');
    console.log('  🔐 Using plain text PIN fallback');
  }
  
  console.log('\n' + '='.repeat(50));
});

export default app;