import { create } from 'zustand';
import type { AppConfig } from '../services/auth';

interface AuthState {
  token: string | null;
  adminToken: string | null;
  appConfig: AppConfig | null;
  configLoaded: boolean;

  setToken: (token: string | null) => void;
  setAdminToken: (token: string | null) => void;
  setAppConfig: (config: AppConfig) => void;
  logout: () => void;
  adminLogout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: localStorage.getItem('ctf-token'),
  adminToken: localStorage.getItem('ctf-admin-token'),
  appConfig: null,
  configLoaded: false,

  setToken: (token) => {
    if (token) localStorage.setItem('ctf-token', token);
    else localStorage.removeItem('ctf-token');
    set({ token });
  },

  setAdminToken: (adminToken) => {
    if (adminToken) localStorage.setItem('ctf-admin-token', adminToken);
    else localStorage.removeItem('ctf-admin-token');
    set({ adminToken });
  },

  setAppConfig: (appConfig) => set({ appConfig, configLoaded: true }),

  logout: () => {
    localStorage.removeItem('ctf-token');
    set({ token: null });
  },

  adminLogout: () => {
    localStorage.removeItem('ctf-admin-token');
    set({ adminToken: null });
  },
}));
