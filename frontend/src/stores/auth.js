import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    plan: null,
    token: null,
    jobs: {
      assigned: [],
      posted: [],
      completed: []
    },
    loading: false,
    initialized: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    role: (state) => state.user?.role ?? null,
    assignedJobs: (state) => state.jobs?.assigned ?? [],
    postedJobs: (state) => state.jobs?.posted ?? [],
    completedJobs: (state) => state.jobs?.completed ?? [],
    isDealer() {
      return this.role === 'dealer';
    },
    isDriver() {
      return this.role === 'driver';
    },
    hasPlannerAccess() {
      return this.role === 'admin' || (this.role === 'driver' && String(this.plan).toLowerCase() === 'gold');
    }
  },
  actions: {
    async initialize() {
      if (this.initialized) {
        return;
      }
      this.initialized = true;
      if (typeof window !== 'undefined') {
        const storedToken = window.localStorage.getItem('mr_auth_token');
        if (storedToken) {
          this.token = storedToken;
          await this.fetchMe();
        }
      }
    },
    setSession({ token, user, plan, jobs }) {
      this.token = token || null;
      this.user = user || null;
      this.plan = plan || null;
      this.jobs = {
        assigned: Array.isArray(jobs?.assigned) ? jobs.assigned : [],
        posted: Array.isArray(jobs?.posted) ? jobs.posted : [],
        completed: Array.isArray(jobs?.completed) ? jobs.completed : []
      };
      if (typeof window !== 'undefined') {
        if (token) {
          window.localStorage.setItem('mr_auth_token', token);
        } else {
          window.localStorage.removeItem('mr_auth_token');
        }
      }
    },
    clearSession() {
      this.setSession({ token: null, user: null, plan: null });
    },
    async fetchMe() {
      if (!this.token) {
        this.clearSession();
        return;
      }

      this.loading = true;
      try {
        const { data } = await api.get('/profile');
        this.user = data?.user ?? null;
        this.plan = data?.plan ?? null;
        this.jobs = {
          assigned: Array.isArray(data?.jobs?.assigned) ? data.jobs.assigned : [],
          posted: Array.isArray(data?.jobs?.posted) ? data.jobs.posted : [],
          completed: Array.isArray(data?.jobs?.completed) ? data.jobs.completed : []
        };
      } catch (error) {
        console.error('Failed to fetch auth profile', error);
        this.clearSession();
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error('Failed to logout', error);
      } finally {
        this.clearSession();
      }
    }
  }
});
