export { useProductStore } from './useProductStore';
export { useCartStore } from './useCartStore';
export { useWishlistStore } from './useWishlistStore';
export { useAuthStore } from './useAuthStore';
export { useLoadingStore } from './useLoadingStore';
export { useSiteSettingsStore } from './useSiteSettingsStore';
export type { SiteSettings } from './useSiteSettingsStore';

// Export types
export type {
  User,
  Product,
  Collection,
  CartItem,
  CartResponse,
  WishlistItem,
  Order,
  OrderItem,
  Address,
  ApiError,
  PaginatedResponse,
  FilterOptions,
  SortByType,
} from './types';

// Export storage utilities
export {
  STORAGE_KEYS,
  getFromStorage,
  setToStorage,
  removeFromStorage,
  clearStorage,
  setWithTimestamp,
  getWithTimestamp,
  isDataExpired,
} from './storage';

// Utility functions for store initialization
export const initializeStoresFromStorage = () => {
  // This is handled by StoreProvider now
};

export const syncStoresWithBackend = async () => {
  // This is handled by StoreProvider now
};
