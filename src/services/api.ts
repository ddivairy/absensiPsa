import {
  User, Kejuruan, AttendanceRecord, LeaveRequest, AttendanceSettings,
  Mission, MissionSubmission, DailyReport
} from '../types';

let authToken: string | null = null;

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

export interface AppDataSnapshot {
  kejuruanList: Kejuruan[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  settings: AttendanceSettings | null;
  missions: Mission[];
  missionSubmissions: MissionSubmission[];
  dailyReports: DailyReport[];
}

export const api = {
  // Token management
  getToken(): string | null {
    return authToken;
  },

  setToken(token: string) {
    authToken = token;
  },

  clearToken() {
    authToken = null;
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

    const response = await fetch(endpoint, {
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

  async getAppData(): Promise<{ success: boolean } & AppDataSnapshot> {
    return this.request<{ success: boolean } & AppDataSnapshot>('/api/app-data');
  },

  async saveAppData(data: AppDataSnapshot): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/app-data', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAppData(collection: string, id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/app-data/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
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
};
