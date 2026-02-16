'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './products.module.css';
import NavbarWithSuspense from '@/app/components/features/Navbar/NavbarWithSuspense';
import Footer from '@/app/components/features/Footer/Footer';
import ProductCard from '@/app/components/features/ProductCard/ProductCard';
import ProductCardSkeleton from '@/app/components/features/ProductCard/ProductCardSkeleton';
import { useProductStore, Product, SortByType, FilterOptions } from '@/app/store';
import AnnouncementBar from '@/app/components/features/AnnouncementBar/AnnouncementBar';
import { useDebounce } from '@/app/hooks/useDebounce';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { usePagination, DOTS } from '@/app/hooks/usePagination';
import { useProductCategories } from '@/app/hooks/useProductCategories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";




const ProductsPage = () => {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  const {
    fetchProducts,
    searchProducts,
    products,
    searchResults,
    loading,
    searchLoading,
    error,
    page,
    pagination,
    setPage,
  } = useProductStore();

  const [sortBy, setSortBy] = useState<SortByType>('newest');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Load product categories dynamically from API
  const { categories: productCategories, loading: categoriesLoading } = useProductCategories();

  const router = useRouter();
  const pathname = usePathname();

  const [filterOptionsBackend, setFilterOptionsBackend] = useState<any>({});
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  // Derive selected filter values for dependencies (stable primitives, not object refs)
  const selectedType = activeFilters.type?.[0] || '';
  const selectedColor = activeFilters.color?.[0] || '';
  const selectedSize = activeFilters.size?.[0] || '';

  // Fetch products when category, search, or TYPE changes
  // TYPE is passed to backend for server-side filtering (faster than client-side for large sets)
  useEffect(() => {
    const baseFilters: FilterOptions = {};
    if (category) {
      baseFilters.category = category;
    }
    // Pass selected type to backend for server-side filtering
    if (selectedType) {
      baseFilters.type = [selectedType];
    }

    if (search) {
      searchProducts(search, baseFilters);
    } else {
      fetchProducts({ filters: baseFilters, limit: 100 });
    }
  }, [search, category, selectedType, fetchProducts, searchProducts]);

  // If the URL contains a category that doesn't exist in backend (deleted/hidden), remove it from the URL
  useEffect(() => {
    if (categoriesLoading) return; // wait until categories loaded
    if (!category) return;

    const exists = productCategories.some(cat => cat.slug === category);
    if (!exists) {
      // Remove category param from URL to avoid calling backend with invalid category
      try {
        const current = new URL(window.location.href);
        current.searchParams.delete('category');
        const newUrl = `${pathname}${current.search ? '?' + current.searchParams.toString() : ''}`;
        router.replace(newUrl);
      } catch (err) {
        // Fallback: replace to pathname without query
        router.replace(pathname);
      }
    }
  }, [categoriesLoading, productCategories, category, router, pathname]);

  // Fetch filter options (sizes, colors, types) for the selected category from backend
  // Cascading: TYPE → COLOR → SIZE
  // When type changes, available colors/sizes update. When color changes, available sizes update.
  useEffect(() => {
    let mounted = true;
    const loadFilters = async () => {
      if (!category) {
        setFilterOptionsBackend({});
        return;
      }

      setFilterOptionsLoading(true);
      try {
        // Build query parameters with active filters for cascading behavior
        const params = new URLSearchParams({ category });
        
        // Cascade: pass selected type to narrow down colors/sizes
        if (selectedType) {
          params.append('type', selectedType);
        }
        // Cascade: pass selected color to narrow down sizes
        if (selectedColor) {
          params.append('color', selectedColor);
        }

        const data = await apiRequest<any>(`${API_ENDPOINTS.PRODUCTS.FILTER_OPTIONS}?${params.toString()}`);
        if (!mounted) return;

        // Backend returns { priceRange, filterGroups }
        if (data && data.filterGroups) {
          setFilterOptionsBackend(data);
          // Set initial price range only once (don't update on re-filters)
          if (data.priceRange) {
            setPriceRange(prev => prev || { min: data.priceRange.min, max: data.priceRange.max });
          }
        }
      } catch (err) {
        console.error('Failed to load filter options', err);
        setFilterOptionsBackend({});
      } finally {
        if (mounted) setFilterOptionsLoading(false);
      }
    };

    loadFilters();
    return () => { mounted = false; };
  }, [category, selectedType, selectedColor]);

  // CLIENT-SIDE FILTERING — only COLOR, SIZE, and PRICE (TYPE is handled by backend)
  const filteredProducts = useMemo(() => {
    let sourceProducts = search ? searchResults : products;
    const hasColorFilter = (activeFilters.color?.length ?? 0) > 0;
    const hasSizeFilter = (activeFilters.size?.length ?? 0) > 0;
    const hasPriceFilter = priceRange && (priceRange.min > 0 || priceRange.max > 0);

    // If no client-side filters active, return all products
    if (!hasColorFilter && !hasSizeFilter && !hasPriceFilter) {
      return sourceProducts;
    }

    return sourceProducts.filter(product => {
      // COLOR filter — check product.colors array
      if (hasColorFilter) {
        const colorValues = activeFilters.color!;
        const matchesColor = colorValues.some(filterColor => {
          const term = filterColor.toLowerCase();
          return product.colors?.some(c => c.toLowerCase().includes(term));
        });
        if (!matchesColor) return false;
      }

      // SIZE filter — check product.sizes array
      if (hasSizeFilter) {
        const sizeValues = activeFilters.size!;
        const matchesSize = sizeValues.some(filterSize => {
          const term = filterSize.toLowerCase();
          return product.sizes?.some(s => s.toLowerCase() === term || s.toLowerCase().includes(term));
        });
        if (!matchesSize) return false;
      }

      // PRICE filter
      if (hasPriceFilter && priceRange) {
        if (priceRange.min > 0 && product.price < priceRange.min) return false;
        if (priceRange.max > 0 && product.price > priceRange.max) return false;
      }

      return true;
    });
  }, [products, searchResults, search, activeFilters, priceRange]);

  // Apply sorting to filtered products
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'rating':
          return (b.avgRating || 0) - (a.avgRating || 0);
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
    
    return sorted;
  }, [filteredProducts, sortBy]);

  // Paginate the sorted products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  }, [sortedProducts]);

  const paginationRange = usePagination({
    currentPage,
    totalCount: sortedProducts.length,
    siblingCount: 1,
    pageSize: ITEMS_PER_PAGE
  });


  // Display products = paginated products
  const displayProducts = paginatedProducts;

  const handleFilterChange = useCallback((filterKey: string, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      const currentValues = newFilters[filterKey] || [];
      
      if (currentValues.includes(value)) {
        // Deselecting a value
        const updatedValues = currentValues.filter(v => v !== value);
        if (updatedValues.length === 0) {
          delete newFilters[filterKey];
        } else {
          newFilters[filterKey] = updatedValues;
        }

        // Cascade: if TYPE deselected and now empty, clear downstream COLOR + SIZE
        if (filterKey === 'type' && (updatedValues.length === 0)) {
          delete newFilters['color'];
          delete newFilters['size'];
        }
        // Cascade: if COLOR deselected and now empty, clear downstream SIZE
        if (filterKey === 'color' && (updatedValues.length === 0)) {
          delete newFilters['size'];
        }
      } else {
        // Selecting a new value — single-select for cascading filters (TYPE, COLOR)
        if (filterKey === 'type') {
          // TYPE is single-select: replace previous, clear downstream COLOR + SIZE
          newFilters[filterKey] = [value];
          delete newFilters['color'];
          delete newFilters['size'];
        } else if (filterKey === 'color') {
          // COLOR is single-select: replace previous, clear downstream SIZE
          newFilters[filterKey] = [value];
          delete newFilters['size'];
        } else {
          // SIZE and others: multi-select
          newFilters[filterKey] = [...currentValues, value];
        }
      }
      
      return newFilters;
    });
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setPriceRange(null);
    setCurrentPage(1);
  }, []);

  const toggleFilterSection = useCallback((sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  }, []);

  const removeFilter = useCallback((filterKey: string, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      const currentValues = newFilters[filterKey] || [];
      const updatedValues = currentValues.filter(v => v !== value);
      
      if (updatedValues.length === 0) {
        delete newFilters[filterKey];
      } else {
        newFilters[filterKey] = updatedValues;
      }

      // Cascade: removing TYPE clears COLOR + SIZE
      if (filterKey === 'type' && updatedValues.length === 0) {
        delete newFilters['color'];
        delete newFilters['size'];
      }
      // Cascade: removing COLOR clears SIZE
      if (filterKey === 'color' && updatedValues.length === 0) {
        delete newFilters['size'];
      }

      return newFilters;
    });
  }, []);

  useEffect(() => {
    // Initialize expanded sections from backend filter options when available
    if (filterOptionsBackend?.filterGroups && filterOptionsBackend.filterGroups.length > 0) {
      const initialExpanded: {[key: string]: boolean} = {};
      filterOptionsBackend.filterGroups.forEach((filterGroup: any) => {
        initialExpanded[filterGroup.title] = true;
      });
      setExpandedSections(initialExpanded);
    }
  }, [filterOptionsBackend]);

  const isLoading = search ? searchLoading : loading;

  const handleSortChange = useCallback((newSortBy: any) => {
    setSortBy(newSortBy);
    setCurrentPage(1); // Reset to page 1 when sorting changes
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const handleRetry = useCallback(() => {
    const baseFilters: FilterOptions = {};
    if (category) {
      baseFilters.category = category;
    }
    if (selectedType) {
      baseFilters.type = [selectedType];
    }
    
    if (search) {
      searchProducts(search, baseFilters);
    } else {
      fetchProducts({ filters: baseFilters, force: true, limit: 100 });
    }
  }, [search, category, selectedType, fetchProducts, searchProducts]);

  const getCategoryTitle = useCallback(() => {
    if (search) return `Search Results for "${search}"`;
    if (category && productCategories.length > 0) {
      // Find the category name from dynamically loaded categories
      const foundCategory = productCategories.find(cat => cat.slug === category);
      if (foundCategory) {
        return `${foundCategory.icon} ${foundCategory.name} - Page`;
      }
    }
    if (category) return category.charAt(0).toUpperCase() + category.slice(1);
    return 'All Products';
  }, [search, category, productCategories]);

  const activeFilterCount = useMemo(() => {
    let count = Object.values(activeFilters).reduce((total, values) => total + values.length, 0);
    if (priceRange?.min || priceRange?.max) count++;
    return count;
  }, [activeFilters, priceRange]);
  
  const currentCategoryFilters = useMemo(() => {
    // Return filter groups from backend, ordered: Type → Color → Size → Price
    if (filterOptionsBackend?.filterGroups) {
      const groups = filterOptionsBackend.filterGroups;
      // Ensure order: type first, then color, then size, then price (at bottom)
      const order = ['type', 'color', 'size', 'price'];
      return [...groups].sort((a: any, b: any) => {
        const aIdx = order.indexOf(a.key);
        const bIdx = order.indexOf(b.key);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });
    }
    return [];
  }, [filterOptionsBackend]);

  // Determine which filter sections should be shown based on cascade state
  const shouldShowColorFilter = selectedType !== '';
  const shouldShowSizeFilter = selectedType !== '';

  const filterContent = (
    <>
      {activeFilterCount > 0 && (
        <div className={styles.filtersHeader}>
          <button 
            className={styles.clearAllButton}
            onClick={clearAllFilters}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Filter loading indicator */}
      {filterOptionsLoading && (
        <div style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
          Updating filters...
        </div>
      )}
      
      {currentCategoryFilters.map((filterGroup: any, groupIndex: number) => {
        // Handle price range filter separately — always at the bottom
        if (filterGroup.key === 'price' && filterGroup.type === 'range') {
          const minPrice = priceRange?.min ?? filterGroup.min ?? 0;
          const maxPrice = priceRange?.max ?? filterGroup.max ?? 1000;
          
          return (
            <div key={groupIndex} className={styles.filterSection}>
              <div 
                className={`${styles.filterTitle} ${expandedSections[filterGroup.title] ? styles.expanded : ''}`}
                onClick={() => toggleFilterSection(filterGroup.title)}
              >
                {filterGroup.title}
                {(priceRange?.min !== null || priceRange?.max !== null) && (
                  <span className={styles.filterCount}>
                    (${minPrice} - ${maxPrice})
                  </span>
                )}
              </div>
              <div className={`${styles.filterOptions} ${expandedSections[filterGroup.title] ? styles.expanded : ''}`}>
                <div className={styles.priceRangeContainer}>
                  <div className={styles.priceInputs}>
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setPriceRange({ 
                        min: parseInt(e.target.value) || filterGroup.min, 
                        max: maxPrice
                      })}
                      className={styles.priceInput}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setPriceRange({ 
                        min: minPrice,
                        max: parseInt(e.target.value) || filterGroup.max 
                      })}
                      className={styles.priceInput}
                    />
                  </div>
                  <input
                    type="range"
                    min={filterGroup.min || 0}
                    max={filterGroup.max || 1000}
                    value={minPrice}
                    onChange={(e) => setPriceRange({ 
                      min: parseInt(e.target.value), 
                      max: maxPrice
                    })}
                    className={styles.priceSlider}
                  />
                </div>
              </div>
            </div>
          );
        }

        // Cascade visibility:
        // - TYPE: always visible when available
        // - COLOR: only visible when a TYPE is selected
        // - SIZE: only visible when a TYPE is selected
        if (filterGroup.key === 'color' && !shouldShowColorFilter) {
          return null;
        }
        if (filterGroup.key === 'size' && !shouldShowSizeFilter) {
          return null;
        }

        // Handle regular filters (Type, Color, Size)
        const currentValues = activeFilters[filterGroup.key] || [];
        const isExpanded = expandedSections[filterGroup.title] ?? true;
        const isSingleSelect = filterGroup.key === 'type' || filterGroup.key === 'color';
        
        return (
          <div key={groupIndex} className={styles.filterSection}>
            <div 
              className={`${styles.filterTitle} ${isExpanded ? styles.expanded : ''}`}
              onClick={() => toggleFilterSection(filterGroup.title)}
            >
              {filterGroup.title}
              {currentValues.length > 0 && (
                <span className={styles.filterCount}>
                  {isSingleSelect ? `(${currentValues[0]})` : `(${currentValues.length})`}
                </span>
              )}
              {filterGroup.key !== 'type' && filterOptionsLoading && (
                <span style={{ marginLeft: '4px', fontSize: '11px', color: '#9ca3af' }}>↻</span>
              )}
            </div>
            <div className={`${styles.filterOptions} ${isExpanded ? styles.expanded : ''}`}>
              {filterGroup.options && filterGroup.options.map((option: any, optionIndex: number) => {
                const isChecked = currentValues.includes(option.value);
                const isDisabled = !option.available;
                return (
                  <div key={optionIndex} className={styles.filterOption}>
                    <input
                      type={isSingleSelect ? 'radio' : 'checkbox'}
                      id={`${filterGroup.key}-${option.value}`}
                      name={isSingleSelect ? filterGroup.key : undefined}
                      checked={isChecked}
                      onChange={() => handleFilterChange(filterGroup.key, option.value)}
                      disabled={isDisabled}
                    />
                    <label 
                      htmlFor={`${filterGroup.key}-${option.value}`}
                      className={`${isChecked ? styles.checkedLabel : ''} ${isDisabled ? styles.disabledLabel : ''}`}
                      title={isDisabled ? 'Not available in current selection' : ''}
                    >
                      {option.label}
                      {option.count !== undefined && (
                        <span className={styles.optionCount}>({option.count})</span>
                      )}
                    </label>
                  </div>
                );
              })}
              {filterGroup.key === 'type' && currentValues.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#3b82f6', cursor: 'pointer' }}
                  onClick={() => {
                    setActiveFilters(prev => {
                      const newFilters = { ...prev };
                      delete newFilters['type'];
                      delete newFilters['color'];
                      delete newFilters['size'];
                      return newFilters;
                    });
                    setCurrentPage(1);
                  }}
                >
                  ✕ Clear type filter
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div className={styles.pageBg}>
      <NavbarWithSuspense />
      
      <div className={styles.catalogHeader}>
        <div className={styles.catalogTitleBox}>
          <div className={styles.catalogTitle}>{getCategoryTitle()}</div>
          <AnnouncementBar variant="inline" className={styles.catalogSubtitle} />
        </div>
      </div>

      <main className={styles.catalogMain}>
        
        <div className={styles.sortContainer}>
          <div className={styles.sortAndFilter}>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortByType)}
              className={styles.sortSelect}
              disabled={loading}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="rating">Highest Rated</option>
            </select>
            
            <div className={styles.filterSummary}>
              <button 
                className={`${styles.clearFiltersButton} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleRetry}
                disabled={loading}
                title="Refresh products from database"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <div className="md:hidden">
                <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <DialogTrigger asChild>
                    <button className={styles.clearFiltersButton}>
                      Filter
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Filters</DialogTitle>
                    </DialogHeader>
                    {filterContent}
                  </DialogContent>
                </Dialog>
              </div>
              {activeFilterCount > 0 && (
                <button 
                  className={styles.clearFiltersButton}
                  onClick={clearAllFilters}
                >
                  Clear all filters ({activeFilterCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className={styles.activeFiltersContainer}>
            <div className={styles.activeFiltersTitle}>Active Filters:</div>
            <div className={styles.activeFiltersTags}>
              {Object.entries(activeFilters).map(([filterKey, values]: [string, string[]]) => {
                  const filterGroup = currentCategoryFilters.find((g: any) => g.key === filterKey);
                  const filterTitle = filterGroup ? filterGroup.title : filterKey;

                  return values.map((value: string, index: number) => {
                    const option = filterGroup?.options.find((o: any) => o.value === value);
                    const optionLabel = option ? option.label : value;

                    return (
                      <div key={`${filterKey}-${value}-${index}`} className={styles.filterTag}>
                        <span>{filterTitle}: {optionLabel}</span>
                        <button 
                          className={styles.removeFilterButton}
                          onClick={() => removeFilter(filterKey, value)}
                          aria-label={`Remove ${filterTitle}: ${optionLabel} filter`}
                        >
                          ×
                        </button>
                      </div>
                    )
                  });
              })}
            </div>
          </div>
        )}

        <div className={styles.catalogContent}>
          <div className={`${styles.filtersContainer} hidden md:block`}>
            {filterContent}
          </div>

          <div className={styles.productsGrid}>
            {isLoading ? (
              Array.from({ length: 12 }).map((_, index) => (
                <ProductCardSkeleton key={`skeleton-${index}`} />
              ))
            ) : error ? (
              <div className={styles.errorContainer}>
                <p>{error}</p>
                <button onClick={handleRetry}>Retry</button>
              </div>
            ) : displayProducts.length > 0 ? (
              displayProducts.map((product: Product) => (
                <ProductCard key={`${product.id}-${product.name}`} product={product} />
              ))
            ) : (
              <div className={styles.noResultsContainer}>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms</p>
                {activeFilterCount > 0 && (
                  <button className={styles.clearFiltersButton} onClick={clearAllFilters}>
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* PAGINATION */}
        {!isLoading && totalPages > 1 && (
          <div className={styles.paginationContainer}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.paginationButton}
              aria-label="Go to previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            
            {paginationRange?.map((pageNumber: any, index: number) => {
              if (pageNumber === DOTS) {
                return <span key={`dots-${index}`} className={styles.paginationDots}>...</span>;
              }

              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber as number)}
                  className={`${styles.paginationButton} ${currentPage === pageNumber ? styles.active : ''}`}
                >
                  {pageNumber}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
              aria-label="Go to next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductsPage;