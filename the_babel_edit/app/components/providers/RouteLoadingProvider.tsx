'use client';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoadingStore } from '@/app/store';

// Loading component for the provider fallback
const RouteLoadingFallback = () => (
  <div style={{ display: 'contents' }}>
    {/* This renders nothing visible but maintains layout */}
  </div>
);

// Internal component that uses the hooks
const RouteLoadingHandler = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { clearLoading } = useLoadingStore();

  useEffect(() => {
    // Clear loading state when route changes are complete
    clearLoading();
  }, [pathname, searchParams, clearLoading]);

  return <>{children}</>;
};

export const RouteLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <RouteLoadingHandler>{children}</RouteLoadingHandler>
    </Suspense>
  );
};
