import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Product, FilterOptions, Collection } from './types';
import { STORAGE_KEYS, setWithTimestamp, getWithTimestamp } from './storage';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';

interface ProductState {
  products: Product[];
  featuredProducts: Product[];
  searchResults: Product[];
  collections: Collection[];
  currentProduct: Product | null;
  loading: boolean;
  searchLoading: boolean;
  error: string | null;
  filters: FilterOptions;
  searchQuery: string;
  lastFetchTime: number | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  page: number;
  hasMore: boolean;
}

interface ProductActions {
  setProducts: (products: Product[]) => void;
  setFeaturedProducts: (products: Product[]) => void;
  setSearchResults: (products: Product[]) => void;
  setCurrentProduct: (product: Product | null) => void;
  setLoading: (loading: boolean) => void;
  setSearchLoading: (searchLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  
  // API Actions
  fetchProducts: (options?: { filters?: FilterOptions; force?: boolean; limit?: number, page?: number }) => Promise<void>;
  fetchFeaturedProducts: (limit?: number, force?: boolean) => Promise<void>;
  fetchProductById: (id: string, force?: boolean) => Promise<Product | null>;
  prefetchProductById: (id: string) => Promise<void>;
  searchProducts: (query: string, filters?: FilterOptions) => Promise<void>;
  
  // Cache management
  loadFromCache: () => void;
  invalidateProductCache: () => void;
  reset: () => void;
}

type ProductStore = ProductState & ProductActions;

const CACHE_EXPIRATION_HOURS = 1;
const DEBOUNCE_DELAY = 300; // milliseconds

const initialState: ProductState = {
  products: [],
  featuredProducts: [],
  searchResults: [],
  collections: [],
  currentProduct: null,
  loading: false,
  searchLoading: false,
  error: null,
  filters: {},
  searchQuery: '',
  lastFetchTime: null,
  pagination: null,
  page: 1,
  hasMore: false,
};

// Debounce helper
let searchTimeoutId: NodeJS.Timeout | null = null;

// Cache keys
const CACHE_KEYS = {
  PRODUCTS: STORAGE_KEYS.PRODUCTS,
  FEATURED: `${STORAGE_KEYS.PRODUCTS}_featured`,
  FILTERS: `${STORAGE_KEYS.PRODUCTS}_filters`,
} as const;

// Error handling utility
const handleError = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('aborted')) {
      return 'Server is starting up — this may take up to 30 seconds on first visit. Please wait and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Server is waking up. Please refresh the page in a few seconds.';
    }
    return error.message;
  }
  return defaultMessage;
};

// Query parameter builder - FIXED VERSION
const buildQueryParams = (filters: FilterOptions = {}, page: number, limit?: number): URLSearchParams => {
  const queryParams = new URLSearchParams();
  
  // Add filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Keep 'category' as 'category' for backend - this filters by ProductCategory (shoes, clothes, etc)
      const paramKey = key;
      
      if (key === 'sortBy') {
        switch (value) {
          case 'price_asc':
            queryParams.append('sortBy', 'price');
            queryParams.append('sortOrder', 'asc');
            break;
          case 'price_desc':
            queryParams.append('sortBy', 'price');
            queryParams.append('sortOrder', 'desc');
            break;
          case 'name_asc':
            queryParams.append('sortBy', 'name');
            queryParams.append('sortOrder', 'asc');
            break;
          case 'name_desc':
            queryParams.append('sortBy', 'name');
            queryParams.append('sortOrder', 'desc');
            break;
          case 'newest':
          default:
            queryParams.append('sortBy', 'createdAt');
            queryParams.append('sortOrder', 'desc');
        }
      } else if (Array.isArray(value)) {
        // Handle arrays: append each item separately
        value.forEach(item => {
          queryParams.append(paramKey, item);
        });
      } else if (typeof value === 'string' && value.includes(',')) {
        // Handle comma-separated strings: split and append
        // This is the KEY FIX - your backend expects comma-separated values as a single param
        queryParams.append(paramKey, value);
      } else {
        // Handle single values
        queryParams.append(paramKey, String(value));
      }
    }
  });

  queryParams.append('page', String(page));
  if (limit) {
    queryParams.append('limit', String(limit));
  }
  
  return queryParams;
};

// Cache utilities
const getCachedData = <T>(key: string, expirationHours = CACHE_EXPIRATION_HOURS): T | null => {
  return getWithTimestamp<T>(key, expirationHours);
};

const setCachedData = <T>(key: string, data: T): void => {
  setWithTimestamp(key, { ...data, lastFetchTime: Date.now() });
};

export const useProductStore = create<ProductStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setProducts: (products) => set({ products }),
    setFeaturedProducts: (featuredProducts) => {
      set({ featuredProducts });
      setCachedData(CACHE_KEYS.FEATURED, { featuredProducts });
    },
    setSearchResults: (searchResults) => set({ searchResults }),
    setCurrentProduct: (currentProduct) => set({ currentProduct }),
    setLoading: (loading) => set({ loading }),
    setSearchLoading: (searchLoading) => set({ searchLoading }),
    setError: (error) => set({ error }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setPage: (page) => set({ page }),
    
    fetchProducts: async (options = {}) => {
      const { force = false, filters: newFilters, limit = 12, page: newPage } = options;
      const { loading, filters: currentFilters, page: currentPage } = get();

      const pageToFetch = newPage || currentPage;
      const filtersToUse = newFilters || currentFilters;

      set({ loading: true, error: null });

      try {
        const queryParams = buildQueryParams(filtersToUse, pageToFetch, limit);
        const endpoint = `${API_ENDPOINTS.PRODUCTS.LIST}?${queryParams.toString()}`;
        
        const data = await apiRequest<{
          products: Product[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        }>(endpoint);
        
        if (!data.products) throw new Error('Invalid response format');
        
        set({
          products: data.products,
          pagination: data.pagination,
          page: data.pagination.page,
          hasMore: data.pagination.page < data.pagination.pages,
          filters: filtersToUse,
          lastFetchTime: Date.now(),
        });
        
      } catch (error) {
        console.error('Error fetching products:', error);
        const errorMessage = handleError(error, 'Failed to fetch products');
        set({ error: errorMessage, hasMore: false });
      } finally {
        set({ loading: false });
      }
    },

    fetchFeaturedProducts: async (limit = 10, force = false) => {
      const { setFeaturedProducts, setLoading, setError } = get();
      
      if (!force) {
        const cachedData = getCachedData<{ featuredProducts: Product[] }>(CACHE_KEYS.FEATURED);
        if (cachedData?.featuredProducts?.length) {
          setFeaturedProducts(cachedData.featuredProducts);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({ limit: limit.toString(), sortOrder: 'desc' });
        const endpoint = `${API_ENDPOINTS.PRODUCTS.FEATURED}?${queryParams.toString()}`;
        const responseData = await apiRequest<{ products: Product[] }>(endpoint);
        
        if (!responseData.products) throw new Error('Invalid response format');
        
        setFeaturedProducts(responseData.products);
        
      } catch (error) {
        console.error('Error fetching featured products:', error);
        const errorMessage = handleError(error, 'Failed to fetch featured products');
        setError(errorMessage);
        const cachedData = getCachedData<{ featuredProducts: Product[] }>(CACHE_KEYS.FEATURED);
        if (cachedData?.featuredProducts?.length) {
          setFeaturedProducts(cachedData.featuredProducts);
        }
      } finally {
        setLoading(false);
      }
    },

    fetchProductById: async (id: string, force = false) => {
      const { setCurrentProduct, setLoading, setError, products } = get();
      
      if (!id) {
        setError('Product ID is required');
        return null;
      }
      
      const existingProduct = products.find(p => p.id === id);
      if (existingProduct && !force) {
        setCurrentProduct(existingProduct);
        return existingProduct;
      }

      const cachedData = getCachedData<{ product: Product }>(`${CACHE_KEYS.PRODUCTS}_${id}`);
      if (cachedData?.product && !force) {
        setCurrentProduct(cachedData.product);
        return cachedData.product;
      }

      setLoading(true);
      setError(null);

      try {
        const endpoint = API_ENDPOINTS.PRODUCTS.BY_ID(id);
        const product = await apiRequest<Product>(endpoint);
        
        if (!product) throw new Error('Product not found');
        
        setCurrentProduct(product);
        setCachedData(`${CACHE_KEYS.PRODUCTS}_${id}`, { product });
        return product;
        
      } catch (error) {
        console.error('Error fetching product:', error);
        const errorMessage = handleError(error, 'Failed to fetch product');
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },

    prefetchProductById: async (id: string) => {
      const { products } = get();
      
      if (!id) return;
      
      const existingProduct = products.find(p => p.id === id);
      if (existingProduct) return;

      try {
        const endpoint = API_ENDPOINTS.PRODUCTS.BY_ID(id);
        const product = await apiRequest<Product>(endpoint);
        
        if (product) {
          setCachedData(`${CACHE_KEYS.PRODUCTS}_${id}`, { product });
        }
      } catch (error) {
        console.error('Error prefetching product:', error);
      }
    },
 
    searchProducts: async (query: string, filters = {}) => {
      const { setSearchResults, setSearchLoading, setError, setSearchQuery } = get();
      
      const trimmedQuery = query.trim();
      
      if (!trimmedQuery) {
        setSearchResults([]);
        setSearchQuery('');
        return;
      }

      setSearchQuery(trimmedQuery);
      
      if (searchTimeoutId) clearTimeout(searchTimeoutId);

      searchTimeoutId = setTimeout(async () => {
        setSearchLoading(true);
        setError(null);

        try {
          const queryParams = buildQueryParams({ ...filters, search: trimmedQuery }, 1);
          const endpoint = `${API_ENDPOINTS.PRODUCTS.LIST}?${queryParams.toString()}`;
          const data = await apiRequest<{ products: Product[] }>(endpoint);
          
          setSearchResults(data.products || []);
          
        } catch (error) {
          console.error('Error searching products:', error);
          const errorMessage = handleError(error, 'Search failed');
          setError(errorMessage);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, DEBOUNCE_DELAY);
    },

    loadFromCache: () => {
      const { setProducts } = get();
      
      const cachedProducts = getCachedData<{ products: Product[] }>(CACHE_KEYS.PRODUCTS);
      if (cachedProducts?.products?.length) setProducts(cachedProducts.products);
      
    },

    invalidateProductCache: () => {
      // Clear product cache to force fresh fetch on next request
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(CACHE_KEYS.PRODUCTS);
        localStorage.removeItem(CACHE_KEYS.FEATURED);
        localStorage.removeItem(CACHE_KEYS.FILTERS);
      }
      set({ products: [], featuredProducts: [], lastFetchTime: null });
    },

    reset: () => {
      set(initialState);
    },
  }))
);