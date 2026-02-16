'use client';
import React from 'react';
import { useAuthGuard } from '@/app/lib/auth';
import Loading from '@/app/components/ui/Loading/Loading';
import { useParams } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo,
  fallback,
  requireAuth = true 
}) => {
  const params = useParams();
  const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';
  
  const defaultRedirectTo = redirectTo || `/${currentLocale}/auth/login`;
  const { loading, isAuthorized } = useAuthGuard(defaultRedirectTo, requireAuth);

  if (loading) {
    return fallback || (
      <Loading
        fullScreen={true}
        text={requireAuth ? 'Verifying authentication...' : 'Loading...'}
        size="large"
      />
    );
  }

  if (!isAuthorized) {
    return fallback || null; // Will redirect via useAuthGuard
  }

  return <>{children}</>;
};

// Convenience wrapper for pages that require authentication
export const RequireAuth: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <ProtectedRoute requireAuth={true} fallback={fallback}>
    {children}
  </ProtectedRoute>
);

// Convenience wrapper for pages that require NO authentication (auth pages)
export const RequireNoAuth: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <ProtectedRoute requireAuth={false} fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
