'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import NavbarWithSuspense from '@/app/components/features/Navbar/NavbarWithSuspense';
import Footer from '@/app/components/features/Footer/Footer';
import { useAuth } from '@/app/context/AuthContext';
import {
  Loader2, Package, AlertCircle, X, Search,
  ShoppingBag, Truck, CheckCircle2, Clock, XCircle,
  MapPin, CreditCard, ChevronRight, Star,
  Calendar, Hash, ArrowRight, RotateCcw, Filter, Eye
} from 'lucide-react';
import { API_ENDPOINTS } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import ReviewModal from '@/app/components/features/Modal/ReviewModal';
import { Order } from '@/app/lib/types';
import { formatCurrency } from '@/lib/utils';

const PLACEHOLDER_IMAGE = '/images/babel_logo_black.jpg';

const resolveOrderImage = (url?: string | null): string => {
  if (!url || !url.trim()) return PLACEHOLDER_IMAGE;
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return `/api/image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

const isLocalImage = (url?: string | null): boolean => {
  if (!url) return false;
  return url.includes('localhost') || url.includes('127.0.0.1');
};

// Full order detail interface (from single-order endpoint)
interface OrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'CONFIRMED' | 'PROCESSING' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  paymentMethod: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  notes?: string | null;
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    street?: string;
    city: string;
    state: string;
    postalCode?: string;
    zipCode?: string;
    country: string;
    phone?: string;
  } | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
    subtotal: number;
    product: {
      id: string;
      name: string;
      description?: string;
      imageUrl: string;
    };
  }[];
}

type StatusFilter = 'ALL' | Order['status'];

/* ───────────────── Status Helpers ───────────────── */
const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; bgLight: string; label: string }> = {
  PENDING:    { icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-500',  bgLight: 'bg-amber-50 border-amber-200',   label: 'Pending' },
  CONFIRMED:  { icon: CheckCircle2,  color: 'text-teal-600',   bg: 'bg-teal-500',   bgLight: 'bg-teal-50 border-teal-200',     label: 'Confirmed' },
  PROCESSING: { icon: RotateCcw,     color: 'text-purple-600', bg: 'bg-purple-500',  bgLight: 'bg-purple-50 border-purple-200', label: 'Processing' },
  SHIPPED:    { icon: Truck,         color: 'text-blue-600',   bg: 'bg-blue-500',   bgLight: 'bg-blue-50 border-blue-200',     label: 'Shipped' },
  DELIVERED:  { icon: CheckCircle2,  color: 'text-emerald-600',bg: 'bg-emerald-500', bgLight: 'bg-emerald-50 border-emerald-200', label: 'Delivered' },
  CANCELLED:  { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-500',    bgLight: 'bg-red-50 border-red-200',       label: 'Cancelled' },
  REFUNDED:   { icon: RotateCcw,     color: 'text-orange-600', bg: 'bg-orange-500',  bgLight: 'bg-orange-50 border-orange-200', label: 'Refunded' },
};

const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

/* ───────────────── Progress Steps ───────────────── */
const PROGRESS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

const getProgressIndex = (status: string): number => {
  if (status === 'CANCELLED' || status === 'REFUNDED') return -1;
  const idx = PROGRESS_STEPS.indexOf(status as typeof PROGRESS_STEPS[number]);
  return idx >= 0 ? idx : 0;
};

/* ───────────────── Skeleton Loader ───────────────── */
const OrderCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-24 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-8 w-24 bg-gray-200 rounded-full" />
      </div>
      <div className="flex gap-3 mb-4">
        {[1, 2].map(i => (
          <div key={i} className="w-16 h-16 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 bg-gray-200 rounded-lg" />
        <div className="h-10 w-32 bg-gray-100 rounded-xl" />
      </div>
    </div>
  </div>
);

/* ───────────────── Main Component ───────────────── */
const OrdersPage = () => {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user, loading: authLoading, authenticatedFetch } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<{ id: string; name: string; imageUrl: string } | null>(null);

  // Filter/search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Order detail modal state
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter(o => o.status === 'DELIVERED').length;
    const inTransit = orders.filter(o => o.status === 'SHIPPED').length;
    const active = orders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)).length;
    return { total, delivered, inTransit, active };
  }, [orders]);

  /* ── Filtered orders ── */
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.items.some(it => it.product?.name?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [orders, statusFilter, searchQuery]);

  const openOrderDetail = useCallback(async (orderId: string) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedOrderDetail(null);

    try {
      const data = await authenticatedFetch(API_ENDPOINTS.ORDERS.BY_ID(orderId));
      setSelectedOrderDetail(data);
    } catch (err: any) {
      console.error('Fetch order detail error:', err);
      setDetailError(err.message || 'Failed to load order details.');
    } finally {
      setDetailLoading(false);
    }
  }, [authenticatedFetch]);

  const closeOrderDetail = () => {
    setDetailModalOpen(false);
    setSelectedOrderDetail(null);
    setDetailError(null);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrderDetail) return;
    setIsCancelling(true);
    try {
      await authenticatedFetch(API_ENDPOINTS.ORDERS.CANCEL(selectedOrderDetail.id), { method: 'PATCH' });
      toast.success('Order cancelled successfully!');
      const updated = await authenticatedFetch(API_ENDPOINTS.ORDERS.BY_ID(selectedOrderDetail.id));
      setSelectedOrderDetail(updated);
      const listData = await authenticatedFetch(API_ENDPOINTS.ORDERS.LIST);
      setOrders(listData.orders);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        setError('You must be logged in to view your orders.');
        return;
      }
      try {
        const data = await authenticatedFetch(API_ENDPOINTS.ORDERS.LIST);
        setOrders(data.orders);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user, authLoading, authenticatedFetch]);

  const totalLoading = loading || authLoading;

  const handleReviewSubmit = async ({ rating, title, comment }: { rating: number; title: string; comment: string }) => {
    if (!selectedProductForReview) return;
    try {
      await authenticatedFetch(API_ENDPOINTS.REVIEWS.CREATE, {
        method: 'POST',
        body: { productId: selectedProductForReview.id, rating, title, comment },
      });
      toast.success('Review submitted successfully!');
      setReviewModalOpen(false);
    } catch (error) {
      console.error('Review submission error:', error);
      toast.error('Failed to submit review.');
    }
  };

  /* ───────────────── Mini Progress Bar (inline in card) ───────────────── */
  const OrderProgressBar = ({ status }: { status: string }) => {
    const progressIdx = getProgressIndex(status);
    const isCancelledOrRefunded = status === 'CANCELLED' || status === 'REFUNDED';
    const cfg = getStatusConfig(status);

    if (isCancelledOrRefunded) {
      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bgLight}`}>
          <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 w-full max-w-xs">
        {PROGRESS_STEPS.map((step, i) => {
          const isCompleted = i <= progressIdx;
          const stepCfg = getStatusConfig(step);
          return (
            <div key={step} className="flex items-center grow">
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                  isCompleted ? stepCfg.bg : 'bg-gray-200'
                }`}
                title={stepCfg.label}
              />
            </div>
          );
        })}
      </div>
    );
  };

  /* ───────────────── Order Card ───────────────── */
  const OrderCard = ({ order }: { order: Order }) => {
    const cfg = getStatusConfig(order.status);
    const StatusIcon = cfg.icon;
    const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

    return (
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden">
        {/* Card Header */}
        <div className="p-5 sm:p-6">
          {/* Top row: Order info + Status */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                <h3 className="font-bold text-gray-900 truncate">{order.orderNumber}</h3>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-gray-300">|</span>
                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${cfg.bgLight}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
              <span className={cfg.color}>{cfg.label}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <OrderProgressBar status={order.status} />
          </div>

          {/* Product thumbnails */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-2">
              {order.items.slice(0, 4).map((item, idx) => (
                <div
                  key={item.id}
                  className="w-12 h-12 relative rounded-xl border-2 border-white shrink-0 overflow-hidden bg-gray-50 shadow-sm ring-1 ring-gray-100"
                  style={{ zIndex: 10 - idx }}
                >
                  <Image
                    src={resolveOrderImage(item.product?.imageUrl)}
                    alt={item.product?.name || 'Product image'}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized={isLocalImage(item.product?.imageUrl)}
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                  />
                </div>
              ))}
              {order.items.length > 4 && (
                <div className="w-12 h-12 rounded-xl border-2 border-white bg-gray-100 shadow-sm ring-1 ring-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-gray-500">+{order.items.length - 4}</span>
                </div>
              )}
            </div>
            <div className="min-w-0 grow">
              <p className="text-sm font-medium text-gray-800 truncate">
                {order.items[0]?.product?.name || 'Product'}
                {order.items.length > 1 && (
                  <span className="text-gray-400 font-normal"> & {order.items.length - 1} more</span>
                )}
              </p>
            </div>
          </div>

          {/* Bottom row: Total + Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(order.total)}</p>
            </div>
            <div className="flex items-center gap-2">
              {order.status === 'DELIVERED' && order.items.some(it => it.product) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const reviewableItem = order.items.find(it => it.product);
                    if (reviewableItem?.product) {
                      setSelectedProductForReview(reviewableItem.product);
                      setReviewModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">Review</span>
                </button>
              )}
              <button
                onClick={() => openOrderDetail(order.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-200 cursor-pointer"
                style={{ background: 'var(--color-primary-light)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-primary-light)'}
              >
                <Eye className="w-4 h-4" />
                <span>Details</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ───────────────── Stat Card ───────────────── */
  const StatCard = ({ icon: Icon, label, value, iconColor, iconBg }: {
    icon: React.ElementType; label: string; value: number; iconColor: string; iconBg: string;
  }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );

  /* ───────────────── Filter Pill ───────────────── */
  const FilterPill = ({ label, value, count }: { label: string; value: StatusFilter; count?: number }) => {
    const isActive = statusFilter === value;
    const cfg = value !== 'ALL' ? getStatusConfig(value) : null;
    return (
      <button
        onClick={() => setStatusFilter(value)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
          isActive
            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        {cfg && <cfg.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : cfg.color}`} />}
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  /* ───────────────── ORDER DETAIL MODAL ───────────────── */
  const DetailTimeline = ({ od }: { od: OrderDetail }) => {
    const progressIdx = getProgressIndex(od.status);
    const isCancelledOrRefunded = od.status === 'CANCELLED' || od.status === 'REFUNDED';

    const steps = [
      { key: 'PENDING',    label: 'Order Placed',  date: od.createdAt },
      { key: 'CONFIRMED',  label: 'Confirmed',     date: null },
      { key: 'PROCESSING', label: 'Processing',    date: null },
      { key: 'SHIPPED',    label: 'Shipped',       date: od.shippedAt },
      { key: 'DELIVERED',  label: 'Delivered',     date: od.deliveredAt },
    ];

    if (isCancelledOrRefunded) {
      const cancelCfg = getStatusConfig(od.status);
      return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${cancelCfg.bgLight}`}>
          <cancelCfg.icon className={`w-5 h-5 ${cancelCfg.color}`} />
          <div>
            <p className={`font-semibold text-sm ${cancelCfg.color}`}>
              Order {od.status === 'CANCELLED' ? 'Cancelled' : 'Refunded'}
            </p>
            {(od.cancelledAt) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(od.cancelledAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => {
            const isComplete = i <= progressIdx;
            const isCurrent = i === progressIdx;
            const stepCfg = getStatusConfig(step.key);
            const StepIcon = stepCfg.icon;
            return (
              <div key={step.key} className="flex flex-col items-center relative z-10 flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCurrent
                      ? `${stepCfg.bg} border-transparent text-white shadow-lg ring-4 ring-opacity-20 ${stepCfg.bg.replace('bg-', 'ring-')}`
                      : isComplete
                        ? `${stepCfg.bg} border-transparent text-white`
                        : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
                <p className={`text-xs mt-2 font-medium text-center leading-tight ${isCurrent ? 'text-gray-900' : isComplete ? 'text-gray-600' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.date && isComplete && (
                  <p className="text-[10px] text-gray-400 mt-0.5 text-center">
                    {new Date(step.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {/* Connecting line */}
        <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-gray-200 -z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${Math.max(0, progressIdx / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <NavbarWithSuspense />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ── Page Header ── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">My Orders</h1>
              <p className="text-gray-500 mt-1">Track and manage your purchases</p>
            </div>
            <Link
              href={`/${locale}/products`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-200 shrink-0 w-fit"
              style={{ background: 'var(--color-primary-light)' }}
            >
              <ShoppingBag className="w-4 h-4" />
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* ── Stat Cards ── */}
          {!totalLoading && !error && orders.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatCard icon={ShoppingBag} label="Total Orders" value={stats.total} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
              <StatCard icon={Truck} label="In Transit" value={stats.inTransit} iconColor="text-violet-600" iconBg="bg-violet-50" />
              <StatCard icon={Clock} label="Active" value={stats.active} iconColor="text-amber-600" iconBg="bg-amber-50" />
            </div>
          )}

          {/* ── Search & Filters ── */}
          {!totalLoading && !error && orders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by order number or product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-xl transition-all cursor-pointer ${
                    showFilters || statusFilter !== 'ALL'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {statusFilter !== 'ALL' && (
                    <span className="w-2 h-2 bg-white rounded-full" />
                  )}
                </button>
              </div>

              {/* Filter pills */}
              {showFilters && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <FilterPill label="All" value="ALL" count={orders.length} />
                  <FilterPill label="Pending" value="PENDING" count={orders.filter(o => o.status === 'PENDING').length} />
                  <FilterPill label="Confirmed" value="CONFIRMED" count={orders.filter(o => o.status === 'CONFIRMED').length} />
                  <FilterPill label="Processing" value="PROCESSING" count={orders.filter(o => o.status === 'PROCESSING').length} />
                  <FilterPill label="Shipped" value="SHIPPED" count={orders.filter(o => o.status === 'SHIPPED').length} />
                  <FilterPill label="Delivered" value="DELIVERED" count={orders.filter(o => o.status === 'DELIVERED').length} />
                  <FilterPill label="Cancelled" value="CANCELLED" count={orders.filter(o => o.status === 'CANCELLED').length} />
                  <FilterPill label="Refunded" value="REFUNDED" count={orders.filter(o => o.status === 'REFUNDED').length} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Loading Skeleton ── */}
        {totalLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
          </div>
        )}

        {/* ── Error State ── */}
        {error && (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-100">
            <div className="w-16 h-16 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* ── Order List ── */}
        {!totalLoading && !error && (
          <>
            {filteredOrders.length > 0 ? (
              <>
                {searchQuery || statusFilter !== 'ALL' ? (
                  <p className="text-sm text-gray-500 mb-4">
                    Showing {filteredOrders.length} of {orders.length} orders
                    {statusFilter !== 'ALL' && <span className="font-medium"> · {getStatusConfig(statusFilter).label}</span>}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:gap-5">
                  {filteredOrders.map(order => <OrderCard key={order.id} order={order} />)}
                </div>
              </>
            ) : orders.length > 0 ? (
              /* No results from filter */
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="w-16 h-16 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">No matching orders</h2>
                <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              /* Empty state - no orders at all */
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                  <Package className="w-12 h-12 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
                <p className="text-gray-500 max-w-sm mx-auto mb-8 text-center">
                  When you place your first order, it will show up here. Start exploring our collection!
                </p>
                <Link
                  href={`/${locale}/products`}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                  style={{ background: 'var(--color-primary-light)' }}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Browse Products
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      {/* ───────────── Order Detail Modal ───────────── */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeOrderDetail}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden z-10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedOrderDetail ? `Order #${selectedOrderDetail.orderNumber}` : 'Order Details'}
                </h2>
                {selectedOrderDetail && (
                  <p className="text-sm text-gray-500">
                    Placed {new Date(selectedOrderDetail.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <button
                onClick={closeOrderDetail}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Loading */}
              {detailLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                    </div>
                    <p className="text-gray-500 font-medium">Loading order details...</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {detailError && !detailLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center px-6">
                    <div className="w-14 h-14 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-3">
                      <AlertCircle className="w-7 h-7 text-red-500" />
                    </div>
                    <p className="text-red-600 font-semibold mb-1">{detailError}</p>
                    <p className="text-sm text-gray-500">Please try again or contact support.</p>
                  </div>
                </div>
              )}

              {/* Order Detail Content */}
              {selectedOrderDetail && !detailLoading && !detailError && (() => {
                const od = selectedOrderDetail;
                const addr = od.shippingAddress;

                return (
                  <div className="p-6 space-y-6">
                    {/* ── Timeline / Progress ── */}
                    <div className="bg-gray-50/80 rounded-2xl p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Progress</h3>
                      <DetailTimeline od={od} />
                    </div>

                    {/* ── Info Cards Grid ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Shipping Address */}
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Shipping Address</h3>
                        </div>
                        {addr ? (
                          <address className="not-italic text-sm text-gray-600 space-y-0.5 pl-10">
                            {(addr.firstName || addr.lastName) && (
                              <p className="font-medium text-gray-800">{`${addr.firstName || ''} ${addr.lastName || ''}`.trim()}</p>
                            )}
                            <p>{addr.address1 || addr.street || ''}</p>
                            {addr.address2 && <p>{addr.address2}</p>}
                            <p>{addr.city}, {addr.state} {addr.postalCode || addr.zipCode || ''}</p>
                            <p>{addr.country}</p>
                            {addr.phone && <p className="mt-1 text-gray-500">{addr.phone}</p>}
                          </address>
                        ) : (
                          <p className="text-sm text-gray-400 italic pl-10">No address provided</p>
                        )}
                      </div>

                      {/* Status & Tracking */}
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                            <Truck className="w-4 h-4 text-purple-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Tracking & Status</h3>
                        </div>
                        <div className="space-y-2.5 text-sm pl-10">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Payment:</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              od.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : od.paymentStatus === 'REFUNDED' ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {od.paymentStatus}
                            </span>
                          </div>
                          {od.trackingNumber && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-500">Tracking:</span>
                              <a
                                href={`https://www.google.com/search?q=${od.trackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 hover:underline font-mono text-xs bg-blue-50 px-2 py-0.5 rounded"
                              >
                                {od.trackingNumber}
                              </a>
                            </div>
                          )}
                          {od.estimatedDelivery && (
                            <div className="text-gray-600">
                              <span className="text-gray-500">Est. Delivery: </span>
                              {new Date(od.estimatedDelivery).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                          {(od.status === 'PENDING' || od.status === 'CONFIRMED') && (
                            <button
                              onClick={handleCancelOrder}
                              disabled={isCancelling}
                              className="mt-1 w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2 px-4 rounded-xl text-sm font-semibold hover:bg-red-600 disabled:bg-red-300 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Payment Summary ── */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Payment Summary</h3>
                      </div>
                      <div className="pl-10 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span className="font-medium">{formatCurrency(od.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Shipping</span>
                          <span className="font-medium">{od.shipping > 0 ? formatCurrency(od.shipping) : <span className="text-emerald-600">FREE</span>}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Tax</span>
                          <span className="font-medium">{formatCurrency(od.tax)}</span>
                        </div>
                        {od.discount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount</span>
                            <span className="font-medium">-{formatCurrency(od.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3 mt-3">
                          <span>Total</span>
                          <span>{formatCurrency(od.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Order Items ── */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Items ({od.items.length})</h3>
                      <div className="space-y-3">
                        {od.items.map(item => (
                          <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors">
                            <div className="w-16 h-16 relative rounded-xl border border-gray-100 shrink-0 overflow-hidden bg-gray-50">
                              <Image
                                src={resolveOrderImage(item.product?.imageUrl)}
                                alt={item.product?.name || 'Product'}
                                fill
                                sizes="64px"
                                className="object-cover"
                                unoptimized={isLocalImage(item.product?.imageUrl)}
                                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                              />
                            </div>
                            <div className="grow min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{item.product?.name || 'Product no longer available'}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                                <span className="bg-gray-50 px-2 py-0.5 rounded-md">Qty: {item.quantity}</span>
                                {item.size && <span className="bg-gray-50 px-2 py-0.5 rounded-md">Size: {item.size}</span>}
                                {item.color && <span className="bg-gray-50 px-2 py-0.5 rounded-md">Color: {item.color}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-sm text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                              <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Review prompt for delivered orders ── */}
                    {od.status === 'DELIVERED' && od.items.some(it => it.product) && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <Star className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="grow">
                            <h4 className="font-semibold text-gray-900 text-sm">How was your order?</h4>
                            <p className="text-xs text-gray-500 mt-0.5 mb-3">Share your experience and help others make informed decisions.</p>
                            <div className="flex flex-wrap gap-2">
                              {od.items.filter(it => it.product).map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setSelectedProductForReview(item.product);
                                    setReviewModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                >
                                  <Star className="w-3 h-3" />
                                  Review {item.product.name.length > 20 ? item.product.name.slice(0, 20) + '...' : item.product.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <Footer />
      {reviewModalOpen && selectedProductForReview && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          product={selectedProductForReview}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
};

export default OrdersPage;
