import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { useLoadingStore } from '@/app/store';

export const useNavigationLoading = () => {
  const router = useRouter();
  const { setLoading } = useLoadingStore();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const navigateWithLoading = useCallback((url: string) => {
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Don't show loading for same page navigation
    if (typeof window !== 'undefined' && window.location.pathname === url) {
      return;
    }

    // Set loading state
    setLoading(true);

    // Navigate
    router.push(url);

    // Clear loading after timeout as fallback
    navigationTimeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, 3000); // 3 second timeout

  }, [router, setLoading]);

  // Function to manually clear loading (call this in your pages)
  const clearLoading = useCallback(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    setLoading(false);
  }, [setLoading]);

  return {
    navigateWithLoading,
    clearLoading
  };
};