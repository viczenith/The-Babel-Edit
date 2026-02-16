import { create } from 'zustand';
import { CartItem, CartResponse, Product } from './types';
import { STORAGE_KEYS, setWithTimestamp, getWithTimestamp } from './storage';
import { apiRequest, API_ENDPOINTS, ApiError } from '@/app/lib/api';

interface CartState {
  items: CartItem[];
  loading: boolean;
  loadingItems: Set<string>; // Track which products are currently being added
  error: string | null;
  totalItems: number;
  totalAmount: number;
}

interface CartActions {
  // Core cart operations
  addToCart: (productId: string, quantity?: number, options?: { size?: string; color?: string }) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Data management
  fetchCart: () => Promise<void>;
  loadFromStorage: () => void;
  syncWithBackend: () => Promise<void>;
  
  // Getters
  getCartItemCount: () => number;
  getCartTotal: () => number;
  isInCart: (productId: string) => boolean;
  isProductLoading: (productId: string) => boolean;
}

type CartStore = CartState & CartActions;

// Helper to get cookie
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

const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { totalItems, totalAmount };
};

const saveToStorage = (items: CartItem[]) => {
  setWithTimestamp(STORAGE_KEYS.CART, { items });
};

const initialState: CartState = {
  items: [],
  loading: false,
  loadingItems: new Set<string>(),
  error: null,
  totalItems: 0,
  totalAmount: 0,
};

export const useCartStore = create<CartStore>((set, get) => ({
  ...initialState,

  addToCart: async (productId: string, quantity = 1, options = {}) => {
    // Add product to loading set
    set(state => ({ 
      loadingItems: new Set(state.loadingItems).add(productId),
      error: null 
    }));
    
    try {
      // Make API call without waiting for fetchCart
      const response = await apiRequest(API_ENDPOINTS.CART.ADD, {
        method: 'POST',
        requireAuth: true,
        body: {
          productId,
          quantity,
          size: options.size || undefined,
          color: options.color || undefined,
        },
      });
      
      // Fetch cart in background without blocking
      get().fetchCart().catch(err => console.error('Background cart fetch failed:', err));
      
    } catch (error) {
      console.error('Failed to add to cart:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add to cart' });
      
      // Fallback to local storage for offline functionality
      const { items } = get();
      const existingItemIndex = items.findIndex(item => 
        item.productId === productId && 
        item.size === options.size &&
        item.color === options.color
      );

      let updatedItems: CartItem[];

      if (existingItemIndex >= 0) {
        updatedItems = items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + quantity, subtotal: item.price * (item.quantity + quantity) }
            : item
        );
      } else {
        // For offline mode, we'd need product data - this is a simplified version
        const newItem: CartItem = {
          id: `offline-${productId}-${Date.now()}`,
          productId,
          name: 'Product', // Would need to fetch from product store
          price: 0, // Would need actual price
          imageUrl: '',
          quantity,
          size: options.size,
          color: options.color,
          stock: 0, // Default stock for offline items
          subtotal: 0,
        };
        updatedItems = [...items, newItem];
      }

      const totals = calculateTotals(updatedItems);
      set({ 
        items: updatedItems, 
        ...totals
      });
      
      saveToStorage(updatedItems);
    } finally {
      // Remove product from loading set
      set(state => {
        const newLoadingItems = new Set(state.loadingItems);
        newLoadingItems.delete(productId);
        return { loadingItems: newLoadingItems };
      });
    }
  },

  removeFromCart: async (itemId: string) => {
    set({ loading: true, error: null });
    
    try {
      await apiRequest(API_ENDPOINTS.CART.REMOVE(itemId), {
        method: 'DELETE',
        requireAuth: true,
      });
      
      // Refresh cart after removing
      await get().fetchCart();
      
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to remove from cart' });
      
      // Fallback to local removal
      const { items } = get();
      const updatedItems = items.filter(item => item.id !== itemId);
      const totals = calculateTotals(updatedItems);
      
      set({ 
        items: updatedItems, 
        ...totals
      });
      
      saveToStorage(updatedItems);
    } finally {
      set({ loading: false });
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeFromCart(itemId);
      return;
    }

    set({ loading: true, error: null });
    
    try {
      await apiRequest(API_ENDPOINTS.CART.UPDATE(itemId), {
        method: 'PUT',
        requireAuth: true,
        body: { quantity },
      });
      
      // Refresh cart after updating
      await get().fetchCart();
      
    } catch (error) {
      console.error('Failed to update cart quantity:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update quantity' });
      
      // Fallback to local update
      const { items } = get();
      const updatedItems = items.map(item => 
        item.id === itemId 
          ? { ...item, quantity, subtotal: item.price * quantity }
          : item
      );

      const totals = calculateTotals(updatedItems);
      set({ 
        items: updatedItems, 
        ...totals
      });
      
      saveToStorage(updatedItems);
    } finally {
      set({ loading: false });
    }
  },

  clearCart: async () => {
    set({ loading: true, error: null });
    
    try {
      await apiRequest(API_ENDPOINTS.CART.CLEAR, {
        method: 'DELETE',
        requireAuth: true,
      });
      
      set({ 
        items: [], 
        totalItems: 0, 
        totalAmount: 0, 
        error: null 
      });
      
      saveToStorage([]);
      
    } catch (error) {
      console.error('Failed to clear cart:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to clear cart' });
      
      // Fallback to local clear
      set({ 
        items: [], 
        totalItems: 0, 
        totalAmount: 0
      });
      
      saveToStorage([]);
    } finally {
      set({ loading: false });
    }
  },

  fetchCart: async () => {
    set({ loading: true, error: null });
    
    try {
      const cartData = await apiRequest<CartResponse>(API_ENDPOINTS.CART.GET, {
        method: 'GET',
        requireAuth: true,
      });
      
      // Use API total, but fall back to client-side calculation if API returns 0 with items
      const apiTotal = cartData.total;
      const clientTotal = cartData.items.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity), 0);
      const resolvedTotal = (apiTotal > 0 || cartData.items.length === 0) ? apiTotal : clientTotal;

      set({ 
        items: cartData.items, 
        totalItems: cartData.itemCount, 
        totalAmount: resolvedTotal,
        error: null 
      });
      
      saveToStorage(cartData.items);
      
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      
      // If authenticated request fails, try loading from storage
      if (error instanceof Error && error.message.includes('Authentication')) {
        get().loadFromStorage();
      } else {
        set({ error: error instanceof Error ? error.message : 'Failed to fetch cart' });
        get().loadFromStorage(); // Fallback to local storage
      }
    } finally {
      set({ loading: false });
    }
  },

  loadFromStorage: () => {
    const cachedData = getWithTimestamp<{ items: CartItem[] }>(STORAGE_KEYS.CART);
    
    if (cachedData?.items?.length) {
      const totals = calculateTotals(cachedData.items);
      set({ 
        items: cachedData.items, 
        ...totals,
        error: null 
      });
    }
  },

  getCartItemCount: () => {
    const { totalItems } = get();
    return totalItems;
  },

  getCartTotal: () => {
    const { totalAmount } = get();
    return totalAmount;
  },

  isInCart: (productId: string) => {
    const { items } = get();
    return items.some(item => item.productId === productId);
  },

  isProductLoading: (productId: string) => {
    const { loadingItems } = get();
    return loadingItems.has(productId);
  },

  syncWithBackend: async () => {
  const { items } = get();
  
  // Check for token in cookies (matching your auth system)
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
      if (item.id.startsWith('offline-')) {
        try {
          await apiRequest(API_ENDPOINTS.CART.ADD, {
            method: 'POST',
            requireAuth: true,
            body: {
              productId: item.productId,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
            },
          });
          syncedCount++;
        } catch (itemError) {
          // Silently skip failed items
        }
      }
    }
    
    await get().fetchCart();
    
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to sync cart' });
  } finally {
    set({ loading: false });
  }
},
}));






// clearCart: async () => {
//   try {
//     set({ loading: true, error: null });
    
//     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart/clear`, {
//       method: 'DELETE',
//       credentials: 'include',
//     });

//     if (!response.ok) {
//       throw new Error('Failed to clear cart');
//     }

//     set({ 
//       items: [], 
//       totalAmount: 0, 
//       loading: false 
//     });
//   } catch (error) {
//     console.error('Clear cart error:', error);
//     set({ 
//       error: error instanceof Error ? error.message : 'Failed to clear cart',
//       loading: false 
//     });
//   }
// },