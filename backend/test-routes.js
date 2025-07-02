// backend/test-routes.js - Test if backend routes are working

const API_BASE_URL = 'http://localhost:5001';

async function testBackendRoutes() {
  console.log('🔍 TESTING BACKEND ROUTES...\n');

  // Test 1: Check if backend is running
  console.log('🟢 Test 1: Backend health check...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is running:', data);
    } else {
      console.log('❌ Backend health check failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Backend is NOT running:', error.message);
    console.log('💡 Start your backend with: cd backend && npm run dev');
    return;
  }

  // Test 2: Check members route
  console.log('\n🟢 Test 2: Check members route...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/members`, {
      method: 'OPTIONS' // Just check if route exists
    });
    console.log('📊 Members route status:', response.status);
    
    if (response.status === 404) {
      console.log('❌ Members route NOT FOUND');
      console.log('💡 The route is not registered properly');
    } else {
      console.log('✅ Members route exists');
    }
  } catch (error) {
    console.log('❌ Members route test failed:', error.message);
  }

  // Test 3: List all available routes
  console.log('\n🟢 Test 3: List available routes...');
  const testRoutes = [
    '/api',
    '/api/auth',
    '/api/staff', 
    '/api/branches',
    '/api/packages',
    '/api/renewals'
  ];

  for (const route of testRoutes) {
    try {
      const response = await fetch(`${API_BASE_URL}${route}`, { method: 'OPTIONS' });
      const status = response.status === 404 ? '❌ NOT FOUND' : '✅ EXISTS';
      console.log(`${status} ${route} (${response.status})`);
    } catch (error) {
      console.log(`❌ ERROR ${route}: ${error.message}`);
    }
  }

  console.log('\n🎯 DIAGNOSIS:');
  console.log('If members route shows NOT FOUND, check your backend route registration.');
}

// Run in browser console or save as file and run with node
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testBackendRoutes();
} else {
  // Browser environment
  console.log('Run this in browser console on your frontend page');
  window.testBackendRoutes = testBackendRoutes;
}