'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  Package,
  Users,
  Zap,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Lock,
  LogOut,
  LogIn,
  Plus,
  RefreshCw,
  Calendar,
  Globe,
  Monitor,
  X,
  ChevronsLeft,
  ChevronsRight,
  ShoppingCart,
  Heart,
  MapPin,
  Star,
  MessageSquare,
  Key,
  UserPlus,
  ArrowUpDown,
} from 'lucide-react';
import { apiRequest } from '@/app/lib/api';

// ── Types ──
interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: Record<string, any> | null;
  previousValues: Record<string, any> | null;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  severity: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface FilterOption {
  value: string;
  count: number;
}

interface Stats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  bySeverity: Record<string, number>;
  topUsers: { email: string; count: number }[];
  topActions: { action: string; count: number }[];
}

// ── Helpers ──
const formatAction = (action: string) =>
  action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const getActionIcon = (action: string) => {
  if (action.includes('register') || action.includes('user_register')) return <UserPlus className="w-4.5 h-4.5 text-emerald-600" />;
  if (action.includes('login')) return <LogIn className="w-4.5 h-4.5 text-green-600" />;
  if (action.includes('logout')) return <LogOut className="w-4.5 h-4.5 text-gray-500" />;
  if (action.includes('create') || action.includes('add')) return <Plus className="w-4.5 h-4.5 text-blue-600" />;
  if (action.includes('update') || action.includes('change') || action.includes('set_default') || action.includes('confirm')) return <Edit className="w-4.5 h-4.5 text-amber-600" />;
  if (action.includes('delete') || action.includes('revoke') || action.includes('hard_delete') || action.includes('clear') || action.includes('remove')) return <Trash2 className="w-4.5 h-4.5 text-red-600" />;
  if (action.includes('reset') || action.includes('password')) return <Key className="w-4.5 h-4.5 text-orange-600" />;
  if (action.includes('move') || action.includes('cart')) return <ShoppingCart className="w-4.5 h-4.5 text-cyan-600" />;
  if (action.includes('wishlist')) return <Heart className="w-4.5 h-4.5 text-pink-600" />;
  if (action.includes('review') || action.includes('testimonial')) return <Star className="w-4.5 h-4.5 text-yellow-600" />;
  if (action.includes('feedback')) return <MessageSquare className="w-4.5 h-4.5 text-violet-600" />;
  if (action.includes('address')) return <MapPin className="w-4.5 h-4.5 text-teal-600" />;
  if (action.includes('redeem') || action.includes('token')) return <Key className="w-4.5 h-4.5 text-purple-600" />;
  if (action.includes('payment') || action.includes('webhook')) return <Zap className="w-4.5 h-4.5 text-yellow-500" />;
  return <Activity className="w-4.5 h-4.5 text-gray-500" />;
};

const getResourceIcon = (resource: string | null) => {
  if (!resource) return <Activity className="w-3.5 h-3.5" />;
  const r = resource.toLowerCase();
  if (r.includes('product') || r.includes('category') || r.includes('type')) return <Package className="w-3.5 h-3.5" />;
  if (r.includes('user') || r.includes('auth')) return <Users className="w-3.5 h-3.5" />;
  if (r.includes('order')) return <ShoppingCart className="w-3.5 h-3.5" />;
  if (r.includes('token')) return <Lock className="w-3.5 h-3.5" />;
  if (r.includes('wishlist')) return <Heart className="w-3.5 h-3.5" />;
  if (r.includes('cart')) return <ShoppingCart className="w-3.5 h-3.5" />;
  if (r.includes('address')) return <MapPin className="w-3.5 h-3.5" />;
  if (r.includes('review')) return <Star className="w-3.5 h-3.5" />;
  if (r.includes('feedback')) return <MessageSquare className="w-3.5 h-3.5" />;
  if (r.includes('collection')) return <Package className="w-3.5 h-3.5" />;
  if (r.includes('dashboard') || r.includes('config')) return <Monitor className="w-3.5 h-3.5" />;
  if (r.includes('payment')) return <Zap className="w-3.5 h-3.5" />;
  return <Zap className="w-3.5 h-3.5" />;
};

const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case 'critical': return { badge: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" /> };
    case 'warning': return { badge: 'bg-amber-100 text-amber-800', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> };
    default: return { badge: 'bg-blue-50 text-blue-700', icon: <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> };
  }
};

const getActionBorderColor = (action: string) => {
  if (action.includes('delete') || action.includes('revoke') || action.includes('hard_delete')) return 'border-l-red-400';
  if (action.includes('create') || action.includes('add') || action.includes('register')) return 'border-l-blue-400';
  if (action.includes('update') || action.includes('change') || action.includes('confirm')) return 'border-l-amber-400';
  if (action.includes('login') || action.includes('redeem')) return 'border-l-green-400';
  if (action.includes('logout')) return 'border-l-gray-400';
  if (action.includes('reset') || action.includes('password')) return 'border-l-orange-400';
  return 'border-l-gray-300';
};

const getActionBadgeColor = (action: string) => {
  if (action.includes('delete') || action.includes('revoke') || action.includes('hard_delete') || action.includes('clear') || action.includes('remove')) return 'bg-red-100 text-red-700';
  if (action.includes('create') || action.includes('add') || action.includes('register')) return 'bg-blue-100 text-blue-700';
  if (action.includes('update') || action.includes('change') || action.includes('set_default') || action.includes('confirm')) return 'bg-amber-100 text-amber-700';
  if (action.includes('login') || action.includes('redeem')) return 'bg-green-100 text-green-700';
  if (action.includes('logout')) return 'bg-gray-100 text-gray-700';
  if (action.includes('reset') || action.includes('password')) return 'bg-orange-100 text-orange-700';
  if (action.includes('move')) return 'bg-cyan-100 text-cyan-700';
  return 'bg-gray-100 text-gray-700';
};

// ── Component ──
const AuditLogs: React.FC = () => {
  // Data
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, pages: 0 });
  const [filterOptions, setFilterOptions] = useState<{ actions: FilterOption[]; resources: FilterOption[]; severities: FilterOption[] }>({ actions: [], resources: [], severities: [] });
  const [stats, setStats] = useState<Stats | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters (server-side)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'action' | 'resource' | 'severity'>('createdAt');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  // ── Fetch logs (server-side paginated) ──
  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (resourceFilter !== 'all') params.set('resource', resourceFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await apiRequest(`/admin/audit-logs?${params.toString()}`, { requireAuth: true });
      setLogs(res.logs || []);
      setPagination(res.pagination || { page: 1, limit: 30, total: 0, pages: 0 });
      setFilterOptions(res.filters || { actions: [], resources: [], severities: [] });
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
      if (!silent) setError('Failed to load audit logs. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, sortBy, sortDir, actionFilter, resourceFilter, severityFilter, debouncedSearch, startDate, endDate]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiRequest('/admin/audit-logs/stats', { requireAuth: true });
      setStats(res);
    } catch {
      // Stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial load + re-fetch on filter changes
  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Auto-refresh polling (every 15 seconds)
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { fetchLogs(true); fetchStats(); }, 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs, fetchStats]);

  // ── Export ──
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (resourceFilter !== 'all') params.set('resource', resourceFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch(`${baseUrl}/api/admin/audit-logs/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // ── Clear filters ──
  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setActionFilter('all');
    setResourceFilter('all');
    setSeverityFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortDir('desc');
    setPage(1);
  };

  const hasActiveFilters = search || actionFilter !== 'all' || resourceFilter !== 'all' || severityFilter !== 'all' || startDate || endDate;

  // ── Migrate old logs (one-time) ──
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const res = await apiRequest('/admin/audit-logs/migrate', { method: 'POST', requireAuth: true });
      setMigrateResult(res.message || 'Migration complete');
      if (res.migrated > 0) { fetchLogs(); fetchStats(); }
    } catch (err: any) {
      setMigrateResult(err?.message || 'Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor all system activities, admin actions, and security events
            {pagination.total > 0 && <span className="ml-1 text-gray-400">• {pagination.total.toLocaleString()} total entries</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${autoRefresh ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Auto'}
          </button>
          {/* Refresh */}
          <button
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {/* Export dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition">
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-35">
              <button onClick={() => handleExport('csv')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-t-lg">Export CSV</button>
              <button onClick={() => handleExport('json')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-b-lg">Export JSON</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Statistics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Total Entries</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{statsLoading ? '...' : (stats?.total || 0).toLocaleString()}</p>
            </div>
            <Activity className="w-8 h-8 text-indigo-400 opacity-40" />
          </div>
        </div>
        <div className="bg-linear-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Today</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{statsLoading ? '...' : (stats?.today || 0).toLocaleString()}</p>
            </div>
            <Clock className="w-8 h-8 text-green-400 opacity-40" />
          </div>
        </div>
        <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">This Week</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{statsLoading ? '...' : (stats?.thisWeek || 0).toLocaleString()}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-400 opacity-40" />
          </div>
        </div>
        <div className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Top Actions</p>
          <div className="mt-2 space-y-1">
            {stats?.topActions?.slice(0, 3).map(a => (
              <div key={a.action} className="text-xs flex justify-between">
                <span className="text-purple-800 truncate">{formatAction(a.action)}</span>
                <span className="font-bold text-purple-900 ml-2">{a.count}</span>
              </div>
            )) || <p className="text-xs text-purple-400 mt-1">{statsLoading ? '...' : 'No data'}</p>}
          </div>
        </div>
      </div>

      {/* ── Severity Summary ── */}
      {stats && (stats.bySeverity?.critical > 0 || stats.bySeverity?.warning > 0) && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-amber-800">
            {stats.bySeverity?.critical > 0 && <span className="font-semibold text-red-700">{stats.bySeverity.critical} critical</span>}
            {stats.bySeverity?.critical > 0 && stats.bySeverity?.warning > 0 && ' and '}
            {stats.bySeverity?.warning > 0 && <span className="font-semibold text-amber-700">{stats.bySeverity.warning} warning</span>}
            {' '}events recorded
          </span>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4.5 h-4.5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Filters & Search</h3>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              <X className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions, users, resources, IP addresses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50"
          />
          {search && (
            <button onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="absolute right-3 top-2.5">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Filter grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Action */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Actions</option>
              {filterOptions.actions.map(a => (
                <option key={a.value} value={a.value}>{formatAction(a.value)} ({a.count})</option>
              ))}
            </select>
          </div>

          {/* Resource */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Resource</label>
            <select
              value={resourceFilter}
              onChange={e => { setResourceFilter(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Resources</option>
              {filterOptions.resources.map(r => (
                <option key={r.value} value={r.value}>{r.value} ({r.count})</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Severities</option>
              {filterOptions.severities.map(s => (
                <option key={s.value} value={s.value}>{s.value.charAt(0).toUpperCase() + s.value.slice(1)} ({s.count})</option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* End date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="createdAt">Date</option>
                <option value="action">Action</option>
                <option value="severity">Severity</option>
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-700">{logs.length}</span> of{' '}
            <span className="font-semibold text-gray-700">{pagination.total.toLocaleString()}</span> entries
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      </div>

      {/* ── Logs Timeline ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 mt-4 text-sm">Loading audit logs...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => fetchLogs()}
              className="mt-3 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-1">
              {hasActiveFilters ? 'Try adjusting your filters' : 'System events will appear here as they occur'}
            </p>
            {pagination.total === 0 && (
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="mt-4 px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition disabled:opacity-50"
              >
                {migrating ? 'Migrating...' : 'Import Legacy Logs'}
              </button>
            )}
            {migrateResult && <p className="mt-2 text-xs text-gray-500">{migrateResult}</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map(log => {
              const severity = getSeverityStyle(log.severity);
              const isExpanded = expandedId === log.id;

              return (
                <div key={log.id} className={`border-l-4 ${getActionBorderColor(log.action)} transition-colors hover:bg-gray-50/50`}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 shrink-0">{getActionIcon(log.action)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                              {formatAction(log.action)}
                            </span>
                            {log.resource && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                {getResourceIcon(log.resource)}
                                {log.resource}
                              </span>
                            )}
                            {log.severity !== 'info' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${severity.badge}`}>
                                {severity.icon}
                                {log.severity}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{log.userEmail || log.userId || 'System'}</span>
                            {log.userRole && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{log.userRole === 'USER' ? 'CUSTOMER' : log.userRole}</span>
                              </>
                            )}
                            {log.resourceId && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="font-mono text-gray-400 text-[10px]">{log.resourceId.length > 12 ? log.resourceId.slice(0, 12) + '...' : log.resourceId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-600 font-medium whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* ── Expanded Details ── */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                        {/* Details grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Action details */}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Details</h4>
                              <div className="space-y-1.5">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <div key={key} className="flex items-start gap-2 text-xs">
                                    <span className="text-gray-500 font-medium min-w-20">{key}:</span>
                                    <span className="text-gray-800 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 break-all">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Previous values (diff) */}
                          {log.previousValues && Object.keys(log.previousValues).length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Previous Values</h4>
                              <div className="space-y-1.5">
                                {Object.entries(log.previousValues).map(([key, value]) => (
                                  <div key={key} className="flex items-start gap-2 text-xs">
                                    <span className="text-amber-600 font-medium min-w-20">{key}:</span>
                                    <span className="text-amber-800 font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 break-all">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!log.details && !log.previousValues && (
                            <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                              <p className="text-xs text-gray-400 italic">No additional details</p>
                            </div>
                          )}
                        </div>

                        {/* Meta info row */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                          <span className="font-mono">ID: {log.id}</span>
                          {log.ipAddress && (
                            <span className="inline-flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {log.ipAddress}
                            </span>
                          )}
                          {log.userAgent && (
                            <span className="inline-flex items-center gap-1 max-w-75 truncate">
                              <Monitor className="w-3 h-3 shrink-0" />
                              {log.userAgent.substring(0, 80)}{log.userAgent.length > 80 ? '...' : ''}
                            </span>
                          )}
                          <span className="sm:hidden">
                            {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {/* Page numbers */}
              {(() => {
                const pages: number[] = [];
                const total = pagination.pages;
                const current = pagination.page;
                const start = Math.max(1, current - 2);
                const end = Math.min(total, current + 2);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition ${p === current ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    {p}
                  </button>
                ));
              })()}

              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={pagination.page === pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Top Users (from stats) ── */}
      {stats?.topUsers && stats.topUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Most Active Users</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {stats.topUsers.map((u, i) => (
              <div key={u.email} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-indigo-400'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{u.email}</p>
                  <p className="text-[10px] text-gray-500">{u.count} actions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
