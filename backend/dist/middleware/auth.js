"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAdmin = exports.authenticate = exports.isAdmin = exports.verifyAuth = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
// Verify user authentication
const verifyAuth = async (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        throw new Error('Unauthorized');
    }
    return user;
};
exports.verifyAuth = verifyAuth;
// Check if user is admin
const isAdmin = async (userId) => {
    const { data } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', userId)
        .single();
    return data?.role === 'admin';
};
exports.isAdmin = isAdmin;
// General authentication middleware - SECURED VERSION
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // SECURITY: Only allow development bypass if explicitly enabled
        const allowDevBypass = process.env.NODE_ENV === 'development' &&
            process.env.ALLOW_AUTH_BYPASS === 'true';
        if (!authHeader) {
            if (allowDevBypass) {
                console.log('⚠️ DEVELOPMENT MODE: No auth header - bypassing (DANGEROUS IN PRODUCTION!)');
                next();
                return;
            }
            return res.status(401).json({
                status: 'error',
                error: 'Authentication required',
                message: 'Authorization header is required'
            });
        }
        const user = await (0, exports.verifyAuth)(authHeader);
        req.user = user;
        next();
    }
    catch (error) {
        console.log('🔐 Auth middleware error:', error instanceof Error ? error.message : 'Unknown error');
        // SECURITY: Only allow dev bypass if explicitly enabled
        const allowDevBypass = process.env.NODE_ENV === 'development' &&
            process.env.ALLOW_AUTH_BYPASS === 'true';
        if (allowDevBypass) {
            console.log('⚠️ DEVELOPMENT MODE: Auth failed but bypassing (DANGEROUS IN PRODUCTION!)');
            next();
            return;
        }
        res.status(401).json({
            status: 'error',
            error: 'Unauthorized',
            message: error instanceof Error ? error.message : 'Authentication failed'
        });
    }
};
exports.authenticate = authenticate;
// Admin-only middleware - SECURED VERSION
const requireAdmin = async (req, res, next) => {
    try {
        // SECURITY: Only allow dev bypass if explicitly enabled
        const allowDevBypass = process.env.NODE_ENV === 'development' &&
            process.env.ALLOW_AUTH_BYPASS === 'true';
        if (allowDevBypass) {
            console.log('👑 DEVELOPMENT MODE: Skipping admin check (DANGEROUS IN PRODUCTION!)');
            req.userRole = 'admin';
            next();
            return;
        }
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                error: 'Authentication required'
            });
        }
        const adminCheck = await (0, exports.isAdmin)(req.user.id);
        if (!adminCheck) {
            return res.status(403).json({
                status: 'error',
                error: 'Admin access required'
            });
        }
        req.userRole = 'admin';
        next();
    }
    catch (error) {
        res.status(403).json({
            status: 'error',
            error: 'Access denied',
            message: error instanceof Error ? error.message : 'Authorization failed'
        });
    }
};
exports.requireAdmin = requireAdmin;
// Optional authentication (for public endpoints that benefit from auth)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const user = await (0, exports.verifyAuth)(authHeader);
            req.user = user;
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        console.log('🔓 Optional auth failed, continuing without auth');
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map