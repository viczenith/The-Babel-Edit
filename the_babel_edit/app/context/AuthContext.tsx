'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { apiRequest, API_ENDPOINTS, setAuthToken, removeAuthToken, checkServerAvailability, getHealthUrl } from '@/app/lib/api';
import { useAuthStore } from '@/app/store/useAuthStore';

type Address = {
  id?: string;
  type: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  name: string;
  phone?: string;
  avatar?: string;
  addresses?: Address[];
  isVerified?: boolean;
  isPrimary?: boolean;
}
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  authenticatedFetch: (endpoint: string, options?: any) => Promise<any>;
  setUser: (userData: User | null) => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cookie utility functions
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? ';secure' : '';
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/${secureFlag};samesite=lax`;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

// User data storage utilities
const setUserData = (userData: User) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('user', JSON.stringify(userData));
  } catch (error) {
    // Failed to save user data
  }
};

const getUserData = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    // Failed to retrieve user data
    return null;
  }
};

const clearUserData = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('user');
  } catch (error) {
    // Failed to clear user data
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sync user state to both AuthContext and useAuthStore to prevent state drift
  const syncUserState = (userData: User | null) => {
    setUserState(userData);
    // Keep useAuthStore in sync so ProtectedRoute (which reads useAuthStore) works correctly
    try {
      const storeSetUser = useAuthStore.getState().setUser;
      storeSetUser(userData as any);
    } catch (e) {
      // Ignore if store not available during SSR
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const isServerHealthy = await checkServerAvailability();

      const storedUser = getUserData();
      const storedToken = getCookie('accessToken');

      if (storedUser && storedToken) {
        syncUserState(storedUser);
        setCookie('userRole', storedUser.role, 7);
        setLoading(false);

        if (!isServerHealthy) {
          // Server unavailable - using stored credentials
          return;
        }

        // ✅ CRITICAL FIX: Don't clear auth on background verification failure
        setTimeout(() => {
          verifyStoredAuth().then(isValid => {
            if (!isValid) {
              // Background token verification failed
              // Don't clear auth here - only clear if user action triggers a 401
            }
          }).catch(() => {
            // Background verification error
          });
        }, 100);

      } else if (storedToken) {
        await checkAuth();
        setLoading(false);
      } else {
        setLoading(false);
      }

    } catch (error) {
      setLoading(false);
    }
  };

  const verifyStoredAuth = async (): Promise<boolean> => {
    try {
      const response = await apiRequest<{ user: User }>(
        API_ENDPOINTS.AUTH.VERIFY,
        { requireAuth: true }
      );

      if (response.user) {
        syncUserState(response.user);
        setUserData(response.user);
        setCookie('userRole', response.user.role, 7);
        return true;
      }

      return false;
    } catch (error: any) {
      // Verify failed - run health diagnostic silently
      try {
        if (error && error.status && error.status >= 500) {
          // Server error — keep existing session
        }
      } catch (diagErr) {
        // Diagnostic error
      }

      // Don't clear auth on 500 errors - only on 401
      if (error.status === 401 || error.code === 'SESSION_EXPIRED') {
        return false;
      }

      // For other errors (like 500), keep existing session
      // and let the user continue
      return true; // Assume valid if we have a token
    }
  };

  const checkAuth = async () => {
    try {
      const token = getCookie('accessToken');
      if (!token) {
        return;
      }

      const response = await apiRequest<{ user: User }>(
        API_ENDPOINTS.AUTH.VERIFY,
        { requireAuth: true }
      );

      if (response.user) {
        syncUserState(response.user);
        setUserData(response.user);
        setCookie('userRole', response.user.role, 7);
      }
    } catch (error: any) {
      if (error.code === 'SESSION_EXPIRED' || error.code === 'ACCOUNT_SUSPENDED') {
        clearAuthData();
        if (error.code === 'ACCOUNT_SUSPENDED') {
          toast.error(error.message || 'Your account has been suspended.');
        }
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest<{ accessToken: string; user: User }>(
        API_ENDPOINTS.AUTH.LOGIN,
        {
          method: 'POST',
          body: { email, password },
        }
      );

      // Store token and user data
      setAuthToken(response.accessToken);
      syncUserState(response.user);
      setUserData(response.user);
      setCookie('userRole', response.user.role, 7);

      toast.success("Login successful!");

      return { success: true, user: response.user };
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  };

  const signup = async (userData: any) => {
    try {
      const response = await apiRequest<{ accessToken: string; user: User }>(
        API_ENDPOINTS.AUTH.REGISTER,
        {
          method: 'POST',
          body: userData,
        }
      );

      // Store token and user data
      setAuthToken(response.accessToken);
      syncUserState(response.user);
      setUserData(response.user);
      setCookie('userRole', response.user.role, 7);

      toast.success("Account created successfully!");

      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
      return {
        success: false,
        error: error.message || 'Signup failed'
      };
    }
  };

  const clearAuthData = () => {
    syncUserState(null);
    removeAuthToken();
    deleteCookie('userRole');
    clearUserData();
  };

  const getLocalePrefix = (): string => {
    if (typeof window === 'undefined') return '/en';
    const segments = window.location.pathname.split('/').filter(Boolean);
    const locale = segments[0];
    return ['en', 'fr'].includes(locale) ? `/${locale}` : '/en';
  };

  const logout = async () => {
    try {
      await apiRequest(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        requireAuth: true,
      });
    } catch (error) {
      // Logout API call failed - still clear local auth
    } finally {
      clearAuthData();
      router.push(`${getLocalePrefix()}/auth/login`);
    }
  };

  // Function to make authenticated API calls from components
  const authenticatedFetch = async (endpoint: string, options: any = {}) => {
    try {
      return await apiRequest(endpoint, {
        ...options,
        requireAuth: true,
      });
    } catch (error: any) {
      // If session expired, clear auth and redirect
      if (error.code === 'SESSION_EXPIRED') {
        clearAuthData();
        router.push(`${getLocalePrefix()}/auth/login`);
      }

      throw error;
    }
  };

  // Function to update user data
  const updateUser = (userData: User) => {
    syncUserState(userData);
    setUserData(userData);
    setCookie('userRole', userData.role, 7);
  };

  const setUser = (userData: User | null) => {
    if (userData) {
      updateUser(userData);
    } else {
      clearAuthData();
    }
  };

  const value: AuthContextType = {
    user,
    login,
    signup,
    logout,
    loading,
    authenticatedFetch,
    setUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};