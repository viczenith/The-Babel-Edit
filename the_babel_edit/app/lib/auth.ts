import { useAuthStore } from '@/app/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  avatar?: string;
  phone?: string;
  addresses?: Array<{
    id?: string;
    type: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Auth middleware hook for protected routes
export function useAuthGuard(redirectTo: string = '/auth/login', requireAuth: boolean = true) {
  const router = useRouter();
  const { user, isAuthenticated, loading, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check authentication status on mount
      if (!user && typeof window !== 'undefined') {
        await checkAuth();
      }
      setIsChecking(false);
    };

    initAuth();
  }, [user, checkAuth]);

  useEffect(() => {
    // Only redirect after auth check is complete
    if (!isChecking && !loading) {
      if (requireAuth && !isAuthenticated) {
        // Save current path for redirect after login
        const currentPath = window.location.pathname + window.location.search;
        localStorage.setItem('authRedirectPath', currentPath);
        router.replace(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        // Redirect authenticated users away from auth pages
        const redirectPath = localStorage.getItem('authRedirectPath') || '/dashboard';
        localStorage.removeItem('authRedirectPath');
        router.replace(redirectPath);
      }
    }
  }, [isAuthenticated, isChecking, loading, requireAuth, redirectTo, router]);

  return {
    user,
    isAuthenticated,
    loading: loading || isChecking,
    isAuthorized: requireAuth ? isAuthenticated : !isAuthenticated
  };
}

// Hook for optional authentication (pages that work with or without auth)
export function useOptionalAuth() {
  const { user, isAuthenticated, loading, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (!user && typeof window !== 'undefined') {
        await checkAuth();
      }
      setIsInitialized(true);
    };

    initAuth();
  }, [user, checkAuth]);

  return {
    user,
    isAuthenticated,
    loading: loading || !isInitialized,
    isInitialized
  };
}

// Utility function to get auth token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken') || localStorage.getItem('token');
}

// Utility function to check if user has specific role or permission
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  // Implement your permission logic here
  // This is a placeholder implementation
  return true;
}

// Utility function to check if user owns a resource
export function canAccessResource(user: AuthUser | null, resourceUserId: string): boolean {
  if (!user) return false;
  return user.id === resourceUserId;
}

// Auth route configuration
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
} as const;

export const PROTECTED_ROUTES = [
  '/account',
  '/orders',
  '/wishlist',
  '/checkout',
] as const;

export const PUBLIC_ROUTES = [
  '/',
  '/dashboard',
  '/products',
  '/about',
  '/contact',
  ...Object.values(AUTH_ROUTES),
] as const;

// Check if route requires authentication
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route) || 
    pathname.includes(`/${route}`) ||
    pathname.match(new RegExp(`/[a-z]{2}${route}`)) // Handle locale routes
  );
}

// Check if route is public
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || 
    pathname.startsWith(route + '/') ||
    pathname.match(new RegExp(`^/[a-z]{2}${route === '/' ? '$' : route}`)) // Handle locale routes
  );
}

// Check if route is auth-related (login, signup, etc.)
export function isAuthRoute(pathname: string): boolean {
  return Object.values(AUTH_ROUTES).some(route => 
    pathname.includes(route) ||
    pathname.match(new RegExp(`/[a-z]{2}${route}`)) // Handle locale routes
  );
}
