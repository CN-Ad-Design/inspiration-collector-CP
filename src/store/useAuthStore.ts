import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  expiresAt: number | null;
  setUser: (user: User | null, expiresAt?: number | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      expiresAt: null,
      setUser: (user, expiresAt = null) => set({ user, expiresAt }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      // Persist user and expiration
      partialize: (state) => ({ user: state.user, expiresAt: state.expiresAt }),
    }
  )
);