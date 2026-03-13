import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  requires_password_reset: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  resetPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    
    await get().fetchUser();
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const response = await api.get('/users/me');
      set({ 
        user: response.data, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  resetPassword: async (newPassword: string, currentPassword?: string) => {
    await api.post('/auth/reset-password', {
      new_password: newPassword,
      current_password: currentPassword
    });
    await get().fetchUser();
  }
}));
