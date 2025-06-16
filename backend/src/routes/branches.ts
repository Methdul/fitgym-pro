import express from 'express';
import { supabase } from '../lib/supabase';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/branches
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json({ 
      status: 'success', 
      data 
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch branches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/branches/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    res.json({ 
      status: 'success', 
      data 
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch branch',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as branchRoutes };