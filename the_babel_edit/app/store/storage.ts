export const STORAGE_KEYS = {
  PRODUCTS: 'babel_edit_products',
  CART: 'babel_edit_cart',
  WISHLIST: 'babel_edit_wishlist',
  USER: 'babel_edit_user',
  ORDERS: 'babel_edit_orders',
  ADDRESSES: 'babel_edit_addresses',
  PREFERENCES: 'babel_edit_preferences',
} as const;

// Generic localStorage functions
export const getFromStorage = <T>(key: string, defaultValue?: T): T | null => {
  if (typeof window === 'undefined') return defaultValue || null;
  
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue || null;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error);
    return defaultValue || null;
  }
};

export const setToStorage = <T>(key: string, value: T): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (key: ${key}):`, error);
    return false;
  }
};

export const removeFromStorage = (key: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
    return false;
  }
};

export const clearStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Only clear our app's keys
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

// Utility to check if data is expired
export const isDataExpired = (timestamp: number, expirationHours: number = 24): boolean => {
  const now = Date.now();
  const expirationTime = timestamp + (expirationHours * 60 * 60 * 1000);
  return now > expirationTime;
};

// Wrapper for storing data with timestamp
export interface StoredData<T> {
  data: T;
  timestamp: number;
  version?: string;
}

export const setWithTimestamp = <T>(key: string, data: T, version?: string): boolean => {
  const storedData: StoredData<T> = {
    data,
    timestamp: Date.now(),
    ...(version && { version })
  };
  return setToStorage(key, storedData);
};

export const getWithTimestamp = <T>(
  key: string, 
  expirationHours?: number,
  defaultValue?: T
): T | null => {
  const stored = getFromStorage<StoredData<T>>(key);
  
  if (!stored) return defaultValue || null;
  
  // Check if data is expired
  if (expirationHours && isDataExpired(stored.timestamp, expirationHours)) {
    removeFromStorage(key);
    return defaultValue || null;
  }
  
  return stored.data;
};
