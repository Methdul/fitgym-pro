"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRoutes = void 0;
// src/routes/index.ts
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
exports.apiRoutes = router;
// Only import routes that actually exist and export properly
try {
    const { authRoutes } = require('./auth');
    router.use('/auth', authRoutes);
    console.log('✅ Auth routes loaded');
}
catch (e) {
    console.warn('⚠️ Auth routes not available');
}
try {
    const { staffRoutes } = require('./staff');
    router.use('/staff', staffRoutes);
    console.log('✅ Staff routes loaded');
}
catch (e) {
    console.warn('⚠️ Staff routes not available');
}
try {
    const { memberRoutes } = require('./members');
    router.use('/members', memberRoutes);
    console.log('✅ Member routes loaded');
}
catch (e) {
    console.warn('⚠️ Member routes not available');
}
try {
    const { branchRoutes } = require('./branches');
    router.use('/branches', branchRoutes);
    console.log('✅ Branch routes loaded');
}
catch (e) {
    console.warn('⚠️ Branch routes not available');
}
// UPDATED: Add package routes with branch-specific functionality
try {
    const { packageRoutes } = require('./packages');
    router.use('/packages', packageRoutes);
    console.log('✅ Package routes loaded (branch-specific)');
}
catch (e) {
    console.warn('⚠️ Package routes not available');
}
// Add renewal routes
try {
    const { renewalRoutes } = require('./renewals');
    router.use('/renewals', renewalRoutes);
    console.log('✅ Renewal routes loaded');
}
catch (e) {
    console.warn('⚠️ Renewal routes not available');
}
//# sourceMappingURL=index.js.map