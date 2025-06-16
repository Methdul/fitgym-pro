// src/routes/index.ts
import express from 'express';

const router = express.Router();

// Only import routes that actually exist and export properly
try {
  const { authRoutes } = require('./auth');
  router.use('/auth', authRoutes);
} catch (e) {
  console.warn('Auth routes not available');
}

try {
  const { staffRoutes } = require('./staff');
  router.use('/staff', staffRoutes);
} catch (e) {
  console.warn('Staff routes not available');
}

// Add the new routes we're creating
try {
  const { memberRoutes } = require('./members');
  router.use('/members', memberRoutes);
} catch (e) {
  console.warn('Member routes not available');
}

try {
  const { branchRoutes } = require('./branches');
  router.use('/branches', branchRoutes);
} catch (e) {
  console.warn('Branch routes not available');
}

export { router as apiRoutes };