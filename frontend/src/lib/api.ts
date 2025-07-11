// Enhanced API client with network auto-recovery
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com/api' 
  : 'http://localhost:5001/api';

// Connection monitoring
let isOnline = true;
let connectionListeners: Array<(online: boolean) => void> = [];

// Activity-based monitoring
let lastActivityTime = Date.now();
let currentActivityLevel: 'high' | 'normal' | 'low' | 'idle' = 'normal';
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;
let isMonitoringActive = false;

// 🔧 NEW: Add exponential backoff for failed connections
let consecutiveFailures = 0;
let isBackingOff = false;

const getBackoffDelay = () => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  return Math.min(1000 * Math.pow(2, consecutiveFailures), 30000);
};

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
  
  // 🔧 Much more conservative intervals to prevent IP blocking
  switch (currentActivityLevel) {
    case 'high':
      intervalMs = isBackingOff ? getBackoffDelay() : 2 * 60 * 1000; // 2 minutes instead of 30 seconds
      console.log('📶 High activity: Checking connection every 2 minutes');
      break;
    case 'normal':
      intervalMs = isBackingOff ? getBackoffDelay() : 5 * 60 * 1000; // 5 minutes instead of 2
      console.log('📊 Normal activity: Checking connection every 5 minutes');
      break;
    case 'low':
      intervalMs = isBackingOff ? getBackoffDelay() : 8 * 60 * 1000; // 8 minutes instead of 5
      console.log('📉 Low activity: Checking connection every 8 minutes');
      break;
    case 'idle':
      intervalMs = isBackingOff ? getBackoffDelay() : 15 * 60 * 1000; // 15 minutes instead of 10
      console.log('😴 Idle: Checking connection every 15 minutes');
      break;
    default:
      intervalMs = 5 * 60 * 1000;
  }
  
  if (isBackingOff) {
    console.log(`⏰ Backing off: Next check in ${intervalMs / 1000} seconds`);
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

// Check internet connection (enhanced with backoff logic)
const checkConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing connection...');
    
    // Test 1: Try your actual backend API endpoint
    try {
      const response = await fetch(`${API_BASE_URL}/branches`, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000) // Increased timeout
      });
      
      // Any response (even 401/403) means server is reachable
      if (response.status < 500) {
        console.log(`✅ Backend reachable (status: ${response.status})`);
        
        // 🔧 Reset failure count on success
        consecutiveFailures = 0;
        isBackingOff = false;
        
        return true;
      }
    } catch (error) {
      console.log('❌ Backend test failed:', error instanceof Error ? error.message : 'Unknown error');
      
      // 🔧 Increment failure count
      consecutiveFailures++;
      isBackingOff = true;
      
      // Don't spam with more requests if backend is blocking us
      if (error instanceof Error && error.message.includes('blocked')) {
        console.log('🚫 Backend is blocking requests - entering extended backoff');
        consecutiveFailures = Math.max(consecutiveFailures, 5); // Force longer backoff
      }
    }

    // Test 2: Only try external services if backend fails
    // (Skip if we're being blocked to avoid further issues)
    if (!isBackingOff || consecutiveFailures < 3) {
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
    }

    console.log(`🔴 All connectivity tests failed (${consecutiveFailures} consecutive failures)`);
    return false;
    
  } catch (error) {
    consecutiveFailures++;
    isBackingOff = true;
    console.log('🔴 Connection check error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

// Start connection monitoring (call this once when app starts)
export const startConnectionMonitoring = () => {
  console.log('🔍 Starting connection monitoring...');
  
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
        
        // If this is the last attempt, give up
        if (attempt === maxRetries) {
          console.log(`❌ API call failed after ${maxRetries} attempts:`, lastError.message);
          notifyConnectionChange(false);
          break;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = attempt * 1000; // 1s, 2s, 3s
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('All retry attempts failed');
  }

  // Keep all your existing methods exactly the same...
  
  // Branches
  async getBranches() {
    return this.request<{status: string, data: any[]}>('/branches');
  }

  async getBranchById(id: string) {
    return this.request<{status: string, data: any}>(`/branches/${id}`);
  }

  // Members  
  async getMembersByBranch(branchId: string, limit = 100, offset = 0) {
    return this.request<{status: string, data: any[], total_count: number}>(
      `/members/branch/${branchId}?limit=${limit}&offset=${offset}`
    );
  }

  async searchMembers(branchId: string, searchTerm?: string, statusFilter = 'all') {
    return this.request<{status: string, data: any[], total_count: number, filtered_count: number}>(
      '/members/search', 
      {
        method: 'POST',
        body: JSON.stringify({ branchId, searchTerm, statusFilter })
      }
    );
  }

  async createMember(memberData: any) {
    return this.request<{status: string, data: any}>('/members', {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
  }

  async updateMember(memberId: string, updates: any) {
    return this.request<{status: string, data: any}>(`/members/${memberId}`, {
      method: 'PUT', 
      body: JSON.stringify(updates)
    });
  }

  // Staff
  async getStaffByBranch(branchId: string) {
    return this.request<{status: string, data: any[]}>(`/staff/branch/${branchId}`);
  }

  async verifyStaffPin(staffId: string, pin: string) {
    return this.request<{status: string, isValid: boolean, staff: any}>('/staff/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ staffId, pin })
    });
  }

  // Check-ins (placeholder)
  async getTodayCheckIns(branchId: string) {
    return this.request<{status: string, data: any[]}>(`/checkins/today/${branchId}`);
  }
}

export const api = new ApiClient();

// Legacy db object for compatibility with existing code
export const db = {
  branches: {
    getAll: () => api.getBranches(),
    getById: (id: string) => api.getBranchById(id)
  },
  members: {
    getByBranch: (branchId: string) => api.getMembersByBranch(branchId),
    search: (branchId: string, searchTerm?: string, statusFilter = 'all') => 
      api.searchMembers(branchId, searchTerm, statusFilter),
    create: (memberData: any) => api.createMember(memberData),
    update: (memberId: string, updates: any) => api.updateMember(memberId, updates)
  },
  staff: {
    getByBranch: (branchId: string) => api.getStaffByBranch(branchId),
    verifyPin: (staffId: string, pin: string) => api.verifyStaffPin(staffId, pin)
  },
  checkIns: {
    getTodayByBranch: (branchId: string) => api.getTodayCheckIns(branchId)
  }
};