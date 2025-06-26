import React, { useState } from 'react';
import { db, getAuthHeaders, isAuthenticated, getStaffSessionToken } from '@/lib/supabase';

const TestPinVerification = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAllTests = async () => {
    setLoading(true);
    const testResults: any = {};

    try {
      // Test 1: Check API URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      testResults.apiUrl = apiUrl;
      console.log('🌐 API URL:', apiUrl);

      // Test 2: Check if db object exists
      testResults.dbExists = typeof db !== 'undefined';
      console.log('📚 DB object exists:', testResults.dbExists);

      // Test 3: Test API Health
      try {
        const healthResult = await db.health.check();
        testResults.health = healthResult;
        console.log('🏥 Health check:', healthResult);
      } catch (error) {
        testResults.health = { error: error instanceof Error ? error.message : 'Health check failed' };
        console.error('❌ Health check error:', error);
      }

      // Test 4: Check headers before authentication
      const headersBefore = getAuthHeaders();
      testResults.headersBefore = headersBefore;
      console.log('🔐 Headers before auth:', headersBefore);

      // Test 5: Test PIN verification with correct PIN
      try {
        const pinResult = await db.staff.verifyPin('3bd212e3-273b-4eb2-9cec-9c2cb72b90ba', '1224');
        testResults.pinVerification = pinResult;
        console.log('🔑 PIN verification:', pinResult);
      } catch (error) {
        testResults.pinVerification = { error: error instanceof Error ? error.message : 'PIN verification failed' };
        console.error('❌ PIN verification error:', error);
      }

      // Test 6: Check session token after PIN
      const sessionToken = getStaffSessionToken();
      testResults.sessionToken = sessionToken ? 'EXISTS' : 'MISSING';
      console.log('🎫 Session token:', testResults.sessionToken);

      // Test 7: Check authentication status
      const authStatus = isAuthenticated();
      testResults.isAuthenticated = authStatus;
      console.log('✅ Is authenticated:', authStatus);

      // Test 8: Check headers after authentication
      const headersAfter = getAuthHeaders();
      testResults.headersAfter = headersAfter;
      console.log('🔐 Headers after auth:', headersAfter);

      // Test 9: Test wrong PIN
      try {
        const wrongPinResult = await db.staff.verifyPin('3bd212e3-273b-4eb2-9cec-9c2cb72b90ba', '0000');
        testResults.wrongPin = wrongPinResult;
        console.log('❌ Wrong PIN test:', wrongPinResult);
      } catch (error) {
        testResults.wrongPin = { error: error instanceof Error ? error.message : 'Wrong PIN test failed' };
        console.error('❌ Wrong PIN test error:', error);
      }

      testResults.timestamp = new Date().toISOString();
      testResults.success = true;

    } catch (error) {
      testResults.globalError = error instanceof Error ? error.message : 'Unknown error';
      testResults.success = false;
      console.error('❌ Global test error:', error);
    }

    setResults(testResults);
    setLoading(false);
  };

  const testIndividual = async (testName: string) => {
    setLoading(true);
    
    try {
      let result;
      
      switch (testName) {
        case 'health':
          result = await db.health.check();
          break;
        case 'pin':
          result = await db.staff.verifyPin('3bd212e3-273b-4eb2-9cec-9c2cb72b90ba', '1224');
          break;
        case 'wrongPin':
          result = await db.staff.verifyPin('3bd212e3-273b-4eb2-9cec-9c2cb72b90ba', '0000');
          break;
        case 'headers':
          result = getAuthHeaders();
          break;
        case 'auth':
          result = { isAuthenticated: isAuthenticated(), sessionToken: getStaffSessionToken() };
          break;
        default:
          result = { error: 'Unknown test' };
      }

      setResults({ [testName]: result, timestamp: new Date().toISOString() });
      console.log(`✅ ${testName} result:`, result);
      
    } catch (error) {
      const errorResult = { error: error instanceof Error ? error.message : 'Unknown error' };
      setResults({ [testName]: errorResult, timestamp: new Date().toISOString() });
      console.error(`❌ ${testName} error:`, error);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px' }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '32px', textAlign: 'center', color: '#111827' }}>🧪 PIN Verification Test Suite</h1>
        
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Test Configuration</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '14px', color: '#4b5563' }}>
            <div><strong style={{ color: '#111827' }}>API URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}</div>
            <div><strong style={{ color: '#111827' }}>Test Staff ID:</strong> 3bd212e3-273b-4eb2-9cec-9c2cb72b90ba</div>
            <div><strong style={{ color: '#111827' }}>Test PIN:</strong> 1224</div>
            <div><strong style={{ color: '#111827' }}>DB Object:</strong> {typeof db !== 'undefined' ? '✅ Available' : '❌ Missing'}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Test Controls</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <button
              onClick={runAllTests}
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: loading ? '#9ca3af' : '#3b82f6', 
                color: 'white', 
                borderRadius: '6px', 
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {loading ? '🔄 Running...' : '🚀 Run All Tests'}
            </button>
            
            <button
              onClick={() => testIndividual('health')}
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: loading ? '#9ca3af' : '#10b981', 
                color: 'white', 
                borderRadius: '6px', 
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              🏥 Test Health
            </button>
            
            <button
              onClick={() => testIndividual('pin')}
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: loading ? '#9ca3af' : '#8b5cf6', 
                color: 'white', 
                borderRadius: '6px', 
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              🔑 Test PIN
            </button>
            
            <button
              onClick={() => testIndividual('wrongPin')}
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: loading ? '#9ca3af' : '#ef4444', 
                color: 'white', 
                borderRadius: '6px', 
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              ❌ Test Wrong PIN
            </button>
            
            <button
              onClick={() => testIndividual('headers')}
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: loading ? '#9ca3af' : '#f59e0b', 
                color: 'white', 
                borderRadius: '6px', 
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              🔐 Test Headers
            </button>
            
            <button
              onClick={() => testIndividual('auth')}
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: loading ? '#9ca3af' : '#6366f1', 
                color: 'white', 
                borderRadius: '6px', 
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              ✅ Test Auth Status
            </button>
          </div>
          
          <button
            onClick={() => setResults(null)}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#6b7280', 
              color: 'white', 
              borderRadius: '6px', 
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗑️ Clear Results
          </button>
        </div>

        {results && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>📊 Test Results</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: '600', fontSize: '18px', marginBottom: '8px', color: '#111827' }}>Summary:</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px' }}>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  backgroundColor: results.health?.data ? '#dcfce7' : '#fee2e2',
                  color: '#111827'
                }}>
                  API Health: {results.health?.data ? '✅ OK' : '❌ Failed'}
                </div>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  backgroundColor: results.pinVerification?.isValid ? '#dcfce7' : '#fee2e2',
                  color: '#111827'
                }}>
                  PIN Verification: {results.pinVerification?.isValid ? '✅ Valid' : '❌ Invalid'}
                </div>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  backgroundColor: results.isAuthenticated ? '#dcfce7' : '#fef3c7',
                  color: '#111827'
                }}>
                  Authentication: {results.isAuthenticated ? '✅ Authenticated' : '⚠️ Not Authenticated'}
                </div>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  backgroundColor: results.sessionToken === 'EXISTS' ? '#dcfce7' : '#fef3c7',
                  color: '#111827'
                }}>
                  Session Token: {results.sessionToken === 'EXISTS' ? '✅ Present' : '⚠️ Missing'}
                </div>
              </div>
            </div>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '8px', color: '#111827' }}>Detailed Results:</h3>
              <pre style={{ 
                fontSize: '12px', 
                overflow: 'auto', 
                maxHeight: '384px', 
                backgroundColor: '#ffffff', 
                padding: '8px', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                color: '#111827'
              }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPinVerification;