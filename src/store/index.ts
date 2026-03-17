import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Repository, Notification } from '@/types';
import { api } from '@/lib/api';

// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setLoading: (value) => set({ isLoading: value }),
  logout: () => {
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: async () => {
    try {
      const token = api.getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const response = await api.getMe();
      if (response.success && response.data) {
        set({ user: response.data.user, isAuthenticated: true });
      } else {
        api.setToken(null);
        set({ isAuthenticated: false });
      }
    } catch (error) {
      api.setToken(null);
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  }
}));

// Repository Store
interface RepositoryState {
  repositories: Repository[];
  currentRepository: Repository | null;
  isLoading: boolean;
  totalCount: number;
  setRepositories: (repos: Repository[]) => void;
  setCurrentRepository: (repo: Repository | null) => void;
  setLoading: (value: boolean) => void;
  fetchRepositories: (params?: any) => Promise<void>;
  fetchRepository: (id: string) => Promise<void>;
}

export const useRepositoryStore = create<RepositoryState>((set) => ({
  repositories: [],
  currentRepository: null,
  isLoading: false,
  totalCount: 0,
  setRepositories: (repos) => set({ repositories: repos }),
  setCurrentRepository: (repo) => set({ currentRepository: repo }),
  setLoading: (value) => set({ isLoading: value }),
  fetchRepositories: async (params) => {
    set({ isLoading: true });
    try {
      const response = await api.getRepositories(params);
      if (response.success) {
        set({
          repositories: response.data?.repositories || [],
          totalCount: response.meta?.total || 0
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },
  fetchRepository: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.getRepository(id);
      if (response.success) {
        set({ currentRepository: response.data?.repository || null });
      }
    } finally {
      set({ isLoading: false });
    }
  }
}));

// Notification Store
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (value: boolean) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (ids?: string[], markAll?: boolean) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setLoading: (value) => set({ isLoading: value }),
  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getNotifications();
      if (response.success) {
        set({
          notifications: response.data?.notifications || [],
          unreadCount: response.data?.unread_count || 0
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },
  markAsRead: async (ids, markAll) => {
    const response = await api.markNotificationsAsRead(ids, markAll);
    if (response.success) {
      if (markAll) {
        set({
          notifications: get().notifications.map(n => ({ ...n, is_read: true })),
          unreadCount: 0
        });
      } else if (ids) {
        set({
          notifications: get().notifications.map(n =>
            ids.includes(n.id) ? { ...n, is_read: true } : n
          ),
          unreadCount: Math.max(0, get().unreadCount - ids.length)
        });
      }
    }
  }
}));

// UI Store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  setSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      setSidebarOpen: (value) => set({ sidebarOpen: value }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }))
    }),
    {
      name: 'ui-storage'
    }
  )
);

// Dashboard Store
interface DashboardState {
  stats: {
    totalRepositories: number;
    aiDetections: number;
    pendingReviews: number;
    activeRules: number;
  } | null;
  recentDetections: any[];
  isLoading: boolean;
  setStats: (stats: any) => void;
  setRecentDetections: (detections: any[]) => void;
  setLoading: (value: boolean) => void;
  fetchDashboardData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  recentDetections: [],
  isLoading: false,
  setStats: (stats) => set({ stats }),
  setRecentDetections: (detections) => set({ recentDetections: detections }),
  setLoading: (value) => set({ isLoading: value }),
  fetchDashboardData: async () => {
    set({ isLoading: true });
    try {
      const [overviewResponse, detectionsResponse] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getDetections({ per_page: 5 })
      ]);

      if (overviewResponse.success) {
        const overview = overviewResponse.data?.overview;
        set({
          stats: {
            totalRepositories: overview.total_repositories,
            aiDetections: overview.ai_detected_issues + overview.ai_detected_prs,
            pendingReviews: 0, // TODO: Calculate from data
            activeRules: overview.active_rules
          }
        });
      }

      if (detectionsResponse.success) {
        set({ recentDetections: detectionsResponse.data?.detections || [] });
      }
    } finally {
      set({ isLoading: false });
    }
  }
}));
