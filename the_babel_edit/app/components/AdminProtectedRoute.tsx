'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Loading from '@/app/components/ui/Loading/Loading';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  loadingFallback
}) => {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user, loading } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [timeoutReached, setTimeoutReached] = useState(false);
 
  const isAuthenticated = !!user;
  const isAdmin = user?.role && ['admin', 'super_admin'].includes(user.role.toLowerCase());

  // Check auth state changes
  useEffect(() => {
    // Auth state monitoring (no logging in production)
  }, [loading, isInitialLoad, isAuthenticated, user, isAdmin]);

  // Add timeout protection
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading || isInitialLoad) {
        setTimeoutReached(true);
        if (!user) {
          router.replace(`/${locale}/auth/login?from=${encodeURIComponent(window.location.pathname)}`);
        } else if (!isAdmin) {
          router.replace(`/${locale}`);
        }
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading, isInitialLoad, user, isAdmin, router, locale]);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      if (!loading && mounted) {
        if (!isAuthenticated) {
          router.replace(`/${locale}/auth/login?from=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        
        if (!isAdmin) {
          router.replace(`/${locale}`);
          return;
        }
        
        setIsInitialLoad(false);
      }
    };
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isAdmin, loading, router, locale, user]);

  if (loading || isInitialLoad) {
    return loadingFallback || (
      <Loading
        fullScreen={true}
        text={timeoutReached ? "Connection issue detected..." : "Verifying admin access..."}
        size="large"
      />
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return loadingFallback || (
      <Loading
        fullScreen={true}
        text="Redirecting..."
        size="large"
      />
    );
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;