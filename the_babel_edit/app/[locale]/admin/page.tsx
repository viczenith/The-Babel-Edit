'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, useParams } from 'next/navigation';
import { Product } from '@/app/store/types';
import { useAuth } from '@/app/context/AuthContext';
import { formatRole } from '@/app/utils/roleUtils';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import { Package, Plus, AlertCircle, Search, X, ImageIcon, Star, CheckCircle, XCircle, ArrowDownUp, RefreshCw, Download, AlertTriangle, BarChart3, Minus, DollarSign, ShoppingCart, TrendingUp, Users, MessageSquare, Eye, ArrowRight, Clock, Activity } from 'lucide-react';

import AdminProtectedRoute from '@/app/components/AdminProtectedRoute';
import Button from '@/app/components/ui/Button/Button';
import DataTable, { Column, Action } from '@/app/components/ui/DataTable/DataTable';
import ConfirmModal from '@/app/components/ui/ConfirmModal/ConfirmModal';
import AdminSectionNav from './components/AdminSectionNav';
import DashboardManager from './components/DashboardManager';
import FeedbacksManager from './components/FeedbacksManager';
import ReviewsManager from './components/ReviewsManager';
import ProductForm from './components/ProductForm';
import dynamic from 'next/dynamic';
import { useProductCategories } from '@/app/hooks/useProductCategories';
import { useDebounce } from '@/app/hooks/useDebounce';
import { formatCurrency } from '@/lib/utils';

const ProductTypesPage = dynamic(() => import('./product-types/page'), { ssr: false });
 

interface Review {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
    };
    product: {
        id: string;
        name: string;
    };
}

interface Feedback {
  id: string;
  type: string;
  message: string;
  pageUrl: string;
  isResolved: boolean;
  isFeatured: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus?: string;
  itemCount?: number;
  createdAt: string;
  cancelledAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  user: { id: string; firstName?: string; lastName?: string; email?: string } | null;
  items?: any[];
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  } | null;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  paymentMethod?: string;
  updatedAt?: string;
}

// Full admin order detail (from single-order admin endpoint)
interface AdminOrderDetail extends Order {
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  } | null;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  paymentMethod: string;
  updatedAt: string;
  items: {
    id: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
    product: {
      id?: string;
      name: string;
      imageUrl?: string;
      description?: string;
    };
  }[];
}

interface InventoryItem {
  id: string;
  sku?: string;
  name: string;
  stock: number;
  threshold?: number;
  imageUrl?: string;
  category?: string;
  price?: number;
  isActive?: boolean;
}

interface ErrorState {
  type: 'products' | 'action';
  message: string;
}

interface DeleteConfirmState {
  isOpen: boolean;
  type: 'product';
  id: string;
  name: string;
  hard: boolean;
}

const AdminPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<string[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [orderDateRange, setOrderDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [orderCustomerSearch, setOrderCustomerSearch] = useState<string>('');
  // Advanced order management state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [orderSort, setOrderSort] = useState<{ field: 'date' | 'amount' | 'status' | 'customer'; dir: 'asc' | 'desc' }>({ field: 'date', dir: 'desc' });
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>({});
  const [statusConfirm, setStatusConfirm] = useState<{ orderId: string; newStatus: string } | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const ORDERS_PER_PAGE = 10;
  const [orderPagination, setOrderPagination] = useState<{ total: number; pages: number }>({ total: 0, pages: 1 });
  const [activeTab, setActiveTab] = useState<'overview' | 'dashboard' | 'products' | 'orders' | 'inventory' | 'reviews' | 'feedback' | 'product-types'>('overview');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [searchFocused, setSearchFocused] = useState(false);
  const [allCategoryProducts, setAllCategoryProducts] = useState<Product[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [error, setError] = useState<ErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    type: 'product',
    id: '',
    name: '',
    hard: false
  });

  // Analytics state — pre-computed from backend + featured IDs
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [rawFeaturedIds, setRawFeaturedIds] = useState<string[]>([]);
  const [overviewPeriod, setOverviewPeriod] = useState<'today' | 'week' | 'month'>('month');

  const MAX_RETRIES = 3;
  const { user, loading: authLoading, logout } = useAuth();
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const isAdmin = user?.role && ['admin', 'super_admin'].includes(user.role.toLowerCase());
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get('category') || '';
  const [adminCategory, setAdminCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editProductLoading, setEditProductLoading] = useState<string | null>(null);
  const [deleteNameConfirm, setDeleteNameConfirm] = useState('');

  // Inventory inline editing state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>('');
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [editingThresholdValue, setEditingThresholdValue] = useState<string>('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  // Advanced inventory filters
  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('all');
  const [invStockMin, setInvStockMin] = useState<string>('');
  const [invStockMax, setInvStockMax] = useState<string>('');
  const [invThresholdFilter, setInvThresholdFilter] = useState<'all' | 'set' | 'unset'>('all');
  const [invActiveFilter, setInvActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [invSortBy, setInvSortBy] = useState<'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc' | 'sku-asc' | 'sku-desc'>('name-asc');
  const [invFiltersOpen, setInvFiltersOpen] = useState(false);

  // Admin order detail modal state
  const [adminOrderDetail, setAdminOrderDetail] = useState<AdminOrderDetail | null>(null);
  const [adminOrderModalOpen, setAdminOrderModalOpen] = useState(false);
  const [adminOrderLoading, setAdminOrderLoading] = useState(false);
  const [adminOrderError, setAdminOrderError] = useState<string | null>(null);

  const openAdminOrderDetail = async (orderId: string) => {
    setAdminOrderModalOpen(true);
    setAdminOrderLoading(true);
    setAdminOrderError(null);
    setAdminOrderDetail(null);
    try {
      const data = await apiRequest(API_ENDPOINTS.ORDERS.ADMIN.BY_ID(orderId), { requireAuth: true });
      setAdminOrderDetail(data);
    } catch (err: any) {
      console.error('Fetch admin order detail error:', err);
      setAdminOrderError(err.message || 'Failed to load order details.');
    } finally {
      setAdminOrderLoading(false);
    }
  };

  const closeAdminOrderDetail = () => {
    setAdminOrderModalOpen(false);
    setAdminOrderDetail(null);
    setAdminOrderError(null);
  };

  // Fetch categories dynamically from API instead of hardcoded array
  const { categories: PRODUCT_CATEGORIES, loading: categoriesLoading, refresh: refreshCategories } = useProductCategories();
  useEffect(() => {
    // Wait for authentication to resolve and ensure user is an admin
    if (authLoading || !isAdmin) return;
    // If a category query param is present, switch to products tab and set active admin category
    if (categoryParam) {
      setActiveTab('products');
      setAdminCategory(categoryParam);
    }

    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'overview') {
      fetchAnalytics();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [pagination.page, debouncedSearchTerm, activeTab, adminCategory, isAdmin, authLoading, orderStatusFilter, orderCustomerSearch, orderDateRange, orderPage, overviewPeriod]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!categoryParam) return;
    if (categoriesLoading) return; // wait until categories are loaded

    const exists = Array.isArray(PRODUCT_CATEGORIES) && PRODUCT_CATEGORIES.some((c: any) => c.slug === categoryParam || c.value === categoryParam);
    if (exists) return; // valid category - keep it

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('category');
      const newPath = url.pathname + url.search;
      router.replace(newPath);
    } catch (e) {
      // Fallback
      setAdminCategory(null);
    }
  }, [categoriesLoading, PRODUCT_CATEGORIES, categoryParam, router]);

  // Reset pagination and search when admin category changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setSearchTerm('');
    setAllCategoryProducts([]);
  }, [adminCategory]);

  useEffect(() => {
    const getEl = () => document.getElementById('admin-header');
    const update = () => {
      const el = getEl();
      setHeaderHeight(el ? Math.ceil(el.getBoundingClientRect().height) : 0);
    };

    update();

    // Prefer ResizeObserver when available to catch dynamic header size changes
    let ro: ResizeObserver | undefined;
    const el = getEl();
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    }

    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, []);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      // Build query params for server-side filtering
      const params = new URLSearchParams();
      params.set('page', String(orderPage));
      params.set('limit', String(ORDERS_PER_PAGE));
      if (orderStatusFilter) params.set('status', orderStatusFilter);
      if (orderCustomerSearch) params.set('search', orderCustomerSearch);

      const res = await apiRequest<{ orders: Order[]; pagination: any }>(
        API_ENDPOINTS.ORDERS.ADMIN.LIST + '?' + params.toString(),
        { requireAuth: true }
      );
      let filteredOrders = res.orders || [];

      // Apply date range filter (client-side since backend doesn't have date range params yet)
      if (orderDateRange.start || orderDateRange.end) {
        filteredOrders = filteredOrders.filter(o => {
          const orderDate = new Date(o.createdAt);
          const start = orderDateRange.start ? new Date(orderDateRange.start) : null;
          const end = orderDateRange.end ? new Date(orderDateRange.end) : null;
          
          if (start && orderDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (orderDate > endOfDay) return false;
          }
          return true;
        });
      }

      setOrders(filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      // Use server pagination info
      if (res.pagination) {
        setOrderPage(res.pagination.page);
        setOrderPagination({ total: res.pagination.total, pages: res.pagination.pages });
      }
    } catch (err) {
      console.error('Failed to load orders', err);
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      // Reuse admin products endpoint to derive inventory
      const res = await apiRequest<{ products: Product[] }>(API_ENDPOINTS.PRODUCTS.ADMIN.LIST + '?limit=999999&includeInactive=true', { requireAuth: true });
      const items: InventoryItem[] = (res.products || []).map(p => {
        const cat = (p as any).category;
        const catName = typeof cat === 'object' && cat !== null ? cat.name : (cat || '');
        return {
          id: p.id,
          sku: (p as any).sku,
          name: p.name,
          stock: p.stock || 0,
          threshold: (p as any).threshold,
          imageUrl: p.imageUrl || (p as any).images?.[0],
          category: catName,
          price: p.price,
          isActive: (p as any).isActive !== false,
        };
      });
      setInventory(items);
    } catch (err) {
      console.error('Failed to load inventory', err);
      toast.error('Failed to load inventory');
    } finally {
      setInventoryLoading(false);
    }
  };

  const exportCSV = (rows: any[], filename = 'export.csv') => {
    const csv = rows.length
      ? [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v => `"${String(v ?? '')}"`).join(','))].join('\n')
      : '';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const bulkUpdateStock = async (items: { id: string; delta: number }[]) => {
    try {
      // No bulk endpoint exists; apply updates per product (send absolute stock value)
      await Promise.all(items.map(it => {
        const current = inventory.find(x => x.id === it.id);
        const newStock = Math.max(0, (current ? current.stock : 0) + it.delta);
        return apiRequest(API_ENDPOINTS.PRODUCTS.ADMIN.UPDATE(it.id), { method: 'PUT', body: { stock: newStock }, requireAuth: true });
      }));
      toast.success('Bulk stock update applied');
      fetchInventory();
      fetchProducts();
    } catch (err) {
      console.error('Bulk stock update failed', err);
      toast.error('Bulk stock update failed');
    }
  };

  const fetchProducts = async (retry = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeInactive: 'true',
      });

      // If we have an admin category, filter by it
      if (adminCategory) {
        params.append('category', adminCategory); // Filter by category directly
      }

      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }

      const response = await apiRequest<{ products: Product[]; pagination: any }>(
        `${API_ENDPOINTS.PRODUCTS.ADMIN.LIST}?${params.toString()}`,
        { requireAuth: true }
      );
      // Primary: use server response
      setProducts(response.products || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 1 });

      // Store all products for this category (without search filter) for suggestions
      if (!debouncedSearchTerm && adminCategory) {
        setAllCategoryProducts(response.products);
      }

      // Fallback: if filtering by category returned zero results (no search active), try a client-side match
      if (adminCategory && !debouncedSearchTerm && Array.isArray(response.products) && response.products.length === 0) {
        try {
          // Fetch a larger unfiltered product list and filter by categoryName or category slug
          const allRes = await apiRequest<{ products: Product[]; pagination: any }>(
            `${API_ENDPOINTS.PRODUCTS.ADMIN.LIST}?limit=200&includeInactive=true`,
            { requireAuth: true }
          );
          const fallback = (allRes.products || []).filter(p => {
            const catName = (p.categoryName || p.category || '').toString().toLowerCase();
            return catName === adminCategory.toString().toLowerCase();
          });

          if (fallback.length > 0) {
            setProducts(fallback);
            setAllCategoryProducts(fallback);
            setPagination({ page: 1, limit: fallback.length, total: fallback.length, pages: 1 });
          }
        } catch (err) {
          // ignore fallback errors, keep original empty state
          if (process.env.NODE_ENV !== 'production') console.error('Fallback products fetch failed', err);
        }
      }
      setRetryCount(0);
    } catch (error: any) {
      const isServerError = error.status === 503 || error.code === 'SERVER_UNAVAILABLE';
      const errorMessage = isServerError
        ? 'The server is currently unavailable.'
        : error.message || 'Failed to fetch products';

      console.error('Error fetching products:', error);
      setError({
        type: 'products',
        message: errorMessage
      });

      if (retry && retryCount < MAX_RETRIES && !isServerError) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchProducts(true), 1000 * Math.pow(2, retryCount));
      } else {
        if (isServerError) {
          toast.error('Server is not responding. Please try again later.', {
            duration: 5000
          });
        } else {
          toast.error(errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [analyticsRes, featuredRes] = await Promise.all([
        apiRequest<any>(`/admin/analytics?period=${overviewPeriod}`, { requireAuth: true }).catch(() => null),
        apiRequest<string[]>(API_ENDPOINTS.ADMIN.TESTIMONIALS.LIST, { requireAuth: true }).catch(() => []),
      ]);
      setAnalyticsData(analyticsRes);
      setRawFeaturedIds(Array.isArray(featuredRes) ? featuredRes : []);
    } catch (error) {
      // Ignore abort errors (React Strict Mode double-mount cleanup)
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (error instanceof Error && error.message.includes('aborted')) return;
      if (process.env.NODE_ENV !== 'production') console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Metrics from backend response
  const overviewMetrics = useMemo(() => {
    if (!analyticsData) return {
      periodOrders: 0, periodRevenue: 0, periodAOV: 0, periodCustomers: 0,
      breakdown: {} as Record<string, number>, pendingOrders: 0,
      periodFeedbackCount: 0, unresolvedFeedback: 0,
      periodReviewCount: 0, featuredReviewCount: rawFeaturedIds.length,
      totalProducts: 0, activeProducts: 0, lowStock: [] as any[],
      recentOrders: [] as any[], topProducts: [] as any[],
    };

    return {
      periodOrders: analyticsData.periodOrderCount || 0,
      periodRevenue: analyticsData.periodRevenue || 0,
      periodAOV: analyticsData.periodAOV || 0,
      periodCustomers: analyticsData.periodCustomers || 0,
      breakdown: (analyticsData.breakdown || {}) as Record<string, number>,
      pendingOrders: analyticsData.pendingOrders || 0,
      periodFeedbackCount: analyticsData.periodFeedbackCount || 0,
      unresolvedFeedback: analyticsData.unresolvedFeedback || 0,
      periodReviewCount: analyticsData.periodReviewCount || 0,
      featuredReviewCount: rawFeaturedIds.length,
      totalProducts: analyticsData.totalProducts || 0,
      activeProducts: analyticsData.activeProducts || 0,
      lowStock: (analyticsData.lowStock || []) as any[],
      recentOrders: (analyticsData.recentOrders || []) as any[],
      topProducts: (analyticsData.topProducts || []) as any[],
    };
  }, [analyticsData, rawFeaturedIds]);

  const periodLabel = overviewPeriod === 'today' ? "Today's" : overviewPeriod === 'week' ? "This Week's" : "This Month's";

  const handleDeleteProduct = async () => {
    const { id, name, hard } = deleteConfirm;
    if (hard) {
      handleHardDeleteProduct();
      return;
    }
    setActionLoading(prev => ({ ...prev, [`delete-product-${id}`]: true }));
    setError(null);

    try {
      await apiRequest(
        API_ENDPOINTS.PRODUCTS.ADMIN.DELETE(id),
        {
          method: 'DELETE',
          requireAuth: true
        }
      );

      toast.success(`Product "${name}" soft-deleted successfully`);
      await fetchProducts();
      closeDeleteModal();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete product';
      console.error('Error deleting product:', error);

      setError({
        type: 'action',
        message: `Failed to delete product "${name}": ${errorMessage}`
      });

      handleDeleteError(error, name);
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-product-${id}`]: false }));
    }
  };

  const handleHardDeleteProduct = async () => {
    const { id, name } = deleteConfirm;
    setActionLoading(prev => ({ ...prev, [`hard-delete-product-${id}`]: true }));
    setError(null);

    try {
      await apiRequest(
        `/admin/products/${id}/hard`,
        {
          method: 'DELETE',
          requireAuth: true
        }
      );

      toast.success(`Product "${name}" permanently deleted successfully`);
      await fetchProducts();
      closeDeleteModal();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to permanently delete product';
      console.error('Error permanently deleting product:', error);

      setError({
        type: 'action',
        message: `Failed to permanently delete product "${name}": ${errorMessage}`
      });

      handleDeleteError(error, name);
    } finally {
      setActionLoading(prev => ({ ...prev, [`hard-delete-product-${id}`]: false }));
    }
  };

  const handleDeleteError = (error: any, itemName: string) => {
    if (error.status === 403) {
      toast.error('You do not have permission to delete this product');
    } else if (error.status === 404) {
      toast.error('Product not found. It may have been deleted already.');
      fetchProducts();
    } else {
      toast.error(error.message || 'Delete failed');
    }
  };
  const showDeleteConfirm = (type: 'product', id: string, name: string, hard = false) => {
    setDeleteConfirm({ isOpen: true, type, id, name, hard });
  };

  const closeDeleteModal = () => {
    setDeleteConfirm({ isOpen: false, type: 'product', id: '', name: '', hard: false });
  };

  const getStockStatus = (stock: number) => {
    if (stock > 10) return { class: 'bg-green-100 text-green-800', text: `${stock} in stock` };
    if (stock > 0) return { class: 'bg-yellow-100 text-yellow-800', text: `${stock} in stock` };
    return { class: 'bg-red-100 text-red-800', text: 'Out of stock' };
  };
  

  const productColumns: Column<Product>[] = [
    {
      key: 'imageUrl',
      header: 'Image',
      width: '60px',
      cell: (product) => {
        const src = product.imageUrl;
        return src ? (
          <img src={src} alt={product.name} className="w-10 h-10 rounded object-cover border border-gray-200" />
        ) : (
          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </div>
        );
      }
    },
    {
      key: 'name',
      header: 'Product',
      cell: (product) => (
        <div>
          <div className="font-medium text-gray-900 truncate max-w-50">{product.name}</div>
          {product.sku && <div className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</div>}
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      cell: (product) => {
        const typeName = typeof product.type === 'object' && product.type ? product.type.name : (typeof product.type === 'string' ? product.type : null);
        return typeName ? (
          <span className="inline-flex px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{typeName}</span>
        ) : <span className="text-gray-400">—</span>;
      }
    },
    {
      key: 'price',
      header: 'Price',
      cell: (product) => (
        <div>
          <div className="font-medium">{formatCurrency(product.price)}</div>
          {product.comparePrice && product.comparePrice > product.price && (
            <div className="text-xs text-gray-400 line-through">{formatCurrency(product.comparePrice)}</div>
          )}
        </div>
      )
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (product) => {
        const stock = product.stock || 0;
        const status = getStockStatus(stock);
        return (
          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${status.class}`}>
            {status.text}
          </span>
        );
      }
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (product) => (
        <div className="flex flex-col items-start gap-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {product.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
              <Star className="w-3 h-3" /> Featured
            </span>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Added',
      cell: (product) => {
        const d = new Date(product.createdAt);
        return <span className="text-xs text-gray-500">{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
      }
    }
  ];

  // Helper to get inventory stock status
  const getInventoryStatus = (item: InventoryItem): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    if (item.stock === 0) return 'out-of-stock';
    if (typeof item.threshold === 'number' && item.threshold > 0 && item.stock <= item.threshold) return 'low-stock';
    return 'in-stock';
  };

  // Derived unique categories from inventory for the filter dropdown
  const inventoryCategories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach(i => { if (i.category) cats.add(i.category); });
    return Array.from(cats).sort();
  }, [inventory]);

  // Count of active advanced filters (for badge)
  const activeInvFilterCount = useMemo(() => {
    let count = 0;
    if (inventoryFilter !== 'all') count++;
    if (invCategoryFilter !== 'all') count++;
    if (invStockMin !== '') count++;
    if (invStockMax !== '') count++;
    if (invThresholdFilter !== 'all') count++;
    if (invActiveFilter !== 'all') count++;
    if (invSortBy !== 'name-asc') count++;
    return count;
  }, [inventoryFilter, invCategoryFilter, invStockMin, invStockMax, invThresholdFilter, invActiveFilter, invSortBy]);

  // Clear all advanced filters
  const clearAllInvFilters = () => {
    setInventoryFilter('all');
    setInvCategoryFilter('all');
    setInvStockMin('');
    setInvStockMax('');
    setInvThresholdFilter('all');
    setInvActiveFilter('all');
    setInvSortBy('name-asc');
    setInventorySearch('');
  };

  // Filtered inventory based on search and all filters
  const filteredInventory = useMemo(() => {
    let items = inventory;

    // Text search
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase().trim();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.sku && i.sku.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q))
      );
    }

    // Stock status filter
    if (inventoryFilter !== 'all') {
      items = items.filter(i => getInventoryStatus(i) === inventoryFilter);
    }

    // Category filter
    if (invCategoryFilter !== 'all') {
      items = items.filter(i => i.category === invCategoryFilter);
    }

    // Stock range filter
    if (invStockMin !== '') {
      const min = Number(invStockMin);
      if (!isNaN(min)) items = items.filter(i => i.stock >= min);
    }
    if (invStockMax !== '') {
      const max = Number(invStockMax);
      if (!isNaN(max)) items = items.filter(i => i.stock <= max);
    }

    // Threshold set/unset filter
    if (invThresholdFilter === 'set') {
      items = items.filter(i => typeof i.threshold === 'number' && i.threshold > 0);
    } else if (invThresholdFilter === 'unset') {
      items = items.filter(i => !i.threshold || i.threshold === 0);
    }

    // Active/inactive filter
    if (invActiveFilter === 'active') {
      items = items.filter(i => i.isActive !== false);
    } else if (invActiveFilter === 'inactive') {
      items = items.filter(i => i.isActive === false);
    }

    // Sorting
    const [sortField, sortDir] = invSortBy.split('-') as [string, string];
    const dir = sortDir === 'desc' ? -1 : 1;
    items = [...items].sort((a, b) => {
      switch (sortField) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'stock': return dir * (a.stock - b.stock);
        case 'price': return dir * ((a.price || 0) - (b.price || 0));
        case 'sku': return dir * ((a.sku || '').localeCompare(b.sku || ''));
        default: return 0;
      }
    });

    return items;
  }, [inventory, inventorySearch, inventoryFilter, invCategoryFilter, invStockMin, invStockMax, invThresholdFilter, invActiveFilter, invSortBy]);

  // Inventory stats
  const inventoryStats = useMemo(() => {
    const total = inventory.length;
    const outOfStock = inventory.filter(i => i.stock === 0).length;
    const lowStock = inventory.filter(i => {
      const t = typeof i.threshold === 'number' ? i.threshold : 0;
      return i.stock > 0 && t > 0 && i.stock <= t;
    }).length;
    const inStock = total - outOfStock - lowStock;
    const totalUnits = inventory.reduce((sum, i) => sum + i.stock, 0);
    const totalValue = inventory.reduce((sum, i) => sum + (i.stock * (i.price || 0)), 0);
    return { total, inStock, lowStock, outOfStock, totalUnits, totalValue };
  }, [inventory]);

  const inventoryColumns: Column<InventoryItem>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={filteredInventory.length > 0 && selectedInventory.length === filteredInventory.length}
          onChange={() => {
            if (selectedInventory.length === filteredInventory.length) setSelectedInventory([]);
            else setSelectedInventory(filteredInventory.map(it => it.id));
          }}
        />
      ),
      cell: (i) => (
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={selectedInventory.includes(i.id)}
          onChange={() => {
            setSelectedInventory(prev => prev.includes(i.id) ? prev.filter(x => x !== i.id) : [...prev, i.id]);
          }}
        />
      ),
      width: '40px'
    },
    {
      key: 'product',
      header: 'Product',
      cell: (i) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
            {i.imageUrl ? (
              <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
            <p className="text-xs text-gray-500 font-mono">{i.sku || '—'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      cell: (i) => (
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
          {i.category || '—'}
        </span>
      )
    },
    {
      key: 'stock',
      header: 'Stock Level',
      cell: (i) => {
        const status = getInventoryStatus(i);
        const isEditing = editingStockId === i.id;
        const maxForBar = Math.max(i.stock, i.threshold || 10, 50);
        const pct = Math.min(100, (i.stock / maxForBar) * 100);
        const barColor = status === 'out-of-stock' ? 'bg-red-500' : status === 'low-stock' ? 'bg-amber-500' : 'bg-emerald-500';

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(editingStockValue);
                    if (isNaN(n) || n < 0) { toast.error('Invalid number'); return; }
                    handleAdjustStock(i.id, n);
                    setEditingStockId(null);
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    value={editingStockValue}
                    onChange={(e) => setEditingStockValue(e.target.value)}
                    className="w-16 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    autoFocus
                    onBlur={() => setEditingStockId(null)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingStockId(null); }}
                  />
                </form>
              ) : (
                <>
                  <button
                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                    onClick={() => handleAdjustStock(i.id, Math.max(0, i.stock - 1))}
                    aria-label={`Decrease ${i.name}`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    className="font-semibold text-sm min-w-8 text-center cursor-pointer hover:text-blue-600 transition-colors"
                    title="Click to edit"
                    onClick={() => {
                      setEditingStockId(i.id);
                      setEditingStockValue(String(i.stock));
                    }}
                  >
                    {i.stock}
                  </button>
                  <button
                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                    onClick={() => handleAdjustStock(i.id, i.stock + 1)}
                    aria-label={`Increase ${i.name}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            {/* Stock bar */}
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      }
    },
    {
      key: 'threshold',
      header: 'Reorder Point',
      cell: (i) => {
        const isEditing = editingThresholdId === i.id;
        return isEditing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(editingThresholdValue);
              if (isNaN(n) || n < 0) { toast.error('Invalid number'); return; }
              handleUpdateThreshold(i.id, n);
              setEditingThresholdId(null);
            }}
          >
            <input
              type="number"
              min="0"
              value={editingThresholdValue}
              onChange={(e) => setEditingThresholdValue(e.target.value)}
              className="w-16 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              autoFocus
              onBlur={() => setEditingThresholdId(null)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingThresholdId(null); }}
            />
          </form>
        ) : (
          <button
            className="text-sm text-gray-700 hover:text-blue-600 cursor-pointer transition-colors flex items-center gap-1.5"
            title="Click to edit threshold"
            onClick={() => {
              setEditingThresholdId(i.id);
              setEditingThresholdValue(String(i.threshold ?? 0));
            }}
          >
            <span className="font-medium">{typeof i.threshold === 'number' ? i.threshold : '—'}</span>
            <span className="text-gray-400 text-xs">✎</span>
          </button>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      cell: (i) => {
        const status = getInventoryStatus(i);
        const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
          'in-stock': { label: 'In Stock', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
          'low-stock': { label: 'Low Stock', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
          'out-of-stock': { label: 'Out of Stock', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
        };
        const config = statusConfig[status];
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        );
      }
    }
  ];

  // Status transition map (must match backend ALLOWED_TRANSITIONS)
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    PENDING:    ['CONFIRMED', 'CANCELLED'],
    CONFIRMED:  ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED:    ['DELIVERED'],
    DELIVERED:  ['REFUNDED'],
    CANCELLED:  [],
    REFUNDED:   [],
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    setActionLoading(prev => ({ ...prev, [`order-${orderId}`]: true }));
    try {
      await apiRequest(API_ENDPOINTS.ORDERS.ADMIN.UPDATE_STATUS(orderId), { method: 'PATCH', body: { status }, requireAuth: true });
      toast.success(`Order status updated to ${status}`);
      setStatusConfirm(null);
      fetchOrders();
    } catch (err: any) {
      console.error('Failed to update order', err);
      const msg = err?.message || err?.data?.message || 'Failed to update order';
      toast.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, [`order-${orderId}`]: false }));
    }
  };

  // Bulk status update for selected orders
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedOrders.length === 0) return;
    const promises = selectedOrders.map(id => handleUpdateOrderStatus(id, status));
    await Promise.allSettled(promises);
    setSelectedOrders([]);
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Select/deselect all orders
  const toggleAllOrders = (allIds: string[]) => {
    setSelectedOrders(prev => prev.length === allIds.length ? [] : [...allIds]);
  };

  // Sort orders
  const sortOrders = (list: Order[]) => {
    return [...list].sort((a, b) => {
      const dir = orderSort.dir === 'asc' ? 1 : -1;
      switch (orderSort.field) {
        case 'date': return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'amount': return dir * ((a.total || 0) - (b.total || 0));
        case 'status': return dir * a.status.localeCompare(b.status);
        case 'customer': {
          const nameA = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim().toLowerCase();
          const nameB = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`.trim().toLowerCase();
          return dir * nameA.localeCompare(nameB);
        }
        default: return 0;
      }
    });
  };

  // Toggle sort
  const handleOrderSort = (field: typeof orderSort.field) => {
    setOrderSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Sort indicator
  const SortIcon = ({ field }: { field: typeof orderSort.field }) => (
    <span className="ml-1 text-xs">{orderSort.field === field ? (orderSort.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  );

  const handleAdjustStock = async (productId: string, newStock: number) => {
    setActionLoading(prev => ({ ...prev, [`stock-${productId}`]: true }));
    try {
      // Use admin product update endpoint to set stock
      await apiRequest(API_ENDPOINTS.PRODUCTS.ADMIN.UPDATE(productId), { method: 'PUT', body: { stock: newStock }, requireAuth: true });
      toast.success('Stock updated');
      fetchInventory();
      fetchProducts();
    } catch (err) {
      console.error('Failed to update stock', err);
      toast.error('Failed to update stock');
    } finally {
      setActionLoading(prev => ({ ...prev, [`stock-${productId}`]: false }));
    }
  };

  const handleUpdateThreshold = async (productId: string, newThreshold: number) => {
    setActionLoading(prev => ({ ...prev, [`threshold-${productId}`]: true }));
    try {
      await apiRequest(API_ENDPOINTS.PRODUCTS.ADMIN.UPDATE(productId), { method: 'PUT', body: { threshold: newThreshold }, requireAuth: true });
      toast.success('Threshold updated');
      fetchInventory();
      fetchProducts();
    } catch (err) {
      console.error('Failed to update threshold', err);
      toast.error('Failed to update threshold');
    } finally {
      setActionLoading(prev => ({ ...prev, [`threshold-${productId}`]: false }));
    }
  };

  const bulkSetSelectedStock = async () => {
    if (selectedInventory.length === 0) return toast.error('No items selected');
    const v = prompt('Set new stock for selected items (absolute number)');
    if (v === null) return;
    const n = Number(v);
    if (isNaN(n)) return toast.error('Invalid number');

    const itemsToUpdate = selectedInventory.map(id => {
      const it = inventory.find(x => x.id === id);
      const current = it ? it.stock : 0;
      return { id, delta: n - current };
    });

    await bulkUpdateStock(itemsToUpdate);
    setSelectedInventory([]);
  };

  const bulkDeltaSelected = async (delta: number) => {
    if (selectedInventory.length === 0) return toast.error('No items selected');
    const itemsToUpdate = selectedInventory.map(id => ({ id, delta }));
    await bulkUpdateStock(itemsToUpdate);
    setSelectedInventory([]);
  };

  const handleOpenEditModal = async (product: Product) => {
    setEditProductLoading(product.id);
    try {
      const data = await apiRequest(API_ENDPOINTS.PRODUCTS.BY_ID(product.id), { requireAuth: true });
      const fullProduct = (data as any)?.product || data;
      setEditProduct(fullProduct as Product);
    } catch (err) {
      console.error('Failed to fetch product for edit', err);
      toast.error('Failed to load product details');
    } finally {
      setEditProductLoading(null);
    }
  };

  const productActions: Action<Product>[] = [
    {
      label: (product) => editProductLoading === product.id ? 'Loading...' : 'Edit',
      onClick: (product) => handleOpenEditModal(product),
      variant: 'outline',
      disabled: (product) => editProductLoading === product.id
    },
    {
      label: 'Delete',
      onClick: (product) => showDeleteConfirm('product', product.id, product.name),
      variant: 'danger',
      loading: (product) => actionLoading[`delete-product-${product.id}`] || actionLoading[`hard-delete-product-${product.id}`]
    }
  ];

  const renderError = () => {
    if (!error) return null;

    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error.message}</p>
            {error.type !== 'action' && retryCount > 0 && (
              <p className="mt-1 text-sm text-red-600">
                Retrying... Attempt {retryCount} of {MAX_RETRIES}
              </p>
            )}
            {error.type !== 'action' && retryCount >= MAX_RETRIES && (
              <button
                onClick={() => fetchProducts(true)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const prettyCategory = (s?: string | null) => {
    if (!s) return '';
    return s
      .toString()
      .replace(/-/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const emptyProductsMessage = adminCategory ? `No ${prettyCategory(adminCategory)} products found` : 'No products found';

  return (
    <AdminProtectedRoute>
      <header id="admin-header" className="fixed top-0 left-0 right-0 z-50 w-full p-6 bg-white shadow">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Product Management Dashboard</h1>
            <div className="text-sm text-gray-500">Signed in: {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.email}</div>
          </div>
          <div className="flex items-center gap-3">
            <button className="md:hidden px-3 py-2 bg-gray-100 rounded" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <button
              className="px-3 py-2 bg-red-600 text-white rounded"
              onClick={async () => { await logout(); }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="flex min-h-screen" style={{ paddingTop: typeof headerHeight === 'number' ? headerHeight + 100 : undefined }}>
        <AdminSectionNav
          active={activeTab as any}
          onChange={(s) => setActiveTab(s as any)}
          onSelectCategory={(slug) => { setAdminCategory(slug); setActiveTab('products'); }}
          activeCategory={adminCategory}
          headerId="admin-header"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 p-3 sm:p-6" style={{ scrollPaddingTop: typeof headerHeight === 'number' ? `${headerHeight + 24}px` : undefined }}>
        <section>
          {activeTab === 'overview' && (
            <div className="p-3 sm:p-6 space-y-6">
              {/* Header with Period Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Overview</h2>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">Store performance for the selected period</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Period Toggle */}
                  <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
                    {(['today', 'week', 'month'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setOverviewPeriod(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          overviewPeriod === p
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={fetchAnalytics}
                    disabled={analyticsLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {analyticsLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading analytics...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Primary Metrics — Period-Aware */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <button onClick={() => setActiveTab('orders')} className="group p-4 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 hover:border-blue-300 transition-all text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4 text-blue-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-blue-600 font-medium">{periodLabel} Orders</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{overviewMetrics.periodOrders}</p>
                    </button>

                    <button onClick={() => setActiveTab('orders')} className="group p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-emerald-600 font-medium">{periodLabel} Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(overviewMetrics.periodRevenue)}</p>
                    </button>

                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-xs text-purple-600 font-medium">{periodLabel} Customers</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{overviewMetrics.periodCustomers}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 font-medium">{periodLabel} Avg Order</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(overviewMetrics.periodAOV)}</p>
                    </div>
                  </div>

                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <button onClick={() => setActiveTab('products')} className="p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all text-left">
                      <p className="text-xs text-gray-500">Products</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.activeProducts}<span className="text-xs font-normal text-gray-400">/{overviewMetrics.totalProducts}</span></p>
                      <p className="text-[10px] text-gray-400 mt-0.5">active / total</p>
                    </button>
                    <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-xl border transition-all text-left ${overviewMetrics.pendingOrders > 0 ? 'border-yellow-200 bg-yellow-50/60 hover:border-yellow-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Pending Orders</p>
                        {overviewMetrics.pendingOrders > 0 && <Clock className="w-3.5 h-3.5 text-yellow-500" />}
                      </div>
                      <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.pendingOrders}</p>
                      {overviewMetrics.pendingOrders > 0 && <p className="text-[10px] text-yellow-600 font-medium mt-0.5">Needs action</p>}
                    </button>
                    <button onClick={() => setActiveTab('reviews')} className="p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Reviews</p>
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.periodReviewCount}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{overviewMetrics.featuredReviewCount} featured</p>
                    </button>
                    <button onClick={() => setActiveTab('feedback')} className={`p-3 rounded-xl border transition-all text-left ${overviewMetrics.unresolvedFeedback > 0 ? 'border-red-200 bg-red-50/60 hover:border-red-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Feedback</p>
                        <MessageSquare className={`w-3.5 h-3.5 ${overviewMetrics.unresolvedFeedback > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                      </div>
                      <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.periodFeedbackCount}</p>
                      {overviewMetrics.unresolvedFeedback > 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">{overviewMetrics.unresolvedFeedback} unresolved</p>}
                    </button>
                    <button onClick={() => setActiveTab('inventory')} className={`p-3 rounded-xl border transition-all text-left ${overviewMetrics.lowStock.length > 0 ? 'border-red-200 bg-red-50/60 hover:border-red-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Low Stock</p>
                        <AlertTriangle className={`w-3.5 h-3.5 ${overviewMetrics.lowStock.length > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                      </div>
                      <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.lowStock.length}</p>
                      {overviewMetrics.lowStock.length > 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">Items at risk</p>}
                    </button>
                  </div>

                  {/* Order Status & Quick Actions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Order Status Breakdown */}
                    <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">{periodLabel} Order Status</h3>
                        <button onClick={() => setActiveTab('orders')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          View all <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      {Object.keys(overviewMetrics.breakdown).length > 0 ? (
                        <div className="space-y-2.5">
                          {Object.entries(overviewMetrics.breakdown).map(([status, count]: [string, number]) => {
                            const total = Object.values(overviewMetrics.breakdown).reduce((a: number, b: number) => a + b, 1);
                            const pct = Math.round((count / total) * 100);
                            const colorMap: Record<string, string> = {
                              PENDING: 'bg-yellow-500', PROCESSING: 'bg-blue-500', SHIPPED: 'bg-indigo-500',
                              DELIVERED: 'bg-emerald-500', CANCELLED: 'bg-red-500', REFUNDED: 'bg-gray-500',
                            };
                            const barColor = colorMap[status] || 'bg-gray-400';
                            return (
                              <div key={status} className="flex items-center gap-3">
                                <span className="text-xs text-gray-600 capitalize w-20 shrink-0">{status.toLowerCase()}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                  <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-gray-900 w-8 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No orders in this period</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setActiveTab('products')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Add Product</p>
                            <p className="text-[10px] text-gray-400">Create new listing</p>
                          </div>
                        </button>
                        <button onClick={() => setActiveTab('orders')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Manage Orders</p>
                            <p className="text-[10px] text-gray-400">View & process</p>
                          </div>
                        </button>
                        <button onClick={() => setActiveTab('inventory')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Inventory</p>
                            <p className="text-[10px] text-gray-400">Stock levels</p>
                          </div>
                        </button>
                        <button onClick={() => setActiveTab('reviews')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Reviews</p>
                            <p className="text-[10px] text-gray-400">Testimonials</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Low Stock & Recent Orders */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Low Stock Products */}
                    <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          Low Stock Alert
                        </h3>
                        <button onClick={() => setActiveTab('inventory')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          Inventory <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      {overviewMetrics.lowStock.length > 0 ? (
                        <div className="space-y-2">
                          {overviewMetrics.lowStock.map((product: any) => (
                            <div key={product.id} className="flex items-center justify-between p-2.5 bg-red-50/60 border border-red-100 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{typeof (product as any).category === 'object' ? (product as any).category?.name : (product as any).category || product.collection?.name || '\u2014'}</p>
                              </div>
                              <span className={`ml-2 text-sm font-bold px-2 py-0.5 rounded-full ${product.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {product.stock === 0 ? 'Out' : product.stock}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">All products well stocked</p>
                          <p className="text-xs text-gray-400 mt-0.5">No items below threshold</p>
                        </div>
                      )}
                    </div>

                    {/* Recent Orders (period-scoped) */}
                    <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Recent Orders
                        </h3>
                        <button onClick={() => setActiveTab('orders')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          All orders <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      {overviewMetrics.recentOrders.length > 0 ? (
                        <div className="space-y-2">
                          {overviewMetrics.recentOrders.map((order: any) => {
                            const statusColors: Record<string, string> = {
                              PENDING: 'bg-yellow-100 text-yellow-800', PROCESSING: 'bg-blue-100 text-blue-800',
                              SHIPPED: 'bg-indigo-100 text-indigo-800', DELIVERED: 'bg-emerald-100 text-emerald-800',
                              CANCELLED: 'bg-red-100 text-red-800', REFUNDED: 'bg-gray-100 text-gray-800',
                            };
                            return (
                              <div key={order.id} className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-mono text-gray-500">#{order.orderNumber || order.id.slice(0, 8)}</p>
                                    <span className="text-xs font-bold text-gray-900">{formatCurrency(order.total)}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <p className="text-[10px] text-gray-400 truncate">{order.user?.email || 'Guest'}</p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                      {order.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">No orders in this period</p>
                          <p className="text-xs text-gray-400 mt-0.5">Try switching the time range</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Products (period-scoped) */}
                  {overviewMetrics.topProducts.length > 0 && (
                    <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          {periodLabel} Top Products
                        </h3>
                        <button onClick={() => setActiveTab('products')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          All products <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {overviewMetrics.topProducts.map((product: any, idx: number) => (
                          <div key={product.id} className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                              }`}>#{idx + 1}</span>
                              <span className="text-[10px] font-bold text-emerald-600">{formatCurrency(product.revenue || 0)}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{product.quantity || 0} units sold</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="p-3 sm:p-6">
              {/* Header Section */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {adminCategory 
                        ? `${prettyCategory(adminCategory)} Products` 
                        : 'Products Management'}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      {adminCategory 
                        ? `Manage and track all products in the ${prettyCategory(adminCategory).toLowerCase()} category.` 
                        : 'Select a category from the sidebar to manage its products.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition whitespace-nowrap shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!adminCategory}
                    title={!adminCategory ? 'Select a category page first' : 'Add new product'}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Product</span>
                  </button>
                </div>

                {/* Category Stats */}
                {adminCategory && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs sm:text-sm text-blue-600 font-medium">Total Products</div>
                      <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{products.length}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs sm:text-sm text-green-600 font-medium">In Stock</div>
                      <div className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">{products.filter(p => p.stock > 0).length}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-xs sm:text-sm text-orange-600 font-medium">Low Stock</div>
                      <div className="text-2xl sm:text-3xl font-bold text-orange-900 mt-1">{products.filter(p => p.stock < 10 && p.stock > 0).length}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs sm:text-sm text-red-600 font-medium">Out of Stock</div>
                      <div className="text-2xl sm:text-3xl font-bold text-red-900 mt-1">{products.filter(p => p.stock === 0).length}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-lg border">
                {renderError()}
                <div className="p-3 sm:p-6">
                  {/* Product Search */}
                  {adminCategory && (
                    <div className="mb-4" ref={searchRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Search ${prettyCategory(adminCategory).toLowerCase()} products by name, SKU, or tag...`}
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                          }}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}

                        {/* Live Suggestions Dropdown */}
                        {searchFocused && searchTerm.length >= 1 && (() => {
                          const term = searchTerm.toLowerCase();
                          const suggestions = allCategoryProducts
                            .filter(p => 
                              p.name.toLowerCase().includes(term) ||
                              (p.sku && p.sku.toLowerCase().includes(term)) ||
                              (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(term)))
                            )
                            .slice(0, 6);
                          
                          if (suggestions.length === 0) return null;
                          
                          return (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                <span className="text-xs font-medium text-gray-500">
                                  {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} in {prettyCategory(adminCategory)}
                                </span>
                              </div>
                              {suggestions.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 transition text-left"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSearchTerm(p.name);
                                    setSearchFocused(false);
                                  }}
                                >
                                  {p.imageUrl ? (
                                    <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                      <ImageIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {/* Highlight matching text */}
                                      {(() => {
                                        const idx = p.name.toLowerCase().indexOf(term);
                                        if (idx === -1) return p.name;
                                        return (
                                          <>
                                            {p.name.slice(0, idx)}
                                            <span className="bg-yellow-100 text-yellow-900 font-semibold">
                                              {p.name.slice(idx, idx + term.length)}
                                            </span>
                                            {p.name.slice(idx + term.length)}
                                          </>
                                        );
                                      })()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {formatCurrency(p.price)}
                                      {p.sku ? ` · SKU: ${p.sku}` : ''}
                                      {p.stock === 0 ? ' · Out of stock' : ` · ${p.stock} in stock`}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      {/* Search status indicator */}
                      {searchTerm && searchTerm !== debouncedSearchTerm && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-gray-400">Searching...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No products found for search */}
                  {adminCategory && !loading && debouncedSearchTerm && products.length === 0 && (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                      <p className="text-sm text-gray-500 mb-1">
                        No results for &ldquo;<span className="font-medium text-gray-700">{debouncedSearchTerm}</span>&rdquo; in {prettyCategory(adminCategory)}
                      </p>
                      <p className="text-xs text-gray-400 mb-4">Try a different search term or check for typos</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition inline-flex items-center gap-2"
                      >
                        <X className="h-3.5 w-3.5" />
                        Clear Search
                      </button>
                    </div>
                  )}

                  {/* No products at all (empty category) */}
                  {adminCategory && !loading && !debouncedSearchTerm && products.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
                      <p className="text-sm text-gray-600 mb-6">Start by adding your first {prettyCategory(adminCategory).toLowerCase()} product</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create Product
                      </button>
                    </div>
                  )}
                  {products.length > 0 && (
                    <DataTable data={products} columns={productColumns} actions={productActions} loading={loading} emptyMessage={emptyProductsMessage} />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (() => {
            const sorted = sortOrders(orders);
            const totalPages = orderPagination.pages;
            const paginated = sorted; // Already paginated by server
            const pageOrderIds = paginated.map(o => o.id);
            const avgOrderValue = orders.length > 0 ? orders.reduce((s, o) => s + (o.total || 0), 0) / orders.length : 0;
            const cancelledCount = orders.filter(o => o.status === 'CANCELLED').length;
            const shippedCount = orders.filter(o => o.status === 'SHIPPED').length;
            const totalOrderCount = orderPagination.total || orders.length;

            return (
            <div className="p-3 sm:p-6">
              {/* Status confirmation modal */}
              {statusConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Status Change</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Change order status to <span className="font-semibold text-blue-600">{statusConfirm.newStatus}</span>?
                    </p>
                    {statusConfirm.newStatus === 'CANCELLED' && (
                      <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-semibold text-red-800">⚠️ This will:</p>
                        <ul className="text-xs text-red-700 mt-1 space-y-0.5 list-disc list-inside">
                          <li>Restore stock for all order items</li>
                          <li>Mark payment as refunded</li>
                          <li>Send cancellation email to customer</li>
                        </ul>
                      </div>
                    )}
                    {statusConfirm.newStatus === 'REFUNDED' && (
                      <div className="p-3 mb-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs font-semibold text-orange-800">⚠️ This will:</p>
                        <ul className="text-xs text-orange-700 mt-1 space-y-0.5 list-disc list-inside">
                          <li>Restore stock for all order items</li>
                          <li>Issue a Stripe refund (if paid via Stripe)</li>
                          <li>Send refund notification email to customer</li>
                        </ul>
                      </div>
                    )}
                    {statusConfirm.newStatus === 'SHIPPED' && (
                      <div className="p-3 mb-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700">📧 A shipping notification email with tracking info will be sent to the customer.</p>
                      </div>
                    )}
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setStatusConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                      <button
                        onClick={() => handleUpdateOrderStatus(statusConfirm.orderId, statusConfirm.newStatus)}
                        disabled={actionLoading[`order-${statusConfirm.orderId}`]}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2 ${
                          statusConfirm.newStatus === 'CANCELLED' ? 'bg-red-600 hover:bg-red-700'
                          : statusConfirm.newStatus === 'REFUNDED' ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {actionLoading[`order-${statusConfirm.orderId}`] && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {statusConfirm.newStatus === 'CANCELLED' ? 'Confirm Cancel' : statusConfirm.newStatus === 'REFUNDED' ? 'Confirm Refund' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders Management</h1>
                    <p className="mt-2 text-sm text-gray-600">Track, analyze, and manage all customer orders and transactions.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => fetchOrders()} variant="outline" className="text-sm">🔄 Refresh</Button>
                    <Button onClick={() => exportCSV(orders, 'orders.csv')} className="text-sm">📊 Export CSV</Button>
                  </div>
                </div>

                {/* Order Statistics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs text-blue-600 font-medium">Total Orders</div>
                    <div className="text-2xl font-bold text-blue-900 mt-1">{totalOrderCount}</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-xs text-green-600 font-medium">Delivered</div>
                    <div className="text-2xl font-bold text-green-900 mt-1">{orders.filter(o => o.status === 'DELIVERED').length}</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-xs text-purple-600 font-medium">Pending</div>
                    <div className="text-2xl font-bold text-purple-900 mt-1">{orders.filter(o => ['PENDING', 'PROCESSING'].includes(o.status)).length}</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                    <div className="text-xs text-cyan-600 font-medium">Shipped</div>
                    <div className="text-2xl font-bold text-cyan-900 mt-1">{shippedCount}</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-xs text-red-600 font-medium">Cancelled</div>
                    <div className="text-2xl font-bold text-red-900 mt-1">{cancelledCount}</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-xs text-orange-600 font-medium">Revenue</div>
                    <div className="text-xl font-bold text-orange-900 mt-1">{formatCurrency(orders.reduce((s, o) => s + (o.total || 0), 0))}</div>
                    <div className="text-xs text-orange-500 mt-0.5">Avg: {formatCurrency(avgOrderValue)}</div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-6 p-4 sm:p-5 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                  {(orderStatusFilter || orderCustomerSearch || orderDateRange.start || orderDateRange.end) && (
                    <button onClick={() => { setOrderStatusFilter(''); setOrderCustomerSearch(''); setOrderDateRange({ start: '', end: '' }); setOrderPage(1); }} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition">
                      ✕ Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Order Status</label>
                    <select value={orderStatusFilter} onChange={(e) => { setOrderStatusFilter(e.target.value); setOrderPage(1); }} className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Search Customer</label>
                    <input type="text" value={orderCustomerSearch} onChange={(e) => { setOrderCustomerSearch(e.target.value); setOrderPage(1); }} placeholder="Email, name, or order #..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">From Date</label>
                    <input type="date" value={orderDateRange.start} onChange={(e) => { setOrderDateRange(prev => ({ ...prev, start: e.target.value })); setOrderPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">To Date</label>
                    <input type="date" value={orderDateRange.end} onChange={(e) => { setOrderDateRange(prev => ({ ...prev, end: e.target.value })); setOrderPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedOrders.length > 0 && (() => {
                // Compute which bulk transitions are valid for at least one selected order
                const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.id));
                const possibleTransitions = new Set<string>();
                selectedOrderObjects.forEach(o => {
                  (ALLOWED_TRANSITIONS[o.status] || []).forEach(t => possibleTransitions.add(t));
                });

                const bulkButtons: { status: string; label: string; colors: string }[] = [
                  { status: 'CONFIRMED', label: 'Mark Confirmed', colors: 'text-teal-700 bg-teal-100 hover:bg-teal-200' },
                  { status: 'PROCESSING', label: 'Mark Processing', colors: 'text-purple-700 bg-purple-100 hover:bg-purple-200' },
                  { status: 'SHIPPED', label: 'Mark Shipped', colors: 'text-blue-700 bg-blue-100 hover:bg-blue-200' },
                  { status: 'DELIVERED', label: 'Mark Delivered', colors: 'text-green-700 bg-green-100 hover:bg-green-200' },
                  { status: 'CANCELLED', label: 'Cancel', colors: 'text-red-700 bg-red-100 hover:bg-red-200' },
                ];

                return (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-sm font-medium text-blue-800">{selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected</span>
                    <div className="flex flex-wrap gap-2">
                      {bulkButtons.filter(b => possibleTransitions.has(b.status)).map(b => (
                        <button key={b.status} onClick={() => handleBulkStatusUpdate(b.status)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${b.colors}`}>{b.label}</button>
                      ))}
                      <button onClick={() => setSelectedOrders([])} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition">Deselect All</button>
                    </div>
                  </div>
                );
              })()}

              {/* Orders Table */}
              <div className="overflow-x-auto">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading orders...</p>
                    </div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 bg-white border rounded-lg">
                    <div className="text-4xl mb-3">📦</div>
                    <p className="text-gray-500 font-medium">No orders found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or check back later.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full min-w-full text-sm bg-white border rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-3 text-left w-10">
                            <input
                              type="checkbox"
                              checked={selectedOrders.length === pageOrderIds.length && pageOrderIds.length > 0}
                              onChange={() => toggleAllOrders(pageOrderIds)}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-3 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleOrderSort('date')}>
                            Order <SortIcon field="date" />
                          </th>
                          <th className="px-3 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleOrderSort('customer')}>
                            Customer <SortIcon field="customer" />
                          </th>
                          <th className="px-3 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleOrderSort('amount')}>
                            Amount <SortIcon field="amount" />
                          </th>
                          <th className="px-3 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleOrderSort('status')}>
                            Status <SortIcon field="status" />
                          </th>
                          <th className="px-3 py-3 text-left font-semibold text-gray-900">Payment</th>
                          <th className="px-3 py-3 text-left font-semibold text-gray-900">Items</th>
                          <th className="px-3 py-3 text-center font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginated.map((order) => (
                          <React.Fragment key={order.id}>
                            <tr className={`transition ${selectedOrders.includes(order.id) ? 'bg-blue-50' : 'hover:bg-gray-50'} ${expandedOrderId === order.id ? 'bg-gray-50' : ''}`}>
                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.includes(order.id)}
                                  onChange={() => toggleOrderSelection(order.id)}
                                  className="rounded border-gray-300"
                                />
                              </td>
                              <td className="px-3 py-3">
                                <div className="font-mono text-xs font-semibold text-gray-900">{order.orderNumber || order.id.slice(0, 8)}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {' · '}
                                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="font-medium text-sm text-gray-900">
                                  {order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || 'Unnamed' : 'Guest'}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-40">{order.user?.email || 'N/A'}</div>
                              </td>
                              <td className="px-3 py-3 font-semibold text-gray-900">{formatCurrency(order.total)}</td>
                              <td className="px-3 py-3">
                                {(() => {
                                  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
                                  const isTerminal = allowed.length === 0;
                                  const statusLabels: Record<string, string> = {
                                    PENDING: '⏳ Pending', CONFIRMED: '✓ Confirmed', PROCESSING: '⚙ Processing',
                                    SHIPPED: '🚚 Shipped', DELIVERED: '✅ Delivered', CANCELLED: '✕ Cancelled', REFUNDED: '↩ Refunded'
                                  };
                                  return isTerminal ? (
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-800'
                                      : order.status === 'REFUNDED' ? 'bg-orange-100 text-orange-800'
                                      : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {statusLabels[order.status] || order.status}
                                    </span>
                                  ) : (
                                    <select
                                      value={order.status}
                                      onChange={(e) => setStatusConfirm({ orderId: order.id, newStatus: e.target.value })}
                                      disabled={actionLoading[`order-${order.id}`]}
                                      className={`px-2 py-1 pr-6 rounded text-xs font-semibold cursor-pointer border-0 transition focus:ring-2 focus:ring-blue-500 ${
                                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800'
                                        : order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800'
                                        : order.status === 'PROCESSING' ? 'bg-purple-100 text-purple-800'
                                        : order.status === 'CONFIRMED' ? 'bg-teal-100 text-teal-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      <option value={order.status} disabled>{statusLabels[order.status] || order.status}</option>
                                      {allowed.map(s => (
                                        <option key={s} value={s}>{statusLabels[s] || s}</option>
                                      ))}
                                    </select>
                                  );
                                })()}
                              </td>
                              <td className="px-3 py-3">
                                {order.paymentStatus && (
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700 border border-green-200'
                                    : order.paymentStatus === 'REFUNDED' ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                    : order.paymentStatus === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                                  }`}>
                                    {order.paymentStatus === 'PAID' ? '💰' : order.paymentStatus === 'PENDING' ? '⏳' : '⚠'} {order.paymentStatus}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {order.itemCount ?? order.items?.length ?? 0} item{(order.itemCount ?? order.items?.length ?? 0) !== 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                  className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                                  title="View details"
                                >
                                  {expandedOrderId === order.id ? '▲ Hide' : '▼ Details'}
                                </button>
                              </td>
                            </tr>
                            {/* Expanded Order Detail Row */}
                            {expandedOrderId === order.id && (
                              <tr>
                                <td colSpan={8} className="px-0 py-0">
                                  <div className="bg-gray-50 border-t border-b border-gray-200 p-4 sm:p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {/* Order Items */}
                                      <div className="md:col-span-2">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h4>
                                        {order.items && order.items.length > 0 ? (
                                          <div className="space-y-2">
                                            {order.items.map((item: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-lg">📦</div>
                                                  <div>
                                                    <p className="text-sm font-medium text-gray-900">{item.product?.name || item.name || 'Unknown Product'}</p>
                                                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                                                      {item.size && <span>Size: {item.size}</span>}
                                                      {item.color && <span>Color: {item.color}</span>}
                                                      <span>Qty: {item.quantity}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-500 italic">Item details not available.</p>
                                        )}

                                        {/* Tracking Number */}
                                        <div className="mt-4">
                                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Tracking Number</h4>
                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              placeholder={order.trackingNumber || 'Enter tracking number...'}
                                              value={trackingInputs[order.id] ?? order.trackingNumber ?? ''}
                                              onChange={(e) => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                                              disabled={savingTracking[order.id]}
                                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <button
                                              disabled={savingTracking[order.id] || !(trackingInputs[order.id]?.trim()) || trackingInputs[order.id] === order.trackingNumber}
                                              onClick={async () => {
                                                const tracking = trackingInputs[order.id]?.trim();
                                                if (!tracking) return;
                                                setSavingTracking(prev => ({ ...prev, [order.id]: true }));
                                                try {
                                                  await apiRequest(API_ENDPOINTS.ORDERS.ADMIN.UPDATE_STATUS(order.id), { method: 'PATCH', body: { status: order.status, trackingNumber: tracking }, requireAuth: true });
                                                  toast.success('Tracking number saved successfully');
                                                  setTrackingInputs(prev => { const n = { ...prev }; delete n[order.id]; return n; });
                                                  fetchOrders();
                                                } catch (err: any) {
                                                  const msg = err?.message || err?.data?.message || 'Failed to save tracking number';
                                                  toast.error(msg);
                                                } finally {
                                                  setSavingTracking(prev => ({ ...prev, [order.id]: false }));
                                                }
                                              }}
                                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px] justify-center"
                                            >
                                              {savingTracking[order.id] ? (
                                                <>
                                                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                  </svg>
                                                  Saving...
                                                </>
                                              ) : 'Save'}
                                            </button>
                                          </div>
                                          {order.trackingNumber && !trackingInputs[order.id] && (
                                            <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                              Tracking number saved
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Order Summary Sidebar */}
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between"><span className="text-gray-600">Order ID:</span><span className="font-mono text-xs text-gray-900">{order.id.slice(0, 12)}...</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">Date:</span><span className="text-gray-900">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-600">Total:</span><span className="font-bold text-gray-900">{formatCurrency(order.total)}</span></div>
                                          {order.trackingNumber && (
                                            <div className="flex justify-between"><span className="text-gray-600">Tracking:</span><span className="font-mono text-xs text-blue-600">{order.trackingNumber}</span></div>
                                          )}
                                          {order.estimatedDelivery && (
                                            <div className="flex justify-between"><span className="text-gray-600">Est. Delivery:</span><span className="text-gray-900">{new Date(order.estimatedDelivery).toLocaleDateString()}</span></div>
                                          )}
                                          {order.shippedAt && (
                                            <div className="flex justify-between"><span className="text-gray-600">Shipped:</span><span className="text-gray-900">{new Date(order.shippedAt).toLocaleDateString()}</span></div>
                                          )}
                                          {order.deliveredAt && (
                                            <div className="flex justify-between"><span className="text-gray-600">Delivered:</span><span className="text-green-700 font-medium">{new Date(order.deliveredAt).toLocaleDateString()}</span></div>
                                          )}
                                          {order.cancelledAt && (
                                            <div className="flex justify-between"><span className="text-gray-600">Cancelled:</span><span className="text-red-600 font-medium">{new Date(order.cancelledAt).toLocaleDateString()}</span></div>
                                          )}
                                        </div>

                                        {/* Order Timeline */}
                                        <h4 className="text-sm font-semibold text-gray-900 mt-5 mb-3">Status Timeline</h4>
                                        <div className="space-y-0">
                                          {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map((step, idx, arr) => {
                                            const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
                                            const currentIdx = statusOrder.indexOf(order.status);
                                            const stepIdx = statusOrder.indexOf(step);
                                            const isCompleted = stepIdx <= currentIdx && !['CANCELLED', 'REFUNDED'].includes(order.status);
                                            const isCurrent = step === order.status;
                                            return (
                                              <div key={step} className="flex items-start gap-2">
                                                <div className="flex flex-col items-center">
                                                  <div className={`w-3 h-3 rounded-full border-2 ${isCompleted ? 'bg-green-500 border-green-500' : isCurrent ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}></div>
                                                  {idx < arr.length - 1 && <div className={`w-0.5 h-4 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`}></div>}
                                                </div>
                                                <span className={`text-xs ${isCompleted ? 'text-green-700 font-medium' : isCurrent ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>{step.charAt(0) + step.slice(1).toLowerCase()}</span>
                                              </div>
                                            );
                                          })}
                                          {['CANCELLED', 'REFUNDED'].includes(order.status) && (
                                            <div className="flex items-start gap-2 mt-1">
                                              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-500"></div>
                                              <span className="text-xs text-red-700 font-semibold">{order.status.charAt(0) + order.status.slice(1).toLowerCase()}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Quick Actions */}
                                        <h4 className="text-sm font-semibold text-gray-900 mt-5 mb-3">Quick Actions</h4>
                                        <div className="flex flex-wrap gap-2">
                                          <button onClick={() => openAdminOrderDetail(order.id)} className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition">📋 View Full Detail</button>
                                          <button onClick={() => { navigator.clipboard.writeText(order.orderNumber || order.id); toast.success('Order number copied'); }} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition">📎 Copy Order #</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 px-1">
                        <span className="text-sm text-gray-600">
                          Showing {(orderPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(orderPage * ORDERS_PER_PAGE, orderPagination.total)} of {orderPagination.total} orders
                        </span>
                        <div className="flex items-center gap-1">
                          <button disabled={orderPage <= 1} onClick={() => setOrderPage(1)} className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">«</button>
                          <button disabled={orderPage <= 1} onClick={() => setOrderPage(p => p - 1)} className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">‹ Prev</button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let page: number;
                            if (totalPages <= 5) { page = i + 1; }
                            else if (orderPage <= 3) { page = i + 1; }
                            else if (orderPage >= totalPages - 2) { page = totalPages - 4 + i; }
                            else { page = orderPage - 2 + i; }
                            return (
                              <button key={page} onClick={() => setOrderPage(page)} className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${orderPage === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>{page}</button>
                            );
                          })}
                          <button disabled={orderPage >= totalPages} onClick={() => setOrderPage(p => p + 1)} className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">Next ›</button>
                          <button disabled={orderPage >= totalPages} onClick={() => setOrderPage(totalPages)} className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">»</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            );
          })()}

          {activeTab === 'inventory' && (
            <div className="p-3 sm:p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Inventory Management</h2>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">Monitor stock levels, set reorder points, and manage inventory across all products.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportCSV(inventory.map(i => ({ sku: i.sku, name: i.name, category: i.category, stock: i.stock, threshold: i.threshold, price: i.price })), 'inventory.csv')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={() => fetchInventory()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => setInventoryFilter('all')}
                  className={`p-3 rounded-xl border text-left transition-all ${inventoryFilter === 'all' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <p className="text-xs text-gray-500">Total SKUs</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{inventoryStats.total}</p>
                </button>
                <button
                  onClick={() => setInventoryFilter('in-stock')}
                  className={`p-3 rounded-xl border text-left transition-all ${inventoryFilter === 'in-stock' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <p className="text-xs text-gray-500">In Stock</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{inventoryStats.inStock}</p>
                </button>
                <button
                  onClick={() => setInventoryFilter('low-stock')}
                  className={`p-3 rounded-xl border text-left transition-all ${inventoryFilter === 'low-stock' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Low Stock</p>
                    {inventoryStats.lowStock > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <p className="text-xl font-bold text-amber-600 mt-1">{inventoryStats.lowStock}</p>
                </button>
                <button
                  onClick={() => setInventoryFilter('out-of-stock')}
                  className={`p-3 rounded-xl border text-left transition-all ${inventoryFilter === 'out-of-stock' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Out of Stock</p>
                    {inventoryStats.outOfStock > 0 && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <p className="text-xl font-bold text-red-600 mt-1">{inventoryStats.outOfStock}</p>
                </button>
                <div className="p-3 rounded-xl border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500">Total Units</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{inventoryStats.totalUnits.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500">Inventory Value</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(inventoryStats.totalValue)}</p>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="space-y-3">
                {/* Top row: search + filter toggle + summary */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, SKU, or category..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {inventorySearch && (
                      <button
                        onClick={() => setInventorySearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setInvFiltersOpen(!invFiltersOpen)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      invFiltersOpen || activeInvFilterCount > 0
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowDownUp className="w-4 h-4" />
                    Filters
                    {activeInvFilterCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                        {activeInvFilterCount}
                      </span>
                    )}
                  </button>

                  {activeInvFilterCount > 0 && (
                    <button
                      onClick={clearAllInvFilters}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear all
                    </button>
                  )}

                  <p className="text-xs text-gray-500 ml-auto whitespace-nowrap">
                    Showing {filteredInventory.length} of {inventory.length} items
                  </p>
                </div>

                {/* Advanced Filters Panel */}
                {invFiltersOpen && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* Stock Status */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Stock Status</label>
                        <select
                          value={inventoryFilter}
                          onChange={(e) => setInventoryFilter(e.target.value as any)}
                          className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="in-stock">In Stock</option>
                          <option value="low-stock">Low Stock</option>
                          <option value="out-of-stock">Out of Stock</option>
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                        <select
                          value={invCategoryFilter}
                          onChange={(e) => setInvCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Categories</option>
                          {inventoryCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Stock Range */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Stock Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="Min"
                            value={invStockMin}
                            onChange={(e) => setInvStockMin(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-400 text-xs">to</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Max"
                            value={invStockMax}
                            onChange={(e) => setInvStockMax(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Threshold */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Reorder Point</label>
                        <select
                          value={invThresholdFilter}
                          onChange={(e) => setInvThresholdFilter(e.target.value as any)}
                          className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All</option>
                          <option value="set">Threshold Set</option>
                          <option value="unset">No Threshold</option>
                        </select>
                      </div>

                      {/* Product Status */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Product Status</label>
                        <select
                          value={invActiveFilter}
                          onChange={(e) => setInvActiveFilter(e.target.value as any)}
                          className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All</option>
                          <option value="active">Active Only</option>
                          <option value="inactive">Inactive Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Sort + clear row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Sort by</label>
                        <select
                          value={invSortBy}
                          onChange={(e) => setInvSortBy(e.target.value as any)}
                          className="px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="name-asc">Name (A → Z)</option>
                          <option value="name-desc">Name (Z → A)</option>
                          <option value="stock-asc">Stock (Low → High)</option>
                          <option value="stock-desc">Stock (High → Low)</option>
                          <option value="price-asc">Price (Low → High)</option>
                          <option value="price-desc">Price (High → Low)</option>
                          <option value="sku-asc">SKU (A → Z)</option>
                          <option value="sku-desc">SKU (Z → A)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Filter Pills */}
                {activeInvFilterCount > 0 && !invFiltersOpen && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Active filters:</span>
                    {inventoryFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                        Status: {inventoryFilter.replace('-', ' ')}
                        <button onClick={() => setInventoryFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {invCategoryFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                        Category: {invCategoryFilter}
                        <button onClick={() => setInvCategoryFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {(invStockMin !== '' || invStockMax !== '') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                        Stock: {invStockMin || '0'} – {invStockMax || '∞'}
                        <button onClick={() => { setInvStockMin(''); setInvStockMax(''); }} className="text-gray-400 hover:text-gray-600 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {invThresholdFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                        Threshold: {invThresholdFilter === 'set' ? 'Set' : 'Not set'}
                        <button onClick={() => setInvThresholdFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {invActiveFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                        {invActiveFilter === 'active' ? 'Active' : 'Inactive'}
                        <button onClick={() => setInvActiveFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {invSortBy !== 'name-asc' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                        Sorted: {invSortBy.replace('-', ' ')}
                        <button onClick={() => setInvSortBy('name-asc')} className="text-gray-400 hover:text-gray-600 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bulk Actions Toolbar — only visible when items are selected */}
              {selectedInventory.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-sm font-medium text-blue-800">{selectedInventory.length} item{selectedInventory.length > 1 ? 's' : ''} selected</span>
                  <div className="w-px h-5 bg-blue-200 mx-1 hidden sm:block" />
                  <button
                    onClick={bulkSetSelectedStock}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Set Stock
                  </button>
                  <button
                    onClick={() => bulkDeltaSelected(1)}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    +1 All
                  </button>
                  <button
                    onClick={() => bulkDeltaSelected(-1)}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    −1 All
                  </button>
                  <button
                    onClick={() => setSelectedInventory([])}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              {/* Data Table */}
              <DataTable data={filteredInventory} columns={inventoryColumns} loading={inventoryLoading} emptyMessage={
                inventorySearch || inventoryFilter !== 'all'
                  ? `No products match your ${inventorySearch ? 'search' : 'filter'}`
                  : 'No inventory data available'
              } />
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="p-3 sm:p-6">
              <ReviewsManager />
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="p-3 sm:p-6">
              <FeedbacksManager />
            </div>
          )}

          {activeTab === 'product-types' && (
            <ProductTypesPage />
          )}

          {activeTab === 'dashboard' && (
            <DashboardManager />
          )}
        </section>
      </main>

        {/* Delete Confirmation Modal */}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md z-10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Red warning banner */}
              <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-900">Delete Product</h3>
                    <p className="text-sm text-red-700">This action cannot be easily undone</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Product info */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Product to delete:</p>
                  <p className="text-base font-semibold text-gray-900 mt-0.5">&ldquo;{deleteConfirm.name}&rdquo;</p>
                </div>

                {/* Delete type selection */}
                <div className="space-y-3">
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                      !deleteConfirm.hard ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setDeleteConfirm(prev => ({ ...prev, hard: false }))}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        !deleteConfirm.hard ? 'border-red-500' : 'border-gray-300'
                      }`}>
                        {!deleteConfirm.hard && <div className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">Soft Delete</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6 mt-1">Product will be deactivated and hidden from customers, but data is preserved. Can be restored later.</p>
                  </div>

                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                      deleteConfirm.hard ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setDeleteConfirm(prev => ({ ...prev, hard: true }))}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        deleteConfirm.hard ? 'border-red-600' : 'border-gray-300'
                      }`}>
                        {deleteConfirm.hard && <div className="w-2 h-2 rounded-full bg-red-600" />}
                      </div>
                      <span className="text-sm font-semibold text-red-700">Permanent Delete</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6 mt-1">Product and all associated data (images, reviews, order references) will be <strong>permanently removed</strong>. This cannot be undone.</p>
                  </div>
                </div>

                {/* Type-to-confirm for hard delete */}
                {deleteConfirm.hard && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-red-800">
                      To confirm permanent deletion, type the product name below:
                    </p>
                    <input
                      type="text"
                      value={deleteNameConfirm}
                      onChange={(e) => setDeleteNameConfirm(e.target.value)}
                      placeholder={deleteConfirm.name}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                    />
                    {deleteNameConfirm && deleteNameConfirm !== deleteConfirm.name && (
                      <p className="text-xs text-red-600">Name does not match</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => { closeDeleteModal(); setDeleteNameConfirm(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={actionLoading[`delete-product-${deleteConfirm.id}`] || actionLoading[`hard-delete-product-${deleteConfirm.id}`]}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleDeleteProduct(); setDeleteNameConfirm(''); }}
                  disabled={
                    (deleteConfirm.hard && deleteNameConfirm !== deleteConfirm.name) ||
                    actionLoading[`delete-product-${deleteConfirm.id}`] ||
                    actionLoading[`hard-delete-product-${deleteConfirm.id}`]
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(actionLoading[`delete-product-${deleteConfirm.id}`] || actionLoading[`hard-delete-product-${deleteConfirm.id}`]) && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {deleteConfirm.hard ? 'Permanently Delete' : 'Soft Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Product Edit Modal */}
        {editProduct && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditProduct(null)}>
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between border-b border-gray-200 rounded-t-2xl">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Product</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {editProduct.name}{editProduct.sku ? ` — SKU: ${editProduct.sku}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setEditProduct(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition"
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8">
                <ProductForm
                  product={editProduct}
                  onCancel={() => setEditProduct(null)}
                  preselectedCategory={adminCategory || undefined}
                  onSubmit={async (data: Partial<Product>) => {
                    try {
                      let payload = { ...data } as any;

                      if (payload.images && Array.isArray(payload.images) && payload.images.length > 0) {
                        payload.imageUrl = payload.images[0];
                      }

                      await apiRequest(API_ENDPOINTS.PRODUCTS.ADMIN.UPDATE(editProduct.id), {
                        method: 'PUT',
                        body: payload,
                        requireAuth: true,
                      });

                      setEditProduct(null);
                      toast.success('Product updated successfully!');
                      await fetchProducts();
                    } catch (err) {
                      console.error('Update product failed', err);
                      toast.error((err as any)?.message || 'Failed to update product');
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Product Upload Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-screen overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between border-b border-gray-200 rounded-t-2xl">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Upload New Product</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {adminCategory 
                      ? `Adding to ${adminCategory} page` 
                      : 'Create a new product'}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition"
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8">
                <ProductForm
                  product={{ collectionId: '' }}
                  onCancel={() => setShowCreateModal(false)}
                  preselectedCategory={adminCategory || undefined}
                  onSubmit={async (data: Partial<Product>) => {
                    try {
                      // Prepare payload with all product data
                      let payload = { ...data } as any;
                      
                      // If category is provided in form, make sure it's set
                      if (!payload.category) {
                        payload.category = adminCategory || '';
                      }

                      // Convert images array to imageUrl (first image) and images (all images)
                      if (payload.images && Array.isArray(payload.images) && payload.images.length > 0) {
                        payload.imageUrl = payload.images[0]; // Main image (first one)
                        // images array already contains all images
                      }

                      const res = await apiRequest(API_ENDPOINTS.PRODUCTS.ADMIN.CREATE, { method: 'POST', body: payload, requireAuth: true });
                      setShowCreateModal(false);
                      toast.success('Product created successfully!');

                      // Determine created product's category slug robustly using response or payload
                      const createdProduct = res?.product;

                      const slugify = (s?: string | null) =>
                        s ? s.toString().toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') : '';

                      let createdCategorySlug = null as string | null;

                      // Prefer backend-provided normalized category name stored on product (categoryName)
                      if (createdProduct?.categoryName) {
                        createdCategorySlug = createdProduct.categoryName.toString();
                      }

                      // Fallback: if category object is included, slugify its name
                      if (!createdCategorySlug && createdProduct?.category?.name) {
                        createdCategorySlug = slugify(createdProduct.category.name as string);
                      }

                      // Next fallback: use payload.category (may already be slug)
                      if (!createdCategorySlug && payload.category) {
                        createdCategorySlug = payload.category.toString();
                      }

                      // If we have a categoryId but none of the above worked, try resolving after refreshing categories
                      if (!createdCategorySlug && payload.categoryId) {
                        try {
                          await refreshCategories();
                          const match = PRODUCT_CATEGORIES.find((c: any) => c.id === payload.categoryId || c.value === payload.categoryId || c.slug === payload.categoryId);
                          if (match) createdCategorySlug = match.slug || match.value || null;
                        } catch (_) {
                          // ignore
                        }
                      }

                      // Final fallback: keep previous adminCategory
                      if (!createdCategorySlug) createdCategorySlug = adminCategory;

                      if (createdCategorySlug) {
                        setAdminCategory(createdCategorySlug);
                        setActiveTab('products');
                      }

                      // Refresh products to show the new product immediately
                      await fetchProducts();

                      // If product is featured, invalidate featured cache so dashboard picks it up
                      if (payload.isFeatured) {
                        try { localStorage.removeItem('babel_edit_products_featured'); } catch (_) {}
                      }
                    } catch (err) {
                      console.error('Create product failed', err);
                      toast.error((err as any)?.message || 'Failed to create product');
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Admin Order Detail Modal */}
        {adminOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeAdminOrderDetail}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {adminOrderDetail ? `Order #${adminOrderDetail.orderNumber}` : 'Order Details'}
                </h2>
                <button
                  onClick={closeAdminOrderDetail}
                  className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Loading */}
              {adminOrderLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-3 text-gray-600">Loading order details...</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {adminOrderError && !adminOrderLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center px-6">
                    <AlertCircle className="mx-auto w-10 h-10 text-red-500" />
                    <p className="mt-3 text-red-600 font-semibold">{adminOrderError}</p>
                    <p className="mt-1 text-sm text-gray-500">Please try again or check the server logs.</p>
                  </div>
                </div>
              )}

              {/* Order Detail Content */}
              {adminOrderDetail && !adminOrderLoading && !adminOrderError && (() => {
                const od = adminOrderDetail;
                const addr = od.shippingAddress;
                const customer = od.user;

                return (
                  <div className="p-6">
                    {/* Order meta row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                      <div>
                        <p className="text-sm text-gray-500">
                          Placed on {new Date(od.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          {' at '}
                          {new Date(od.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {customer && (
                          <p className="text-sm text-gray-700 mt-1">
                            <span className="font-medium">{`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Guest'}</span>
                            {customer.email && <span className="text-gray-500 ml-2">({customer.email})</span>}
                          </p>
                        )}
                      </div>
                      <span className={`px-4 py-1.5 text-sm font-semibold rounded-full ${
                        od.status === 'DELIVERED' ? 'bg-green-100 text-green-800'
                        : od.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800'
                        : od.status === 'PROCESSING' ? 'bg-purple-100 text-purple-800'
                        : od.status === 'CONFIRMED' ? 'bg-teal-100 text-teal-800'
                        : od.status === 'CANCELLED' ? 'bg-red-100 text-red-800'
                        : od.status === 'REFUNDED' ? 'bg-orange-100 text-orange-800'
                        : 'bg-amber-100 text-amber-800'
                      }`}>
                        {od.status}
                      </span>
                    </div>

                    {/* Info cards grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                      {/* Shipping Address */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Shipping Address</h3>
                        {addr ? (
                          <address className="not-italic text-sm text-gray-600 space-y-0.5">
                            {(addr.firstName || addr.lastName) && (
                              <p className="font-medium text-gray-800">{`${addr.firstName || ''} ${addr.lastName || ''}`.trim()}</p>
                            )}
                            <p>{addr.address1 || addr.street || ''}</p>
                            {addr.address2 && <p>{addr.address2}</p>}
                            <p>{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode || addr.zipCode || ''}</p>
                            <p>{addr.country}</p>
                            {addr.phone && <p className="mt-1">📞 {addr.phone}</p>}
                          </address>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No address on file</p>
                        )}
                      </div>

                      {/* Status & Tracking */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Status & Tracking</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Payment:</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              od.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700'
                              : od.paymentStatus === 'REFUNDED' ? 'bg-orange-100 text-orange-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                              {od.paymentStatus || 'N/A'}
                            </span>
                          </div>
                          {od.paymentMethod && (
                            <div><span className="text-gray-500">Method: </span><span>{od.paymentMethod}</span></div>
                          )}
                          {od.trackingNumber && (
                            <div>
                              <span className="text-gray-500">Tracking: </span>
                              <a href={`https://www.google.com/search?q=${od.trackingNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-xs">{od.trackingNumber}</a>
                            </div>
                          )}
                          {od.estimatedDelivery && (
                            <div>
                              <span className="text-gray-500">Est. Delivery: </span>
                              <span>{new Date(od.estimatedDelivery).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                          {od.shippedAt && (
                            <div>
                              <span className="text-gray-500">Shipped: </span>
                              <span>{new Date(od.shippedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                          {od.deliveredAt && (
                            <div>
                              <span className="text-gray-500">Delivered: </span>
                              <span>{new Date(od.deliveredAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                          {od.cancelledAt && (
                            <div>
                              <span className="text-gray-500">Cancelled: </span>
                              <span className="text-red-600">{new Date(od.cancelledAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                          {od.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <span className="text-gray-500 block mb-1">Notes:</span>
                              <p className="text-gray-700 text-xs">{od.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Summary</h3>
                        <div className="space-y-1.5 text-sm text-gray-600">
                          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(od.subtotal)}</span></div>
                          <div className="flex justify-between"><span>Shipping</span><span>{(od.shipping ?? 0) > 0 ? formatCurrency(od.shipping) : <span className="text-green-600">FREE</span>}</span></div>
                          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(od.tax)}</span></div>
                          {(od.discount ?? 0) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(od.discount)}</span></div>}
                          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
                            <span>Total</span><span>{formatCurrency(od.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="mb-6 bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Timeline</h3>
                      <div className="flex items-center gap-0">
                        {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map((step, idx, arr) => {
                          const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
                          const currentIdx = statusOrder.indexOf(od.status);
                          const stepIdx = statusOrder.indexOf(step);
                          const isCompleted = stepIdx <= currentIdx && !['CANCELLED', 'REFUNDED'].includes(od.status);
                          const isCurrent = step === od.status;
                          return (
                            <React.Fragment key={step}>
                              <div className="flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full border-2 ${isCompleted ? 'bg-green-500 border-green-500' : isCurrent ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}></div>
                                <span className={`mt-1 text-xs whitespace-nowrap ${isCompleted ? 'text-green-700 font-medium' : isCurrent ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                                  {step.charAt(0) + step.slice(1).toLowerCase()}
                                </span>
                              </div>
                              {idx < arr.length - 1 && (
                                <div className={`grow h-0.5 -mt-2.5 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      {['CANCELLED', 'REFUNDED'].includes(od.status) && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-500"></div>
                          <span className="text-xs text-red-700 font-semibold">{od.status.charAt(0) + od.status.slice(1).toLowerCase()}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Items ({od.items?.length || 0})</h3>
                      <div className="space-y-3">
                        {od.items?.map(item => (
                          <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="w-14 h-14 relative rounded-lg border shrink-0 overflow-hidden bg-gray-100">
                              {item.product?.imageUrl ? (
                                <img
                                  src={(() => {
                                    const url = item.product.imageUrl;
                                    const API_HOST = process.env.NEXT_PUBLIC_API_URL || '';
                                    const origin = API_HOST ? new URL(API_HOST).origin : '';
                                    if (url.startsWith('/uploads/')) return origin ? `${origin}${url}` : url;
                                    if (url.includes('localhost') || url.includes('127.0.0.1')) return `/api/image?url=${encodeURIComponent(url)}`;
                                    return url;
                                  })()}
                                  alt={item.product?.name || 'Product'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                              )}
                            </div>
                            <div className="grow min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{item.product?.name || 'Unknown Product'}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                                <span>Qty: {item.quantity}</span>
                                {item.size && <span>Size: {item.size}</span>}
                                {item.color && <span>Color: {item.color}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-sm text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions Footer */}
                    <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(od.orderNumber || od.id); toast.success('Order number copied'); }} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition">📎 Copy Order #</button>
                      <button onClick={() => { navigator.clipboard.writeText(od.id); toast.success('Order ID copied'); }} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition">🔗 Copy ID</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </AdminProtectedRoute>
  );
};

export default AdminPage;