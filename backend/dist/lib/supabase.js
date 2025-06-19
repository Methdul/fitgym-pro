"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyAuth = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log('🔧 Supabase config check:');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
console.log('SUPABASE_URL value:', process.env.SUPABASE_URL);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    throw new Error('Missing Supabase environment variables');
}
console.log('✅ Creating Supabase client...');
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
console.log('✅ Supabase client created successfully');
// Helper function to verify user authentication
const verifyAuth = async (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await exports.supabase.auth.getUser(token);
    if (error || !user) {
        throw new Error('Unauthorized');
    }
    return user;
};
exports.verifyAuth = verifyAuth;
// Helper function to check if user is admin
const isAdmin = async (userId) => {
    const { data } = await exports.supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', userId)
        .single();
    return data?.role === 'admin';
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=supabase.js.map