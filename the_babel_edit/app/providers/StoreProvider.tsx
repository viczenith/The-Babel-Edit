'use client';

import { useEffect, useState } from 'react';
import { useProductStore, useCartStore, useWishlistStore } from '@/app/store';
import { useSiteSettingsStore } from '@/app/store/useSiteSettingsStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Only initialize on client-side after hydration
    const initializeStores = async () => {
      try {
        // Access stores only after component mounts
        const productStore = useProductStore.getState();
        const cartStore = useCartStore.getState();
        const wishlistStore = useWishlistStore.getState();

        // Initialize stores from localStorage
        productStore.loadFromCache();
        cartStore.loadFromStorage();
        wishlistStore.loadFromStorage();

        // Fetch site settings (public, no auth needed)
        useSiteSettingsStore.getState().fetchSettings();

        // Sync with backend after a delay
        setTimeout(() => {
          Promise.all([
            cartStore.syncWithBackend(),
            wishlistStore.syncWithBackend(),
          ]).catch(console.error);
        }, 1000);

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize stores:', error);
        setIsInitialized(true); // Continue anyway
      }
    };

    initializeStores();

    // Listen for online/offline events
    const handleOnline = () => {
      try {
        const cartStore = useCartStore.getState();
        const wishlistStore = useWishlistStore.getState();
        
        Promise.all([
          cartStore.syncWithBackend(),
          wishlistStore.syncWithBackend(),
        ]).catch(console.error);
      } catch (error) {
        console.error('Failed to sync stores:', error);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return <>{children}</>;
};
