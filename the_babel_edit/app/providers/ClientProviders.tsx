'use client';

import React from 'react';
import { StoreProvider } from './StoreProvider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export const ClientProviders: React.FC<ClientProvidersProps> = ({ children }) => {
  // Guard against browser extension errors (e.g., MetaMask ethereum injection)
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = event.reason?.message || event.reason?.toString?.() || String(event.reason);
      // Suppress ethereum-related extension errors and MetaMask connection errors
      if (
        reasonStr.includes('ethereum') ||
        reasonStr.includes('setExternalProvider') ||
        reasonStr.includes('MetaMask') ||
        reasonStr.includes('extension not found')
      ) {
        event.preventDefault();
        console.debug('[Extension Error Suppressed]', reasonStr.substring(0, 100));
      }
    };

    const handleWindowError = (ev: ErrorEvent) => {
      // Suppress thrown errors originating from injected ethereum provider shims
      if (ev?.message?.includes('setExternalProvider') || ev?.message?.includes('ethereum') || ev?.message?.includes('MetaMask')) {
        ev.preventDefault();
        console.debug('[Extension Error Suppressed]', ev.message.substring(0, 100));
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError as EventListener);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError as EventListener);
    };
  }, []);

  return (
    <StoreProvider>
      {children}
    </StoreProvider>
  );
};
