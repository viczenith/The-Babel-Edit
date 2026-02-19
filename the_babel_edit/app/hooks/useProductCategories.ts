'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';

interface ProductType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  types?: ProductType[];
}

interface CategoryWithIcon extends ProductCategory {
  icon: string;
  value: string;
  label: string;
  types: ProductType[];
}

const CATEGORY_ICONS: { [key: string]: string } = {
  'clothes': '👕',
  'shoes': '👟',
  'bags': '👜',
  'accessories': '⌚',
  'watches': '⌚',
  'jewelry': '✨',
  'belts': '🎀',
  'hats': '🎩',
  'scarves': '🧣',
  'gloves': '🧤',
  'default': '📦'
};

// Helper function to validate category structure
const isValidCategory = (item: any): item is ProductCategory => {
  return item && typeof item === 'object' && 'id' in item && 'name' in item && 'slug' in item;
};

/**
 * Custom hook to fetch and manage product categories dynamically from the API
 * Replaces hardcoded category arrays with real-time database-driven categories
 * 
 * @param options.includeInactive - Include inactive categories (default: false)
 * @returns Object containing categories array, loading state, error, and refresh function
 */
export const useProductCategories = (options: { includeInactive?: boolean } = {}) => {
  const [categories, setCategories] = useState<CategoryWithIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<any>(API_ENDPOINTS.CATEGORIES.LIST);

      // Handle multiple response formats from API
      let rawCategories: ProductCategory[] = [];
      
      if (Array.isArray(response)) {
        // API returns array directly
        rawCategories = response;
      } else if (response?.categories && Array.isArray(response.categories)) {
        // API returns object with categories property
        rawCategories = response.categories;
      } else if (response?.productCategories && Array.isArray(response.productCategories)) {
        // Alternative response format
        rawCategories = response.productCategories;
      } else if (typeof response === 'object' && Object.keys(response).length > 0) {
        // Fallback: treat object as single item or as array
        rawCategories = Array.isArray(response) ? response : Object.values(response).filter(isValidCategory);
      }
      
      // Filter out inactive categories unless requested
      const filtered = options.includeInactive 
        ? rawCategories 
        : rawCategories.filter((cat: ProductCategory) => cat.isActive !== false);

      // Transform categories to include icon and display properties
      const withIcons = filtered.map((cat: ProductCategory) => {
        // Ensure types is always an array
        const types = Array.isArray(cat.types) ? cat.types : [];
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          isActive: cat.isActive,
          types: types,
          icon: CATEGORY_ICONS[cat.slug] || CATEGORY_ICONS['default'],
          value: cat.slug,
          label: cat.name
        };
      });

      setCategories(withIcons);
    } catch (err) {
      // Ignore abort errors (React Strict Mode double-mount cleanup)
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (err instanceof Error && err.message.includes('aborted')) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      console.error('Error fetching product categories:', err);
      // Return empty array on error but don't break the UI
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [options.includeInactive]);

  // Fetch categories on mount and when options change
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Listen for global updates (dispatched from admin after create/delete)
  useEffect(() => {
    const handler = () => fetchCategories();
    window.addEventListener('productCategories:updated', handler);
    return () => window.removeEventListener('productCategories:updated', handler);
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
    // Convenience getters
    categoriesAsOptions: categories.map(cat => ({ 
      value: cat.slug, 
      label: cat.name, 
      icon: cat.icon 
    })),
    getCategoryBySlug: (slug: string) => categories.find(cat => cat.slug === slug),
    getCategoryById: (id: string) => categories.find(cat => cat.id === id)
  };
};

export default useProductCategories;
