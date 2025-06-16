// API client to connect frontend to your backend
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com/api' 
  : 'http://localhost:5001/api';

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

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'API request failed');
    }

    return data;
  }

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
    search: (branchId: string, searchTerm?: string, statusFilter?: string) => 
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