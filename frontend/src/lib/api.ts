// frontend/src/lib/api.ts - FIXED VERSION

// ✅ SOLUTION: Use environment variables consistently
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Rest of your connection monitoring code stays the same...
let isOnline = true;
let connectionListeners: Array<(online: boolean) => void> = [];

// Activity-based monitoring
let lastActivityTime = Date.now();
let currentActivityLevel: 'high' | 'normal' | 'low' | 'idle' = 'normal';
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;
let isMonitoringActive = false;

// Activity detection
const updateActivity = () => {
  lastActivityTime = Date.now();
  updateActivityLevel();
};

const updateActivityLevel = () => {
  const timeSinceActivity = Date.now() - lastActivityTime;
  const oldLevel = currentActivityLevel;
  
  if (timeSinceActivity < 30 * 1000) { // Less than 30 seconds
    currentActivityLevel = 'high';
  } else if (timeSinceActivity < 5 * 60 * 1000) { // Less than 5 minutes
    currentActivityLevel = 'normal';
  } else if (timeSinceActivity < 15 * 60 * 1000) { // Less than 15 minutes
    currentActivityLevel = 'low';
  } else {
    currentActivityLevel = 'idle';
  }
  
  // If activity level changed, update monitoring frequency
  if (oldLevel !== currentActivityLevel) {
    console.log(`🎯 Activity level changed: ${oldLevel} → ${currentActivityLevel}`);
    updateMonitoringFrequency();
  }
};

const updateMonitoringFrequency = () => {
  if (!isMonitoringActive) return;
  
  // Clear existing interval
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  // Set new interval based on activity level
  let intervalMs;
  switch (currentActivityLevel) {
    case 'high':
      intervalMs = 2 * 60 * 1000; // 2 minutes - staff actively working
      console.log('📶 High activity: Checking connection every 2 minutes');
      break;
    case 'normal':
      intervalMs = 5 * 60 * 1000; // 5 minutes - normal usage
      console.log('📊 Normal activity: Checking connection every 5 minutes');
      break;
    case 'low':
      intervalMs = 10 * 60 * 1000; // 10 minutes - low usage
      console.log('📉 Low activity: Checking connection every 10 minutes');
      break;
    case 'idle':
      intervalMs = 15 * 60 * 1000; // 15 minutes - idle
      console.log('😴 Idle: Checking connection every 15 minutes');
      break;
    default:
      intervalMs = 5 * 60 * 1000;
  }
  
  // Start new interval
  connectionCheckInterval = setInterval(async () => {
    updateActivityLevel(); // Check if activity level should change
    const online = await checkConnection();
    notifyConnectionChange(online);
  }, intervalMs);
};

// Export activity tracker for components to use
export const trackActivity = updateActivity;

// Add connection status listeners
export const addConnectionListener = (callback: (online: boolean) => void) => {
  connectionListeners.push(callback);
};

// Remove connection status listeners  
export const removeConnectionListener = (callback: (online: boolean) => void) => {
  connectionListeners = connectionListeners.filter(cb => cb !== callback);
};

// Notify all listeners of connection changes
const notifyConnectionChange = (online: boolean) => {
  if (isOnline !== online) {
    isOnline = online;
    console.log(online ? '🟢 Connection restored' : '🔴 Connection lost');
    connectionListeners.forEach(callback => callback(online));
  }
};

// Check internet connection (simplified and reliable)
const checkConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing connection...');
    
    // Test 1: Try your actual backend API endpoint
    try {
      const response = await fetch(`${API_BASE_URL}/branches`, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      // Any response (even 401) means server is reachable
      if (response.status < 500) {
        console.log(`✅ Backend reachable (status: ${response.status})`);
        return true;
      }
    } catch (error) {
      console.log('❌ Backend test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Try Google's reliable endpoint (most reliable internet test)
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      console.log('✅ Internet connectivity confirmed via Google');
      return true;
    } catch (error) {
      console.log('❌ Google test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: Try a simple CORS-friendly endpoint
    try {
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        console.log('✅ Internet connectivity confirmed via httpbin');
        return true;
      }
    } catch (error) {
      console.log('❌ Httpbin test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('🔴 All connectivity tests failed - no internet');
    return false;
    
  } catch (error) {
    console.log('🔴 Connection check error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

// Start connection monitoring (call this once when app starts)
export const startConnectionMonitoring = () => {
  console.log('🔍 Starting connection monitoring...');
  console.log('📡 API Base URL:', API_BASE_URL); // ✅ Add this for debugging
  
  // Start activity-based monitoring
  isMonitoringActive = true;
  updateMonitoringFrequency(); // Start with current activity level

  // Also listen to browser online/offline events (simplified)
  window.addEventListener('online', () => {
    console.log('🟢 Browser detected connection restored - will verify in 2 seconds...');
    
    // Give network a moment to stabilize, then check
    setTimeout(async () => {
      const actuallyOnline = await checkConnection();
      notifyConnectionChange(actuallyOnline);
    }, 2000);
  });

  window.addEventListener('offline', () => {
    console.log('🔴 Browser detected connection lost');
    notifyConnectionChange(false);
  });
};

// Get current connection status
export const getConnectionStatus = () => isOnline;

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // 🔄 RETRY LOGIC: Try up to 3 times
    let lastError: Error | null = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 API call attempt ${attempt}/${maxRetries}: ${endpoint}`);
        
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'API request failed');
        }

        // ✅ Success - notify that we're back online
        if (attempt > 1) {
          console.log('✅ API call succeeded after retry');
          notifyConnectionChange(true);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.log(`❌ API call attempt ${attempt} failed:`, lastError.message);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏰ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - notify that we're offline
    console.log(`🔴 All ${maxRetries} attempts failed for ${endpoint}`);
    notifyConnectionChange(false);
    throw lastError || new Error('API request failed after retries');
  }

  // Your existing API methods stay the same...
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();