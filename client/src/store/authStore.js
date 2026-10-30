import { create } from 'zustand';
import { authService } from '../services/authService';
import { onWakingUpChange } from '../services/api';

export const useAuthStore = create((set, get) => {
  // Listen for waking up state from api.js
  onWakingUpChange((isWakingUp) => {
    set({ wakingUp: isWakingUp });
  });

  return {
    user: JSON.parse(localStorage.getItem('happy_drop_user') || 'null'),
    token: localStorage.getItem('happy_drop_token') || null,
    status: localStorage.getItem('happy_drop_token') ? 'authenticated' : 'unauthenticated', // 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
    wakingUp: false,
    error: null,

    // Bootstrap user session on initial app start
    bootstrap: async () => {
      const storedToken = localStorage.getItem('happy_drop_token');
      if (!storedToken) {
        set({ status: 'unauthenticated', user: null, token: null });
        return;
      }

      set({ status: 'loading' });
      try {
        const data = await authService.me();
        const user = data.user || data;
        localStorage.setItem('happy_drop_user', JSON.stringify(user));
        set({ user, token: storedToken, status: 'authenticated', error: null });
      } catch (err) {
        localStorage.removeItem('happy_drop_token');
        localStorage.removeItem('happy_drop_user');
        set({ user: null, token: null, status: 'unauthenticated' });
      }
    },

    login: async (email, password) => {
      set({ status: 'loading', error: null });
      try {
        const data = await authService.login(email, password);
        localStorage.setItem('happy_drop_token', data.token);
        localStorage.setItem('happy_drop_user', JSON.stringify(data.user));
        set({
          user: data.user,
          token: data.token,
          status: 'authenticated',
          error: null,
        });
        return data;
      } catch (err) {
        set({ status: 'unauthenticated', error: err });
        throw err;
      }
    },

    register: async (name, email, password) => {
      set({ status: 'loading', error: null });
      try {
        const data = await authService.register(name, email, password);
        localStorage.setItem('happy_drop_token', data.token);
        localStorage.setItem('happy_drop_user', JSON.stringify(data.user));
        set({
          user: data.user,
          token: data.token,
          status: 'authenticated',
          error: null,
        });
        return data;
      } catch (err) {
        set({ status: 'unauthenticated', error: err });
        throw err;
      }
    },

    logout: () => {
      localStorage.removeItem('happy_drop_token');
      localStorage.removeItem('happy_drop_user');
      set({ user: null, token: null, status: 'unauthenticated', error: null });
    },
  };
});
