// API base URL configuration - with intelligent fallback
// 1. Check environment variable first (NEXT_PUBLIC_API_URL from .env.local)
// 2. Default to localhost:5000 (will auto-fallback if not available during request)

const API_BASE_URL = (() => {
  // If explicit URL set in environment, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Default fallback
  return 'http://localhost:5000/api';
})();

// Ensure consistent protocol usage
const getApiUrl = (endpoint: string) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // In development, always use HTTP for localhost
  if (process.env.NODE_ENV !== 'production' && url.includes('localhost')) {
    return url.replace('https:', 'http:');
  }

  return url;
};

export const getHealthUrl = () => getApiUrl('/health');

// Retry helper for Render cold starts (free tier spins down after inactivity)
const fetchWithRetry = async (url: string, config: RequestInit, retries = 2, delayMs = 3000): Promise<Response> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      // If the request was aborted (e.g. React Strict Mode unmount), don't retry — just throw
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (attempt === retries) throw error;
      // Wait before retrying — server may be waking up from cold start
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw new Error('Failed after retries');
};

// Server availability tracking
let isServerAvailable = true;
let lastServerCheck = 0;
const SERVER_CHECK_INTERVAL = 30000; // 30 seconds

// Types and Interfaces
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requireAuth?: boolean;
  isFormData?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to check if running in development
const isDevelopment = () => {
  return (
    process.env.NODE_ENV !== 'production' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  );
};

// Cookie utility functions (matching AuthContext but with secure flag fix)
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let c of ca) {
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  // Only use secure flag in production (HTTPS)
  const secureFlag = isDevelopment() ? '' : ';secure';
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;samesite=lax${secureFlag}`;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;secure;samesite=strict`;
};

// Server Health Check
export const checkServerAvailability = async (): Promise<boolean> => {
  const now = Date.now();
  if (now - lastServerCheck < SERVER_CHECK_INTERVAL) {
    return isServerAvailable;
  }

  try {
    const healthUrl = getHealthUrl();
    const response = await fetchWithRetry(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, 2, 5000);

    // If the health endpoint responds at all the backend process is reachable.
    // Treat any HTTP response as the server being available (network reachable).
    isServerAvailable = true;
    // non-OK status is still a reachable server
  } catch (err) {
    isServerAvailable = false;
  }

  lastServerCheck = now;
  return isServerAvailable;
};

// Authentication Token Management (using cookies like AuthContext)
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return getCookie('accessToken');
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') setCookie('accessToken', token, 7);
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
    deleteCookie('userRole');
  }
};

// Token Refresh Handler
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const onTokenRefreshFailed = () => {
  refreshSubscribers.forEach((callback) => callback(''));
  refreshSubscribers = [];
};

const refreshAuthToken = async (): Promise<string | null> => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token: string) => resolve(token || null));
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.accessToken) {
        setAuthToken(data.accessToken);
        onTokenRefreshed(data.accessToken);
        return data.accessToken;
      }
    }

    onTokenRefreshFailed();
    return null;
  } catch (error) {
    onTokenRefreshFailed();
    return null;
  } finally {
    isRefreshing = false;
  }
};

// Main API Request Handler
export const apiRequest = async <T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const { method = 'GET', headers = {}, body, requireAuth = false, isFormData = false } = options;
  const url = getApiUrl(endpoint);

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (!isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Add auth token if required
  const token = getAuthToken();
  if (requireAuth && !token) {
    throw new ApiError('Authentication required but no token available', 401, 'NO_TOKEN');
  }

  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const requestConfig: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (body) {
    requestConfig.body = isFormData ? body : JSON.stringify(body);
  }



  try {
    let response = await fetchWithRetry(url, requestConfig);

    // Handle suspension 403 separately — do NOT treat as token error
    let suspensionChecked = false;
    if (response.status === 403 && token) {
      try {
        const cloned = response.clone();
        const body = await cloned.json().catch(() => ({}));
        if (body?.message?.toLowerCase().includes('suspended')) {
          removeAuthToken();
          throw new ApiError(body.message, 403, 'ACCOUNT_SUSPENDED');
        }
        suspensionChecked = true;
      } catch (e) {
        if (e instanceof ApiError) throw e;
        // fall through to normal handling
      }
    }

    // Handle 401 (expired token) - try refreshing token
    // Only treat 403 as token error if we haven't already checked for suspension
    const isTokenError = response.status === 401 || (response.status === 403 && token && !suspensionChecked);
    if (isTokenError && token) {

      const newToken = await refreshAuthToken();

      if (newToken) {
        requestHeaders.Authorization = `Bearer ${newToken}`;
        const retryConfig = { ...requestConfig, headers: requestHeaders };
        response = await fetch(url, retryConfig);

        if (response.status === 401 || response.status === 403) {
          removeAuthToken();
          throw new ApiError('Session expired. Please login again.', 401, 'SESSION_EXPIRED');
        }
      } else {
        removeAuthToken();
        throw new ApiError('Session expired. Please login again.', 401, 'SESSION_EXPIRED');
      }
    }

    if (!response.ok) {
      // Try to parse JSON error body, otherwise fall back to text
      let errorData: any = {};
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          const jsonData = await response.json();
          errorData = jsonData && Object.keys(jsonData).length > 0 ? jsonData : { message: `Server error: ${response.status} ${response.statusText}` };
        } else {
          const text = await response.text().catch(() => '');
          errorData = { message: text || `Request failed with status ${response.status} ${response.statusText}` };
        }
      } catch (e) {
        errorData = { message: `Request failed with status ${response.status} ${response.statusText}` };
      }

      const message = errorData?.message || `Request failed with status ${response.status}`;
      const code = errorData?.code;
      
      throw new ApiError(message, response.status, code);
    }

    // Handle 204 No Content (e.g., DELETE operations)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    // Check if response has JSON content before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      undefined,
      'NETWORK_ERROR'
    );
  }
};

// API Endpoints Configuration
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    PROFILE: '/auth/profile',
  },
  PRODUCTS: {
    LIST: '/products',
    FEATURED: '/products/featured',
    BY_ID: (id: string) => `/products/${id}`,
    SUGGESTIONS: '/search/suggestions',
    FILTER_OPTIONS: '/products/filter-options',
    ADMIN: {
      LIST: '/admin/products',
      BY_ID: (id: string) => `/admin/products/${id}`,
      CREATE: '/admin/products',
      UPDATE: (id: string) => `/admin/products/${id}`,
      DELETE: (id: string) => `/admin/products/${id}`,
      UPLOAD_IMAGE: '/admin/products/upload-image',
      UPLOAD_IMAGES: '/admin/products/upload-images',
    },
  },
  COLLECTIONS: {
    LIST: '/collections',
    BY_ID: (id: string) => `/collections/${id}`,
    BY_NAME: (name: string) => `/collections/${name}`,
    PRODUCTS: (name: string) => `/collections/${name}/products`,
    ADMIN: {
      CREATE: '/admin/collections',
      UPDATE: (id: string) => `/admin/collections/${id}`,
      DELETE: (id: string) => `/admin/collections/${id}`,
      STATS: (id: string) => `/admin/collections/${id}/stats`,
    },
  },
  CATEGORIES: {
    LIST: '/types/categories',
    BY_ID: (id: string) => `/types/categories/${id}`,
    WITH_TYPES: (id: string) => `/types/categories/${id}`,
    ADMIN: {
      CREATE: '/types/categories',
      UPDATE: (id: string) => `/types/categories/${id}`,
      DELETE: (id: string) => `/types/categories/${id}`,
    },
  },
  TYPES: {
    LIST: '/types/all-types',
    BY_CATEGORY: (categoryId: string) => `/types/categories/${categoryId}/types`,
    ADMIN: {
      CREATE: '/types/types',
      UPDATE: (typeId: string) => `/types/types/${typeId}`,
      DELETE: (typeId: string) => `/types/types/${typeId}`,
    },
  },
  CART: {
    GET: '/cart',
    ADD: '/cart/add',
    UPDATE: (itemId: string) => `/cart/item/${itemId}`,
    REMOVE: (itemId: string) => `/cart/item/${itemId}`,
    CLEAR: '/cart/clear',
  },
  WISHLIST: {
    GET: '/wishlist',
    ADD: '/wishlist/add',
    REMOVE: (productId: string) => `/wishlist/remove/${productId}`,
    CHECK: (productId: string) => `/wishlist/check/${productId}`,
    CLEAR: '/wishlist/clear',
    MOVE_TO_CART: (productId: string) => `/wishlist/move-to-cart/${productId}`,
  },
  ORDERS: {
    LIST: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    CREATE: '/orders',
    CONFIRM_PAYMENT: (id: string) => `/orders/${id}/confirm-payment`,
    CANCEL: (orderId: string) => `/orders/${orderId}/cancel`,
    ADMIN: {
      LIST: '/orders/admin/all',
      BY_ID: (orderId: string) => `/orders/admin/${orderId}`,
      UPDATE_STATUS: (orderId: string) => `/orders/admin/${orderId}/status`,
    },
  },
  ADDRESSES: {
    LIST: '/addresses',
    BY_ID: (id: string) => `/addresses/${id}`,
    CREATE: '/addresses',
    UPDATE: (id: string) => `/addresses/${id}`,
    DELETE: (id: string) => `/addresses/${id}`,
  },
  USERS: {
    LIST: '/auth/admin/users',
    BY_ID: (id: string) => `/auth/admin/users/${id}`,
    UPDATE_ROLE: (id: string) => `/auth/admin/users/${id}/role`,
    TOGGLE_SUSPEND: (id: string) => `/auth/admin/users/${id}/suspend`,
    TOGGLE_VERIFY: (id: string) => `/auth/admin/users/${id}/verify`,
    DELETE: (id: string) => `/auth/admin/users/${id}`,
    STATS: '/auth/admin/users/stats',
  },
  REVIEWS: {
    CREATE: '/reviews',
    LIST: '/reviews',
    DELETE: (reviewId: string) => `/reviews/${reviewId}`,
  },
  ADMIN: { // New top-level ADMIN key
    TESTIMONIALS: {
      LIST: '/admin/testimonials', // GET all featured testimonial IDs
      ADD: '/admin/testimonials',   // POST to add a reviewId as testimonial
      REMOVE: (reviewId: string) => `/admin/testimonials/${reviewId}`, // DELETE to remove
      PUBLIC_LIST: '/testimonials/public', // GET public testimonials (non-admin)
    }
  },
  FEEDBACK: {
    LIST: '/feedback',
    CREATE: '/feedback',
    UPDATE: (feedbackId: string) => `/feedback/${feedbackId}`,
    DELETE: (feedbackId: string) => `/feedback/${feedbackId}`,
    FEATURED: '/feedback/featured',
  },
  DASHBOARD: {
    GET_HERO_SLIDES: '/dashboard/hero-slides',
    UPDATE_HERO_SLIDES: '/admin/dashboard/hero-slides',
    GET_HIGHLIGHT_CARDS: '/dashboard/highlight-cards',
    UPDATE_HIGHLIGHT_CARDS: '/admin/dashboard/highlight-cards',
    GET_SUMMER_BANNER: '/dashboard/summer-banner',
    UPDATE_SUMMER_BANNER: '/admin/dashboard/summer-banner',
    GET_LANDING_PAGE: '/dashboard/landing-page',
    UPDATE_LANDING_PAGE: '/admin/dashboard/landing-page',
    GET_CONFIG: '/dashboard/config',
    UPDATE_CONFIG: '/admin/dashboard/config',
  },
  SETTINGS: {
    LIST: '/admin/settings',
    BY_KEY: (key: string) => `/admin/settings/${key}`,
    UPDATE: (key: string) => `/admin/settings/${key}`,
    BULK_UPDATE: '/admin/settings/bulk',
    RESET: '/admin/settings/reset',
    PUBLIC: (key: string) => `/admin/settings/public/${key}`,
  },
  ANNOUNCEMENTS: {
    ACTIVE: '/announcements/active',
    LIST: '/announcements',
    CREATE: '/announcements',
    UPDATE: (id: string) => `/announcements/${id}`,
    TOGGLE: (id: string) => `/announcements/${id}/toggle`,
    DELETE: (id: string) => `/announcements/${id}`,
  },
} as const;