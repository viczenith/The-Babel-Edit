import { create } from 'zustand';
import { WishlistItem, Product } from './types';
import { STORAGE_KEYS, setWithTimestamp, getWithTimestamp } from './storage';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
}

interface WishlistActions {
  // Core wishlist operations  
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;

  // Data management
  fetchWishlist: () => Promise<void>;
  loadFromStorage: () => void;
  syncWithBackend: () => Promise<void>;

  // Getters
  isInWishlist: (productId: string) => boolean;
  getWishlistCount: () => number;
}

type WishlistStore = WishlistState & WishlistActions;

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

const saveToStorage = (items: WishlistItem[]) => {
  setWithTimestamp(STORAGE_KEYS.WISHLIST, { items });
};

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
};

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  ...initialState,

  addToWishlist: async (productId: string) => {
    const { items } = get();

    // Check if product is already in wishlist
    const existingItem = items.find(item => item.productId === productId);
    if (existingItem) {
      return; // Already in wishlist
    }

    set({ loading: true, error: null });

    try {
      await apiRequest(API_ENDPOINTS.WISHLIST.ADD, {
        method: 'POST',
        requireAuth: true,
        body: { productId },
      });

      // Refresh wishlist after adding
      await get().fetchWishlist();

    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add to wishlist' });

      // Fallback to local storage for offline functionality
      const newItem: WishlistItem = {
        id: `offline-wishlist-${productId}-${Date.now()}`,
        productId,
        product: {} as Product, // Would need to fetch from product store
        addedAt: new Date().toISOString(),
      };

      const updatedItems = [...items, newItem];
      set({ items: updatedItems });
      saveToStorage(updatedItems);
    } finally {
      set({ loading: false });
    }
  },

  removeFromWishlist: async (productId: string) => {
    set({ loading: true, error: null });

    try {
      await apiRequest(API_ENDPOINTS.WISHLIST.REMOVE(productId), {
        method: 'DELETE',
        requireAuth: true,
      });

      // Refresh wishlist after removing
      await get().fetchWishlist();

    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to remove from wishlist' });

      // Fallback to local removal
      const { items } = get();
      const updatedItems = items.filter(item => item.productId !== productId);

      set({ items: updatedItems });
      saveToStorage(updatedItems);
    } finally {
      set({ loading: false });
    }
  },

  clearWishlist: async () => {
    set({ loading: true, error: null });

    try {
      await apiRequest(API_ENDPOINTS.WISHLIST.CLEAR, {
        method: 'DELETE',
        requireAuth: true,
      });

      set({ items: [], error: null });
      saveToStorage([]);

    } catch (error) {
      console.error('Failed to clear wishlist:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to clear wishlist' });

      // Fallback to local clear
      set({ items: [] });
      saveToStorage([]);
    } finally {
      set({ loading: false });
    }
  },

  fetchWishlist: async () => {
    set({ loading: true, error: null });

    try {
      const wishlistData = await apiRequest<{
        items: WishlistItem[];
        pagination?: any;
      }>(API_ENDPOINTS.WISHLIST.GET, {
        method: 'GET',
        requireAuth: true,
      });

      set({
        items: wishlistData.items || [],
        error: null
      });

      saveToStorage(wishlistData.items || []);

    } catch (error) {
      console.error('Failed to fetch wishlist:', error);

      // If authenticated request fails, try loading from storage
      if (error instanceof Error && error.message.includes('Authentication')) {
        get().loadFromStorage();
      } else {
        set({ error: error instanceof Error ? error.message : 'Failed to fetch wishlist' });
        get().loadFromStorage(); // Fallback to local storage
      }
    } finally {
      set({ loading: false });
    }
  },

  loadFromStorage: () => {
    const cachedData = getWithTimestamp<{ items: WishlistItem[] }>(STORAGE_KEYS.WISHLIST);

    if (cachedData?.items?.length) {
      set({ items: cachedData.items, error: null });
    }
  },

  isInWishlist: (productId: string) => {
    const { items } = get();
    return items.some(item => item.productId === productId);
  },

  getWishlistCount: () => {
    const { items } = get();
    return items.length;
  },

  syncWithBackend: async () => {
    const { items } = get();

    // ✅ CORRECT: Check for token in cookies
    const token = getCookie('accessToken');
    if (!token) {
      return;
    }

    if (items.length === 0) {
      return;
    }

    set({ loading: true, error: null });

    try {
      let syncedCount = 0;
      for (const item of items) {
        if (item.id.startsWith('offline-wishlist-')) {
          try {
            await apiRequest(API_ENDPOINTS.WISHLIST.ADD, {
              method: 'POST',
              requireAuth: true,
              body: { productId: item.productId },
            });
            syncedCount++;
          } catch (itemError) {
            // Silently skip failed items
          }
        }
      }

      await get().fetchWishlist();

    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sync wishlist' });
    } finally {
      set({ loading: false });
    }
  },
}));
