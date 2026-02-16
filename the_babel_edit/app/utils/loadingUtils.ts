import React from 'react';
import { useLoadingStore } from '@/app/store';

// Global loading utility functions that can be used anywhere
export const showGlobalLoading = (message?: string) => {
  useLoadingStore.getState().setLoading(true, message);
};

export const hideGlobalLoading = () => {
  useLoadingStore.getState().clearLoading();
};

// Common loading messages
export const LOADING_MESSAGES = {
  NAVIGATION: 'Loading page...',
  SEARCH: 'Searching...',
  LOGIN: 'Signing you in...',
  LOGOUT: 'Signing you out...',
  SAVING: 'Saving changes...',
  LOADING_PRODUCTS: 'Loading products...',
  ADDING_TO_CART: 'Adding to cart...',
  CHECKOUT: 'Processing checkout...',
  LANGUAGE_CHANGE: 'Changing language...',
  FORM_SUBMISSION: 'Submitting form...',
  IMAGE_UPLOAD: 'Uploading image...',
  DATA_SYNC: 'Syncing data...',
} as const;

// Async wrapper that shows/hides loading automatically
export const withLoading = async <T>(
  asyncFn: () => Promise<T>,
  loadingMessage?: string
): Promise<T> => {
  try {
    showGlobalLoading(loadingMessage || LOADING_MESSAGES.NAVIGATION);
    const result = await asyncFn();
    return result;
  } finally {
    hideGlobalLoading();
  }
};

// HOC for automatic loading on component mount
export const withComponentLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) => {
  return (props: P) => {
    const { setLoading, clearLoading } = useLoadingStore();
    
    React.useEffect(() => {
      setLoading(true, loadingMessage || LOADING_MESSAGES.NAVIGATION);
      
      // Clear loading after component mounts
      const timer = setTimeout(() => {
        clearLoading();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        clearLoading();
      };
    }, [setLoading, clearLoading]);
    
    return React.createElement(Component, props);
  };
};
