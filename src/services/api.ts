import { LeaveRequest, User } from '../types';

const TOKEN_KEY = 'hadirku_jwt_token';
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface MeResponse {
  success: boolean;
  user?: User;
  tokenPayload?: any;
  message?: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  jwt: string;
  timestamp: string;
}

export const api = {
  // Token management
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Helper for authenticated fetch
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP ${response.status}: Terjadi kesalahan server`;
      throw new Error(errorMsg);
    }

    return data as T;
  },

  // Check health and TiDB connection
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  },

  // Login with 8-digit code or Email/NIM + password
  async login(credentials: {
    code?: string;
    identifier?: string;
    password?: string;
  }): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res.token) {
      this.setToken(res.token);
    }

    return res;
  },

  // Get current authenticated user profile via JWT
  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>('/api/auth/me');
  },

  // Get all users from TiDB (Admin / Mentor only)
  async getUsers(): Promise<{ success: boolean; users: User[] }> {
    return this.request<{ success: boolean; users: User[] }>('/api/users');
  },

  // Create user (Mentor or Trainee by Admin)
  async createUser(userData: Omit<User, 'id'>): Promise<{ success: boolean; message: string; user: User }> {
    return this.request<{ success: boolean; message: string; user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Batch import users (Excel Trainee Import)
  async batchImportUsers(users: Partial<User>[]): Promise<{ success: boolean; count: number; message: string; createdUsers?: User[] }> {
    return this.request<{ success: boolean; count: number; message: string; createdUsers?: User[] }>('/api/users/batch', {
      method: 'POST',
      body: JSON.stringify({ users }),
    });
  },

  // Update user
  async updateUser(id: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete user
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Clear all users by role (admin only)
  async clearUsersByRole(
    role: 'trainee' | 'mentor' | 'all'
  ): Promise<{ success: boolean; count: number; message: string }> {
    return this.request<{ success: boolean; count: number; message: string }>(`/api/users/clear/${role}`, {
      method: 'DELETE',
    });
  },

  async getLeaveRequests(): Promise<{ success: boolean; requests: LeaveRequest[] }> {
    return this.request<{ success: boolean; requests: LeaveRequest[] }>('/api/leaves');
  },

  async createLeaveRequest(data: {
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl: string;
  }): Promise<{ success: boolean; request: LeaveRequest; message: string }> {
    return this.request<{ success: boolean; request: LeaveRequest; message: string }>('/api/leaves', { method: 'POST', body: JSON.stringify(data) });
  },

  async reviewLeaveRequest(id: string, status: 'approved' | 'rejected', reviewNotes?: string): Promise<{ success: boolean; request: LeaveRequest; message: string }> {
    return this.request<{ success: boolean; request: LeaveRequest; message: string }>(`/api/leaves/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNotes })
    });
  },
};
