// backend/src/routes/branches.ts - WITH SECURITY FIXES (Phase 1)
import express, { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { 
  commonValidations, 
  strictRateLimit,
  authRateLimit,
  apiRateLimit,
  validateUUID,
  handleValidationErrors 
} from '../middleware/validation';

// Import RBAC system
import {
  requirePermission,
  requireAnyPermission,
  requireBranchAccess,
  auditLog,
  Permission,
  rbacUtils
} from '../middleware/rbac';

const router = express.Router();

// Debug middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`🏢 Branches Route: ${req.method} ${req.path}`);
  next();
});

// PHASE 1 SECURITY FIXES: Branch list query validation
const branchListValidation = [
  // Validate optional limit parameter
  require('express-validator').query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  // Validate optional search parameter
  require('express-validator').query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .escape()
    .withMessage('search must be between 1 and 100 characters'),
  handleValidationErrors
];

// GET /api/branches - PHASE 1 SECURITY FIXES APPLIED
router.get('/', 
  apiRateLimit,                                // PHASE 1 FIX: Rate limiting
  branchListValidation,                        // PHASE 1 FIX: Query validation
  optionalAuth,                                // Allow both authenticated and public access
  auditLog('READ_BRANCHES', 'branch'),         // Log the action
  async (req: Request, res: Response) => {
    try {
      // If user is authenticated, check permissions
      if (req.user) {
        const userPermissions = await rbacUtils.getUserPermissions(req.user);
        
        // Check if user has branch read permission
        if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_READ)) {
          return res.status(403).json({
            status: 'error',
            error: 'Insufficient permissions',
            message: 'Branch access requires proper permissions'
          });
        }
      }

      // PHASE 1 FIX: Apply query limits and validation
      const { limit = 50, search } = req.query;
      const resultLimit = Math.min(parseInt(limit as string) || 50, 100);
      
      let query = supabase
        .from('branches')
        .select('*')
        .limit(resultLimit)
        .order('name');

      // PHASE 1 FIX: Safe search implementation
      if (search && typeof search === 'string') {
        const sanitizedSearch = search.trim();
        if (sanitizedSearch.length > 0) {
          query = query.ilike('name', `%${sanitizedSearch}%`);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch branches');
      }
      
      console.log(`✅ Found ${data?.length || 0} branches`);
      
      res.json({ 
        status: 'success', 
        data: data || [],
        meta: {
          resultLimit,
          hasSearch: !!search,
          queriedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch branches',
        message: 'An error occurred while fetching branches'
      });
    }
  }
);

// GET /api/branches/:id - PHASE 1 SECURITY FIXES APPLIED
router.get('/:id', 
  apiRateLimit,                                // PHASE 1 FIX: Rate limiting
  [validateUUID('id'), handleValidationErrors], // PHASE 1 FIX: UUID validation
  optionalAuth,                                // Allow both authenticated and public access
  auditLog('READ_BRANCH_DETAILS', 'branch'),   // Log the action
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // If user is authenticated, check permissions
      if (req.user) {
        const userPermissions = await rbacUtils.getUserPermissions(req.user);
        
        // Check if user has branch read permission
        if (!rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_READ)) {
          return res.status(403).json({
            status: 'error',
            error: 'Insufficient permissions',
            message: 'Branch access requires proper permissions'
          });
        }
        
        // For staff users, check if they're accessing their own branch or have admin rights
        if (req.user.sessionType === 'branch_staff') {
          if (req.user.branchId !== id && 
              !rbacUtils.hasPermission(userPermissions, Permission.BRANCHES_MANAGE_ALL)) {
            return res.status(403).json({
              status: 'error',
              error: 'Branch access denied',
              message: 'You can only access your assigned branch details',
              assignedBranch: req.user.branchId,
              requestedBranch: id
            });
          }
        }
      }
      
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            status: 'error',
            error: 'Branch not found',
            message: 'The requested branch does not exist'
          });
        }
        console.error('Database error:', error);
        throw new Error('Failed to fetch branch');
      }
      
      console.log(`✅ Found branch details: ${data.name}`);
      
      res.json({ 
        status: 'success', 
        data,
        meta: {
          queriedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching branch:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch branch',
        message: 'An error occurred while fetching branch details'
      });
    }
  }
);

console.log('🏢 Branch routes loaded successfully - WITH PHASE 1 SECURITY FIXES');

export { router as branchRoutes };