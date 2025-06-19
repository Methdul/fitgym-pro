"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchRoutes = void 0;
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.branchRoutes = router;
// GET /api/branches
router.get('/', auth_1.optionalAuth, async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('branches')
            .select('*')
            .order('name');
        if (error)
            throw error;
        res.json({
            status: 'success',
            data
        });
    }
    catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch branches',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/branches/:id
router.get('/:id', auth_1.optionalAuth, async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('branches')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error)
            throw error;
        res.json({
            status: 'success',
            data
        });
    }
    catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch branch',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=branches.js.map