"use client";
import React, { useState, useEffect, useMemo } from 'react';
import AdminProtectedRoute from '@/app/components/AdminProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import UsersList from '@/app/[locale]/admin/components/UsersList';
import AuditLogs from '@/app/[locale]/admin/superadmin/components/AuditLogs';
import SectionNav from './components/SectionNav';
import PanelHeader from './components/PanelHeader';
import {
  SettingsPanelEnhanced as SettingsPanel,
} from './components/Panels';
import {
  AlertCircle, TrendingUp, Users, ShoppingCart, Package, DollarSign,
  Activity, BarChart3, RefreshCw, Shield, Clock, ArrowRight, Star,
  MessageSquare, CheckCircle, AlertTriangle, Plus, Database, Server, Zap, Eye
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Section =
  | 'overview'
  | 'users'
  | 'audit'
  | 'settings';

const SuperAdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [section, setSection] = useState<Section>('overview');
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Overview Analytics State — raw data + period toggle
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [rawUsers, setRawUsers] = useState<any[]>([]);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [rawCollections, setRawCollections] = useState<any[]>([]);
  const [auditStats, setAuditStats] = useState<{ total: number; today: number; thisWeek: number; thisMonth: number; thisYear: number } | null>(null);
  const [rawReviews, setRawReviews] = useState<any[]>([]);
  const [rawFeedbacks, setRawFeedbacks] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ ok: boolean; details?: any } | null>(null);
  const [overviewPeriod, setOverviewPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'lifetime'>('month');

  React.useEffect(() => {
    const el = document.getElementById('superadmin-header');
    const update = () => setHeaderHeight(el ? Math.ceil(el.getBoundingClientRect().height) : 0);

    update();

    let ro: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    }

    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      if (ro && el) ro.unobserve(el);
    };
  }, []);

  // Fetch raw data — all computation done in useMemo
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [usersRes, ordersRes, productsRes, collectionsRes, auditRes, healthRes, reviewsRes, feedbacksRes] = await Promise.all([
        apiRequest(`${API_ENDPOINTS.USERS?.LIST || '/auth/admin/users'}?limit=999999`, { requireAuth: true }).catch(() => ({ users: [] })),
        apiRequest(`${API_ENDPOINTS.ORDERS?.ADMIN?.LIST || '/orders/admin/all'}?limit=999999`, { requireAuth: true }).catch(() => ({ orders: [] })),
        apiRequest(`${API_ENDPOINTS.PRODUCTS?.ADMIN?.LIST || '/admin/products'}?limit=999999`, { requireAuth: true }).catch(() => ({ products: [] })),
        apiRequest(API_ENDPOINTS.COLLECTIONS?.LIST || '/collections', { requireAuth: true }).catch(() => ({ collections: [] })),
        apiRequest('/admin/audit-logs/stats', { requireAuth: true }).catch(() => ({ total: 0, today: 0, thisWeek: 0, thisMonth: 0 })),
        apiRequest('/health').catch(() => ({ status: 'ERROR' })),
        apiRequest(API_ENDPOINTS.REVIEWS?.LIST || '/reviews', { requireAuth: true }).catch(() => []),
        apiRequest(API_ENDPOINTS.FEEDBACK?.LIST || '/feedback', { requireAuth: true }).catch(() => []),
      ]);
      setRawUsers(usersRes.users || []);
      setRawOrders(ordersRes.orders || []);
      setRawProducts(productsRes.products || []);
      setRawCollections(collectionsRes.collections || []);
      setAuditStats(auditRes || { total: 0, today: 0, thisWeek: 0, thisMonth: 0 });
      // Health returns { status: 'OK' } not { ok: true }
      setSystemHealth({ ok: healthRes?.status === 'OK', details: healthRes });
      // Reviews & Feedback return bare arrays, not wrapped objects
      setRawReviews(Array.isArray(reviewsRes) ? reviewsRes : (reviewsRes.reviews || []));
      setRawFeedbacks(Array.isArray(feedbacksRes) ? feedbacksRes : (feedbacksRes.feedbacks || feedbacksRes.feedback || []));
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'overview') fetchAnalytics();
  }, [section]);

  // ── Period-aware computed metrics ──
  const overviewMetrics = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const periodStart = overviewPeriod === 'today' ? startOfDay
      : overviewPeriod === 'week' ? startOfWeek
      : overviewPeriod === 'month' ? startOfMonth
      : overviewPeriod === 'year' ? startOfYear
      : new Date(0); // lifetime

    const inPeriod = (dateStr: string) => new Date(dateStr) >= periodStart;

    // Orders
    const periodOrders = rawOrders.filter(o => inPeriod(o.createdAt));
    const completedPeriod = periodOrders.filter(o => o.status !== 'CANCELLED');
    const periodRevenue = completedPeriod.reduce((s, o) => s + (o.total || 0), 0);
    const periodOrderCount = periodOrders.length;
    const periodAOV = completedPeriod.length > 0 ? periodRevenue / completedPeriod.length : 0;

    // Unique customers in period
    const customerEmails = new Set(periodOrders.map(o => o.user?.email || o.userId).filter(Boolean));
    const periodCustomers = customerEmails.size;

    // Order status breakdown
    const breakdown: Record<string, number> = {};
    periodOrders.forEach(o => { const s = o.status || 'UNKNOWN'; breakdown[s] = (breakdown[s] || 0) + 1; });

    // Always-current stats
    const pendingOrders = rawOrders.filter(o => o.status === 'PENDING').length;
    const totalUsers = rawUsers.length;
    const adminCount = rawUsers.filter(u => ['ADMIN', 'SUPER_ADMIN'].includes(u.role)).length;
    const superAdminCount = rawUsers.filter(u => u.role === 'SUPER_ADMIN').length;
    const customerUserCount = rawUsers.filter(u => u.role === 'USER' || !u.role).length;
    const totalProducts = rawProducts.length;
    const activeProducts = rawProducts.filter(p => p.isActive).length;
    const lowStock = rawProducts.filter(p => p.stock < 10 && p.isActive).sort((a, b) => a.stock - b.stock).slice(0, 8);
    const totalCollections = rawCollections.length;

    // Audit logs from stats endpoint
    const periodAuditCount = overviewPeriod === 'today' ? (auditStats?.today || 0)
      : overviewPeriod === 'week' ? (auditStats?.thisWeek || 0)
      : overviewPeriod === 'month' ? (auditStats?.thisMonth || 0)
      : overviewPeriod === 'year' ? (auditStats?.thisYear || 0)
      : (auditStats?.total || 0);

    // Top customers in period
    const custMap: Record<string, { email: string; name: string; spent: number; orders: number }> = {};
    periodOrders.forEach(o => {
      const email = o.user?.email || 'Guest';
      const name = o.user?.firstName ? `${o.user.firstName} ${o.user.lastName || ''}`.trim() : email;
      if (!custMap[email]) custMap[email] = { email, name, spent: 0, orders: 0 };
      custMap[email].spent += o.total || 0;
      custMap[email].orders += 1;
    });
    const topCustomers = Object.values(custMap).sort((a, b) => b.spent - a.spent).slice(0, 5);

    // Top products by revenue in period
    const prodMap: Record<string, { product: any; quantity: number; revenue: number }> = {};
    periodOrders.forEach(o => {
      (o.items || []).forEach((item: any) => {
        // Admin orders may have productId at item level or nested under item.product.id
        const pid = item.productId || item.product?.id;
        if (pid) {
          if (!prodMap[pid]) {
            const prod = rawProducts.find(p => p.id === pid) || item.product || {};
            prodMap[pid] = { product: { id: pid, name: prod.name || 'Unknown', ...prod }, quantity: 0, revenue: 0 };
          }
          prodMap[pid].quantity += item.quantity || 1;
          prodMap[pid].revenue += (item.price || 0) * (item.quantity || 1);
        }
      });
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      .map(p => ({ ...p.product, revenue: p.revenue, quantity: p.quantity }));

    // Recent orders in period
    const recentOrders = [...periodOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    // Reviews & Feedback in period
    const periodReviewCount = rawReviews.filter(r => inPeriod(r.createdAt)).length;
    const periodFeedbackCount = rawFeedbacks.filter(f => inPeriod(f.createdAt)).length;
    const unresolvedFeedback = rawFeedbacks.filter(f => !f.isResolved && !f.resolved).length;

    // Conversion rate
    const conversionRate = totalUsers > 0 ? (periodCustomers / totalUsers * 100) : 0;

    return {
      periodRevenue, periodOrderCount, periodCustomers, periodAOV,
      breakdown, pendingOrders,
      totalUsers, adminCount, superAdminCount, customerUserCount,
      totalProducts, activeProducts, lowStock, totalCollections,
      periodAuditCount, totalAuditLogs: auditStats?.total || 0,
      topCustomers, topProducts, recentOrders,
      conversionRate,
      periodReviewCount, periodFeedbackCount, unresolvedFeedback,
    };
  }, [rawUsers, rawOrders, rawProducts, rawCollections, auditStats, rawReviews, rawFeedbacks, overviewPeriod]);

  const periodLabel = overviewPeriod === 'today' ? "Today's"
    : overviewPeriod === 'week' ? "This Week's"
    : overviewPeriod === 'month' ? "This Month's"
    : overviewPeriod === 'year' ? "This Year's"
    : "Lifetime";

  return (
    <AdminProtectedRoute>
      <header id="superadmin-header" className="fixed top-0 left-0 right-0 z-50 w-full p-6 bg-white shadow">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Super Admin Console</h1>
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
        <SectionNav active={section} onChange={setSection} headerId="superadmin-header" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-3 sm:p-6" style={{ scrollPaddingTop: typeof headerHeight === 'number' ? `${headerHeight + 24}px` : undefined }}>
          <section>
            {section === 'overview' && (
              <div className="p-3 sm:p-6">
                {/* Header with Period Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">System Overview</h2>
                    <p className="text-sm text-gray-500 mt-1">Real-time business intelligence & system health</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['today', 'week', 'month', 'year', 'lifetime'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setOverviewPeriod(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          overviewPeriod === p
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Lifetime'}
                      </button>
                    ))}
                    <button onClick={() => fetchAnalytics()} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors ml-1" title="Refresh">
                      <RefreshCw className={`w-4 h-4 text-gray-500 ${analyticsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading analytics...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* 4 Primary Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 font-medium">{periodLabel} Orders</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{overviewMetrics.periodOrderCount}</p>
                      </div>

                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                          </div>
                        </div>
                        <p className="text-xs text-emerald-600 font-medium">{periodLabel} Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(overviewMetrics.periodRevenue)}</p>
                      </div>

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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <button onClick={() => setSection('users')} className="p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all text-left">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Users</p>
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.totalUsers}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{overviewMetrics.adminCount} admins &middot; {overviewMetrics.superAdminCount} super</p>
                      </button>
                      <div className="p-3 rounded-xl border border-gray-200 bg-white text-left">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Products</p>
                          <Package className="w-3.5 h-3.5 text-orange-400" />
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.activeProducts}<span className="text-xs font-normal text-gray-400">/{overviewMetrics.totalProducts}</span></p>
                        <p className="text-[10px] text-gray-400 mt-0.5">active &middot; {overviewMetrics.totalCollections} collections</p>
                      </div>
                      <div className={`p-3 rounded-xl border transition-all text-left ${overviewMetrics.pendingOrders > 0 ? 'border-yellow-200 bg-yellow-50/60' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Pending Orders</p>
                          {overviewMetrics.pendingOrders > 0 && <Clock className="w-3.5 h-3.5 text-yellow-500" />}
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.pendingOrders}</p>
                        {overviewMetrics.pendingOrders > 0 && <p className="text-[10px] text-yellow-600 font-medium mt-0.5">Needs action</p>}
                      </div>
                      <div className={`p-3 rounded-xl border transition-all text-left ${overviewMetrics.lowStock.length > 0 ? 'border-red-200 bg-red-50/60' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Low Stock</p>
                          <AlertTriangle className={`w-3.5 h-3.5 ${overviewMetrics.lowStock.length > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.lowStock.length}</p>
                        {overviewMetrics.lowStock.length > 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">Items at risk</p>}
                      </div>
                      <div className="p-3 rounded-xl border border-gray-200 bg-white text-left">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Reviews</p>
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.periodReviewCount}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">in period</p>
                      </div>
                      <div className={`p-3 rounded-xl border transition-all text-left ${overviewMetrics.unresolvedFeedback > 0 ? 'border-red-200 bg-red-50/60' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Feedback</p>
                          <MessageSquare className={`w-3.5 h-3.5 ${overviewMetrics.unresolvedFeedback > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-1">{overviewMetrics.periodFeedbackCount}</p>
                        {overviewMetrics.unresolvedFeedback > 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">{overviewMetrics.unresolvedFeedback} unresolved</p>}
                      </div>
                    </div>

                    {/* System Health & Order Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* System Health */}
                      <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-600" />
                          System Health
                        </h3>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full ${systemHealth?.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="text-sm text-gray-700 font-medium">API Server</span>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${systemHealth?.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {systemHealth?.ok ? 'Operational' : 'Offline'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full ${systemHealth?.ok ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                              <span className="text-sm text-gray-700 font-medium">Database</span>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${systemHealth?.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {systemHealth?.ok ? 'Connected' : 'Recovering'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-sm text-gray-700 font-medium">Audit Trail</span>
                            </div>
                            <span className="text-xs font-semibold text-gray-600">{overviewMetrics.periodAuditCount} <span className="text-gray-400">/ {overviewMetrics.totalAuditLogs} total</span></span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              <span className="text-sm text-gray-700 font-medium">Conversion Rate</span>
                            </div>
                            <span className="text-xs font-semibold text-gray-900">{overviewMetrics.conversionRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Order Status Breakdown */}
                      <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900">{periodLabel} Order Status</h3>
                        </div>
                        {Object.keys(overviewMetrics.breakdown).length > 0 ? (
                          <div className="space-y-2.5">
                            {Object.entries(overviewMetrics.breakdown).map(([status, count]) => {
                              const total = Object.values(overviewMetrics.breakdown).reduce((a, b) => a + b, 1);
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
                    </div>

                    {/* Top Customers & Top Products */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Top Customers */}
                      <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            {periodLabel} Top Customers
                          </h3>
                          <button onClick={() => setSection('users')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            All users <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        {overviewMetrics.topCustomers.length > 0 ? (
                          <div className="space-y-2">
                            {overviewMetrics.topCustomers.map((customer, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-colors">
                                <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                  idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{customer.email} &middot; {customer.orders} orders</p>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 shrink-0">{formatCurrency(customer.spent)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No customer activity in this period</p>
                          </div>
                        )}
                      </div>

                      {/* Top Products */}
                      <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            {periodLabel} Top Products
                          </h3>
                        </div>
                        {overviewMetrics.topProducts.length > 0 ? (
                          <div className="space-y-2">
                            {overviewMetrics.topProducts.map((product, idx) => (
                              <div key={product.id || idx} className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-colors">
                                <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                  idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                  <p className="text-[10px] text-gray-400">{product.quantity || 0} units sold</p>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 shrink-0">{formatCurrency(product.revenue || 0)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No sales data in this period</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Low Stock & Recent Orders */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Low Stock Alert */}
                      <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Low Stock Alert
                          </h3>
                        </div>
                        {overviewMetrics.lowStock.length > 0 ? (
                          <div className="space-y-2">
                            {overviewMetrics.lowStock.map((product) => (
                              <div key={product.id} className="flex items-center justify-between p-2.5 bg-red-50/60 border border-red-100 rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{product.collection?.name || '\u2014'}</p>
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

                      {/* Recent Orders */}
                      <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            {periodLabel} Recent Orders
                          </h3>
                        </div>
                        {overviewMetrics.recentOrders.length > 0 ? (
                          <div className="space-y-2">
                            {overviewMetrics.recentOrders.map((order) => {
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
                                      <p className="text-xs font-mono text-gray-500">#{order.orderNumber || order.id?.slice(0, 8)}</p>
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

                    {/* Quick Actions */}
                    <div className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-white">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button onClick={() => setSection('users')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Users</p>
                            <p className="text-[10px] text-gray-400">Manage accounts</p>
                          </div>
                        </button>
                        <button onClick={() => setSection('audit')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                            <Eye className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Audit Logs</p>
                            <p className="text-[10px] text-gray-400">Review activity</p>
                          </div>
                        </button>
                        <button onClick={() => setSection('settings')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Settings</p>
                            <p className="text-[10px] text-gray-400">Configuration</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {section === 'users' && <UsersList />}
            {section === 'audit' && <AuditLogs />}
            {section === 'settings' && <SettingsPanel />}
          </section>
        </main>
      </div>
    </AdminProtectedRoute>
  );
};

export default SuperAdminPage;
