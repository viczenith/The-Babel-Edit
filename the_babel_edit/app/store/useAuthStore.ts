import { create } from 'zustand';
import { User } from './types';
import { STORAGE_KEYS, setWithTimestamp, getWithTimestamp } from './storage';
import { apiRequest, API_ENDPOINTS, setAuthToken, removeAuthToken } from '@/app/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  // Authentication actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isAgree: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  
  // User management
  fetchProfile: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  
  // Token management
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  
  // State management
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  setUser: (user: User | null) => {
    set({ 
      user, 
      isAuthenticated: !!user,
      error: null 
    });
    
    // Save user to storage
    if (user) {
      setWithTimestamp(STORAGE_KEYS.USER, user );
      // Set role cookie for middleware
      if (typeof document !== 'undefined') {
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        document.cookie = `userRole=${user.role}; path=/; max-age=86400;${isSecure ? ' secure;' : ''} samesite=strict`;
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem("accessToken"); // ✅ clear token on logout
        // Remove role cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      }
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
    
    removeAuthToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem("accessToken"); // ✅ clear token
      // Remove role cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiRequest<{
        user: User;
        accessToken: string;
        message: string;
      }>(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: { email, password },
      });
      
      // Store the access token
      setAuthToken(response.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem("accessToken", response.accessToken);
      }
      
      // Set user in state
      get().setUser(response.user);
      
      // Sync cart after successful login
      try {
        const cartStore = (await import('./useCartStore')).useCartStore;
        await cartStore.getState().syncWithBackend();
      } catch (syncError) {
        console.warn('Failed to sync cart after login:', syncError);
        // Don't fail login if cart sync fails
      }
      
    } catch (error) {
      console.error('Login error:', error);
      set({ error: error instanceof Error ? error.message : 'Login failed' });
    } finally {
      set({ loading: false });
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiRequest<{
        user: User;
        accessToken: string;
        message: string;
      }>(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        body: userData,
      });
      
      // Store the access token
      setAuthToken(response.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem("accessToken", response.accessToken);
      }
      
      // Set user in state
      get().setUser(response.user);
      
      // Sync cart after successful registration
      try {
        const cartStore = (await import('./useCartStore')).useCartStore;
        await cartStore.getState().syncWithBackend();
      } catch (syncError) {
        console.warn('Failed to sync cart after registration:', syncError);
        // Don't fail registration if cart sync fails
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      set({ error: error instanceof Error ? error.message : 'Registration failed' });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    
    try {
      await apiRequest(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        requireAuth: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if server request fails
    }
    
    get().clearAuth();
    set({ loading: false });
  },

  fetchProfile: async () => {
    set({ loading: true, error: null });
    
    try {
      const user = await apiRequest<User>(API_ENDPOINTS.AUTH.PROFILE, {
        method: 'GET',
        requireAuth: true,
      });
      
      get().setUser(user);
      
    } catch (error) {
      console.error('Fetch profile error:', error);
      
      // If authentication fails, clear auth state
      if (error instanceof Error && error.message.includes('Authentication')) {
        get().clearAuth();
      } else {
        set({ error: error instanceof Error ? error.message : 'Failed to fetch profile' });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (userData) => {
    set({ loading: true, error: null });
    
    try {
      const updatedUser = await apiRequest<User>(API_ENDPOINTS.AUTH.PROFILE, {
        method: 'PUT',
        requireAuth: true,
        body: userData,
      });
      
      get().setUser(updatedUser);
      
    } catch (error) {
      console.error('Update profile error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update profile' });
    } finally {
      set({ loading: false });
    }
  },

  refreshToken: async () => {
    try {
      const response = await apiRequest<{
        accessToken: string;
      }>(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
      });
      
      setAuthToken(response.accessToken);
      localStorage.setItem("accessToken", response.accessToken); // ✅ save refreshed token
      return true;
      
    } catch (error) {
      console.error('Token refresh error:', error);
      get().clearAuth();
      return false;
    }
  },

  checkAuth: async () => {
    // First, try to load user from storage
    const cachedData = getWithTimestamp<{ user: User }>(STORAGE_KEYS.USER);
    if (cachedData?.user) {
      set({ 
        user: cachedData.user,
        isAuthenticated: true 
      });
    }
    
    // Then verify with server
    try {
      const user = await apiRequest<User>(API_ENDPOINTS.AUTH.VERIFY, {
        method: 'GET',
        requireAuth: true,
      });
      
      get().setUser(user);
      
    } catch (error) {
      console.error('Auth check error:', error);
      
      // If token verification fails, try to refresh
      const refreshed = await get().refreshToken();
      
      if (refreshed) {
        // Retry verification with new token
        try {
          const user = await apiRequest<User>(API_ENDPOINTS.AUTH.VERIFY, {
            method: 'GET',
            requireAuth: true,
          });
          
          get().setUser(user);
        } catch (retryError) {
          console.error('Auth check retry error:', retryError);
          get().clearAuth();
        }
      } else {
        get().clearAuth();
      }
    }
  },
}));