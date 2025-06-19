"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
// Import routes (including the updated package routes)
const auth_1 = require("./routes/auth");
const staff_1 = require("./routes/staff");
const members_1 = require("./routes/members");
const packages_1 = require("./routes/packages");
const branches_1 = require("./routes/branches");
const renewals_1 = require("./routes/renewals");
const analytics_1 = require("./routes/analytics");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Security middleware
app.use((0, helmet_1.default)());
// Logging middleware
app.use((0, morgan_1.default)('combined'));
// CORS middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/staff', staff_1.staffRoutes);
app.use('/api/members', members_1.memberRoutes);
app.use('/api/packages', packages_1.packageRoutes);
app.use('/api/branches', branches_1.branchRoutes);
app.use('/api/renewals', renewals_1.renewalRoutes);
app.use('/api/analytics', analytics_1.analyticsRoutes);
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
app.use((err, req, res, next) => {
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
exports.default = app;
//# sourceMappingURL=server.js.map