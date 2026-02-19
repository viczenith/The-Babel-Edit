'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/context/AuthContext';
import { useDebounce } from '@/app/hooks/useDebounce';
import {
  Users, Shield, Lock, Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Trash2, Download, ShieldCheck, ShieldOff, UserCheck, UserX, Globe, Mail,
  Eye, Star, Package, MapPin, X, AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ─────────────────────── Types ─────────────────────── */
interface UserCount { orders: number; reviews: number }

interface ApiUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  isSuspended: boolean;
  googleId?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: UserCount;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UserDetailOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  items: { id: string; quantity: number; price: number; productName: string; productImage: string }[];
}

interface UserDetailAddress {
  id: string;
  type: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

interface UserDetailReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  product: { id: string; name: string; imageUrl: string };
}

interface UserDetail extends ApiUser {
  isPrimary?: boolean;
  orders: UserDetailOrder[];
  addresses: UserDetailAddress[];
  reviews: UserDetailReview[];
  metrics: {
    totalOrders: number;
    totalReviews: number;
    totalWishlistItems: number;
    totalSpent: number;
    avgOrderValue: number;
  };
}

type SortField = 'firstName' | 'email' | 'role' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type DetailTab = 'overview' | 'orders' | 'addresses' | 'reviews';

/* ─────────────────────── Helpers ─────────────────────── */
const formatUserName = (u: ApiUser | UserDetail): string => {
  if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
  if (u.firstName) return u.firstName;
  return u.email.split('@')[0];
};

const getRoleBadge = (role: string) => {
  switch (role?.toUpperCase()) {
    case 'SUPER_ADMIN':
      return { label: 'Super Admin', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
    case 'ADMIN':
      return { label: 'Admin', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
    default:
      return { label: 'Customer', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
  }
};

const formatDate = (d: string): string => {
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
  };
  return map[s?.toUpperCase()] || 'bg-gray-100 text-gray-700';
};

/* ════════════════════ Component ════════════════════ */
const UsersList: React.FC = () => {
  const { user: currentUser } = useAuth();

  /* ── list state ── */
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);

  /* ── filters ── */
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  /* ── action state ── */
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);

  /* ── detail state ── */
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── bulk ── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState('');

  /* ── delete modal ── */
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string } | null>(null);

  /* ── role change confirmation ── */
  const [roleChangeModal, setRoleChangeModal] = useState<{
    userId: string; userName: string; currentRole: string; newRole: string;
  } | null>(null);

  /* ── stats (computed from current page + pagination total) ── */
  const [allUsersForStats, setAllUsersForStats] = useState<ApiUser[]>([]);

  /* ═══════════════ Data fetching ═══════════════ */
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pagination.limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);

      const res = await apiRequest<{ users: ApiUser[]; pagination: Pagination }>(
        `${API_ENDPOINTS.USERS.LIST}?${params.toString()}`,
        { requireAuth: true }
      );
      setUsers(res.users || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, pages: 0 });
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, sortField, sortOrder, pagination.limit]);

  // Fetch stats (all users count by role)
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiRequest<{ users: ApiUser[]; pagination: Pagination }>(
        `${API_ENDPOINTS.USERS.LIST}?limit=999999`,
        { requireAuth: true }
      );
      setAllUsersForStats(res.users || []);
    } catch {
      // silently fail — stats are not critical
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(1); }, [debouncedSearch, roleFilter, sortField, sortOrder]);

  const stats = useMemo(() => {
    const list = allUsersForStats;
    return {
      total: list.length,
      customers: list.filter(u => u.role === 'USER' || !u.role).length,
      admins: list.filter(u => u.role === 'ADMIN').length,
      superAdmins: list.filter(u => u.role === 'SUPER_ADMIN').length,
      suspended: list.filter(u => u.isSuspended).length,
    };
  }, [allUsersForStats]);

  /* ═══════════════ User detail ═══════════════ */
  const toggleDetail = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserDetail(null);
      return;
    }
    setExpandedUserId(userId);
    setDetailTab('overview');
    setDetailLoading(true);
    try {
      const res = await apiRequest<{ user: UserDetail }>(
        API_ENDPOINTS.USERS.BY_ID(userId),
        { requireAuth: true }
      );
      setUserDetail(res.user);
    } catch {
      toast.error('Failed to load user details');
      setExpandedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ═══════════════ Actions ═══════════════ */
  const requestRoleChange = (userId: string, newRole: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === newRole) return;
    const name = formatUserName(user);
    // Always confirm role changes
    setRoleChangeModal({ userId, userName: name, currentRole: user.role, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeModal) return;
    const { userId, newRole } = roleChangeModal;
    setRoleChangeModal(null);
    setActionLoading(p => ({ ...p, [userId]: true }));
    try {
      await apiRequest(API_ENDPOINTS.USERS.UPDATE_ROLE(userId), {
        method: 'PUT',
        body: { role: newRole },
        requireAuth: true,
      });
      toast.success('Role updated');
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role');
    } finally {
      setActionLoading(p => ({ ...p, [userId]: false }));
    }
  };

  const handleToggleSuspend = async (userId: string) => {
    setActionLoading(p => ({ ...p, [`suspend-${userId}`]: true }));
    try {
      const res = await apiRequest<{ isSuspended: boolean }>(
        API_ENDPOINTS.USERS.TOGGLE_SUSPEND(userId),
        { method: 'PATCH', requireAuth: true }
      );
      toast.success(res.isSuspended ? 'User suspended' : 'User unsuspended');
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: res.isSuspended } : u));
      setAllUsersForStats(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: res.isSuspended } : u));
      if (userDetail?.id === userId) setUserDetail(d => d ? { ...d, isSuspended: res.isSuspended } : d);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle suspension');
    } finally {
      setActionLoading(p => ({ ...p, [`suspend-${userId}`]: false }));
    }
  };

  const handleToggleVerify = async (userId: string) => {
    setActionLoading(p => ({ ...p, [`verify-${userId}`]: true }));
    try {
      const res = await apiRequest<{ isVerified: boolean }>(
        API_ENDPOINTS.USERS.TOGGLE_VERIFY(userId),
        { method: 'PATCH', requireAuth: true }
      );
      toast.success(res.isVerified ? 'User verified' : 'User unverified');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: res.isVerified } : u));
      setAllUsersForStats(prev => prev.map(u => u.id === userId ? { ...u, isVerified: res.isVerified } : u));
      if (userDetail?.id === userId) setUserDetail(d => d ? { ...d, isVerified: res.isVerified } : d);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle verification');
    } finally {
      setActionLoading(p => ({ ...p, [`verify-${userId}`]: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(p => ({ ...p, [deleteModal.id]: true }));
    try {
      await apiRequest(API_ENDPOINTS.USERS.DELETE(deleteModal.id), { method: 'DELETE', requireAuth: true });
      toast.success('User deleted');
      setDeleteModal(null);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete user');
    } finally {
      setActionLoading(p => ({ ...p, [deleteModal.id]: false }));
    }
  };

  /* ── Bulk actions ── */
  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkRoleChange = async () => {
    if (!bulkRole || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    let success = 0;
    for (const id of ids) {
      try {
        await apiRequest(API_ENDPOINTS.USERS.UPDATE_ROLE(id), {
          method: 'PUT', body: { role: bulkRole }, requireAuth: true,
        });
        success++;
      } catch { /* skip */ }
    }
    toast.success(`Updated ${success}/${ids.length} users`);
    setSelectedIds(new Set());
    setBulkRole('');
    fetchUsers(pagination.page);
    fetchStats();
  };

  /* ── Export ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all for export
      const res = await apiRequest<{ users: ApiUser[] }>(
        `${API_ENDPOINTS.USERS.LIST}?limit=999999${debouncedSearch ? `&search=${debouncedSearch}` : ''}${roleFilter !== 'all' ? `&role=${roleFilter}` : ''}`,
        { requireAuth: true }
      );
      const data = (res.users || []).map(u => ({
        Name: formatUserName(u),
        Email: u.email,
        Phone: u.phone || '',
        Role: getRoleBadge(u.role).label,
        Verified: u.isVerified ? 'Yes' : 'No',
        Suspended: u.isSuspended ? 'Yes' : 'No',
        'Auth Source': u.googleId ? 'Google' : 'Email',
        Orders: u._count?.orders ?? 0,
        Reviews: u._count?.reviews ?? 0,
        Joined: formatDate(u.createdAt),
        'User ID': u.id,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 32 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, `users-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${data.length} users`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  /* ── Clear filters ── */
  const handleClearFilters = () => {
    setSearchInput('');
    setRoleFilter('all');
    setSortField('createdAt');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchInput || roleFilter !== 'all' || sortField !== 'createdAt' || sortOrder !== 'desc';
  const isSuperAdmin = currentUser?.role?.toUpperCase() === 'SUPER_ADMIN';

  /* ════════════════════ Render ════════════════════ */
  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h2>
        <p className="mt-1 text-sm text-gray-600">Manage users, roles, verification and access control</p>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Users</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-300" />
          </div>
        </div>
        <div className="bg-linear-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Customers</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.customers}</p>
            </div>
            <Users className="w-8 h-8 text-green-300" />
          </div>
        </div>
        <div className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Admins</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{stats.admins}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-300" />
          </div>
        </div>
        <div className="bg-linear-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Super Admins</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{stats.superAdmins}</p>
            </div>
            <Lock className="w-8 h-8 text-amber-300" />
          </div>
        </div>
        <div className="bg-linear-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Suspended</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.suspended}</p>
            </div>
            <UserX className="w-8 h-8 text-red-300" />
          </div>
        </div>
      </div>

      {/* ─── Bulk Actions Bar ─── */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} user(s) selected</span>
          <select
            value={bulkRole}
            onChange={e => setBulkRole(e.target.value)}
            className="text-sm border border-blue-300 rounded px-2 py-1 bg-white"
          >
            <option value="">Change role to...</option>
            <option value="USER">Customer</option>
            <option value="ADMIN">Admin</option>
            {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
          </select>
          <button
            onClick={handleBulkRoleChange}
            disabled={!bulkRole}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Apply
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-blue-600 hover:text-blue-800 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {/* ─── Filters ─── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" /> Filters &amp; Search
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-300 rounded disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name or email..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="USER">Customers</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
          </div>
          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="firstName">Name</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
              <option value="createdAt">Join Date</option>
            </select>
          </div>
          {/* Order */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSortOrder('asc')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium border transition-colors ${
                  sortOrder === 'asc' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {'A \u2192 Z'}
              </button>
              <button
                onClick={() => setSortOrder('desc')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium border transition-colors ${
                  sortOrder === 'desc' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {'Z \u2192 A'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
          Showing <span className="font-semibold text-gray-800">{users.length}</span> of{' '}
          <span className="font-semibold text-gray-800">{pagination.total}</span> users
          {pagination.pages > 1 && <>{' \u00B7 '}Page {pagination.page} of {pagination.pages}</>}
        </div>
      </div>

      {/* ─── Users Table ─── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-3 text-sm text-gray-500">Loading users...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No users found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Checkbox */}
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Activity</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Joined</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => {
                  const badge = getRoleBadge(user.role);
                  const name = formatUserName(user);
                  const isExpanded = expandedUserId === user.id;
                  const isGoogle = !!user.googleId;
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <React.Fragment key={user.id}>
                      {/* ── Main row ── */}
                      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/40' : ''} ${user.isSuspended ? 'opacity-60' : ''}`}>
                        {/* Checkbox */}
                        <td className="pl-4 pr-2 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        {/* User info */}
                        <td className="px-3 py-3">
                          <button onClick={() => toggleDetail(user.id)} className="flex items-center gap-3 text-left w-full group">
                            {/* Avatar */}
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 flex items-center gap-1.5">
                                {name}
                                {isGoogle && <span title="Google account"><Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" /></span>}
                                {!isGoogle && <span title="Email account"><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /></span>}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              {user.phone && <p className="text-xs text-gray-400 truncate">{user.phone}</p>}
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                          </button>
                        </td>

                        {/* Role dropdown */}
                        <td className="px-3 py-3">
                          {isSelf ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={e => requestRoleChange(user.id, e.target.value)}
                              disabled={actionLoading[user.id]}
                              className={`text-xs font-semibold px-2 py-1.5 rounded border ${badge.border} ${badge.bg} ${badge.text} focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer`}
                            >
                              <option value="USER">Customer</option>
                              <option value="ADMIN">Admin</option>
                              {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                            </select>
                          )}
                        </td>

                        {/* Status (verified / suspended) */}
                        <td className="px-3 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            {user.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded" title="Verified">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded" title="Unverified">
                                <ShieldOff className="w-3.5 h-3.5" /> Unverified
                              </span>
                            )}
                            {user.isSuspended && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded" title="Suspended">
                                <UserX className="w-3.5 h-3.5" /> Suspended
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Activity */}
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span className="flex items-center gap-1" title="Orders">
                              <Package className="w-3.5 h-3.5 text-gray-400" /> {user._count?.orders ?? 0}
                            </span>
                            <span className="flex items-center gap-1" title="Reviews">
                              <Star className="w-3.5 h-3.5 text-gray-400" /> {user._count?.reviews ?? 0}
                            </span>
                          </div>
                        </td>

                        {/* Joined */}
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <p className="text-xs text-gray-600">{formatDate(user.createdAt)}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Verify toggle */}
                            <button
                              onClick={() => handleToggleVerify(user.id)}
                              disabled={actionLoading[`verify-${user.id}`]}
                              title={user.isVerified ? 'Unverify user' : 'Verify user'}
                              className={`p-1.5 rounded transition-colors ${
                                user.isVerified
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-400 hover:bg-gray-100'
                              } disabled:opacity-50`}
                            >
                              {user.isVerified ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                            </button>

                            {/* Suspend toggle */}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleSuspend(user.id)}
                                disabled={actionLoading[`suspend-${user.id}`]}
                                title={user.isSuspended ? 'Unsuspend user' : 'Suspend user'}
                                className={`p-1.5 rounded transition-colors ${
                                  user.isSuspended
                                    ? 'text-red-600 hover:bg-red-50'
                                    : 'text-gray-400 hover:bg-gray-100'
                                } disabled:opacity-50`}
                              >
                                {user.isSuspended ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            )}

                            {/* Delete */}
                            {!isSelf && (
                              <button
                                onClick={() => setDeleteModal({ open: true, id: user.id, name })}
                                disabled={actionLoading[user.id]}
                                title="Delete user"
                                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded detail row ── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50/80 px-4 py-4 border-t border-gray-100">
                            {detailLoading ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                              </div>
                            ) : userDetail ? (
                              <div className="space-y-4">
                                {/* Tabs */}
                                <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                                  {([
                                    { key: 'overview' as DetailTab, label: 'Overview', icon: <Eye className="w-3.5 h-3.5" /> },
                                    { key: 'orders' as DetailTab, label: `Orders (${userDetail.metrics.totalOrders})`, icon: <Package className="w-3.5 h-3.5" /> },
                                    { key: 'addresses' as DetailTab, label: `Addresses (${userDetail.addresses?.length || 0})`, icon: <MapPin className="w-3.5 h-3.5" /> },
                                    { key: 'reviews' as DetailTab, label: `Reviews (${userDetail.metrics.totalReviews})`, icon: <Star className="w-3.5 h-3.5" /> },
                                  ]).map(t => (
                                    <button
                                      key={t.key}
                                      onClick={() => setDetailTab(t.key)}
                                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                                        detailTab === t.key
                                          ? 'border-blue-600 text-blue-700'
                                          : 'border-transparent text-gray-500 hover:text-gray-700'
                                      }`}
                                    >
                                      {t.icon} {t.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Tab content */}
                                {detailTab === 'overview' && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Profile info */}
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                                      <h4 className="text-sm font-semibold text-gray-900">Profile</h4>
                                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                                        <span className="text-gray-500">Full Name</span>
                                        <span className="text-gray-900 font-medium">{formatUserName(userDetail)}</span>
                                        <span className="text-gray-500">Email</span>
                                        <span className="text-gray-900 break-all">{userDetail.email}</span>
                                        <span className="text-gray-500">Phone</span>
                                        <span className="text-gray-900">{userDetail.phone || 'Not provided'}</span>
                                        <span className="text-gray-500">Auth Source</span>
                                        <span className="text-gray-900 flex items-center gap-1">
                                          {userDetail.googleId ? <><Globe className="w-3 h-3" /> Google</> : <><Mail className="w-3 h-3" /> Email</>}
                                        </span>
                                        <span className="text-gray-500">Role</span>
                                        <span className={`font-semibold ${getRoleBadge(userDetail.role).text}`}>{getRoleBadge(userDetail.role).label}</span>
                                        <span className="text-gray-500">Verified</span>
                                        <span className={userDetail.isVerified ? 'text-green-700' : 'text-gray-500'}>
                                          {userDetail.isVerified ? 'Yes' : 'No'}
                                        </span>
                                        <span className="text-gray-500">Suspended</span>
                                        <span className={userDetail.isSuspended ? 'text-red-700 font-medium' : 'text-gray-500'}>
                                          {userDetail.isSuspended ? 'Yes' : 'No'}
                                        </span>
                                        <span className="text-gray-500">Joined</span>
                                        <span className="text-gray-900">{formatDate(userDetail.createdAt)}</span>
                                        <span className="text-gray-500">Last Updated</span>
                                        <span className="text-gray-900">{formatDate(userDetail.updatedAt)}</span>
                                      </div>
                                    </div>
                                    {/* Metrics */}
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                                      <h4 className="text-sm font-semibold text-gray-900">Metrics</h4>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-blue-50 rounded-lg p-3">
                                          <p className="text-xs text-blue-600">Total Orders</p>
                                          <p className="text-lg font-bold text-blue-900 mt-0.5">{userDetail.metrics.totalOrders}</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-3">
                                          <p className="text-xs text-purple-600">Total Reviews</p>
                                          <p className="text-lg font-bold text-purple-900 mt-0.5">{userDetail.metrics.totalReviews}</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3">
                                          <p className="text-xs text-green-600">Total Spent</p>
                                          <p className="text-lg font-bold text-green-900 mt-0.5">{formatCurrency(userDetail.metrics.totalSpent)}</p>
                                        </div>
                                        <div className="bg-amber-50 rounded-lg p-3">
                                          <p className="text-xs text-amber-600">Avg Order</p>
                                          <p className="text-lg font-bold text-amber-900 mt-0.5">{formatCurrency(userDetail.metrics.avgOrderValue)}</p>
                                        </div>
                                        <div className="bg-pink-50 rounded-lg p-3 col-span-2">
                                          <p className="text-xs text-pink-600">Wishlist Items</p>
                                          <p className="text-lg font-bold text-pink-900 mt-0.5">{userDetail.metrics.totalWishlistItems}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {detailTab === 'orders' && (
                                  <div className="space-y-2">
                                    {userDetail.orders.length === 0 ? (
                                      <p className="text-sm text-gray-500 text-center py-6">No orders yet</p>
                                    ) : (
                                      userDetail.orders.map(order => (
                                        <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-mono text-gray-600">#{order.orderNumber}</span>
                                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(order.status)}`}>{order.status}</span>
                                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(order.paymentStatus)}`}>{order.paymentStatus}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                              <span>{formatDate(order.createdAt)}</span>
                                              <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span>
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {order.items.map(item => (
                                              <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                                                {item.productImage && (
                                                  <img src={item.productImage} alt="" className="w-6 h-6 rounded object-cover" />
                                                )}
                                                <span className="text-xs text-gray-700">{item.productName}</span>
                                                <span className="text-xs text-gray-500">x{item.quantity}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}

                                {detailTab === 'addresses' && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {userDetail.addresses.length === 0 ? (
                                      <p className="text-sm text-gray-500 text-center py-6 col-span-2">No addresses</p>
                                    ) : (
                                      userDetail.addresses.map(addr => (
                                        <div key={addr.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-900 uppercase">{addr.isDefault ? 'Primary' : 'Address'}</span>
                                            {addr.isDefault && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default</span>}
                                          </div>
                                          <p className="text-xs text-gray-700">
                                            {addr.firstName} {addr.lastName}
                                          </p>
                                          <p className="text-xs text-gray-600">{addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}</p>
                                          <p className="text-xs text-gray-600">{addr.city}, {addr.state} {addr.postalCode}</p>
                                          <p className="text-xs text-gray-600">{addr.country}</p>
                                          {addr.phone && <p className="text-xs text-gray-500">{addr.phone}</p>}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}

                                {detailTab === 'reviews' && (
                                  <div className="space-y-2">
                                    {userDetail.reviews.length === 0 ? (
                                      <p className="text-sm text-gray-500 text-center py-6">No reviews</p>
                                    ) : (
                                      userDetail.reviews.map(review => (
                                        <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-3 flex gap-3">
                                          {review.product?.imageUrl && (
                                            <img src={review.product.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                              <p className="text-xs font-medium text-gray-900 truncate">{review.product?.name || 'Unknown Product'}</p>
                                              <span className="text-xs text-gray-500 shrink-0">{formatDate(review.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-0.5 my-1">
                                              {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                              ))}
                                            </div>
                                            {review.comment && <p className="text-xs text-gray-600 line-clamp-2">{review.comment}</p>}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">Failed to load details</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600">
                Page {pagination.page} of {pagination.pages} {'\u00B7'} {pagination.total} users
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchUsers(1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  First
                </button>
                <button
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchUsers(pageNum)}
                      className={`min-w-7 h-7 rounded text-xs font-medium ${
                        pageNum === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-1.5 rounded text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchUsers(pagination.pages)}
                  disabled={pagination.page === pagination.pages}
                  className="p-1.5 rounded text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Delete Modal ─── */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" /> Delete User
              </h3>
              <button onClick={() => setDeleteModal(null)} className="text-red-400 hover:text-red-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteModal.name}</span>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> This action cannot be undone</p>
                <p>The user account and all associated data will be permanently removed. Consider suspending the user instead if you want to restrict access without data loss.</p>
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  const id = deleteModal.id;
                  setDeleteModal(null);
                  handleToggleSuspend(id);
                }}
                className="px-3 py-1.5 rounded text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100"
              >
                Suspend Instead
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                disabled={actionLoading[deleteModal.id]}
                className="px-3 py-1.5 rounded text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading[deleteModal.id]}
                className="px-3 py-1.5 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {actionLoading[deleteModal.id] ? (
                  <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Role Change Confirmation Modal ─── */}
      {roleChangeModal && (() => {
        const fromBadge = getRoleBadge(roleChangeModal.currentRole);
        const toBadge = getRoleBadge(roleChangeModal.newRole);
        const isPromotion = roleChangeModal.newRole === 'SUPER_ADMIN' || (roleChangeModal.newRole === 'ADMIN' && roleChangeModal.currentRole === 'USER');
        const isDemotion = roleChangeModal.currentRole === 'SUPER_ADMIN' || (roleChangeModal.currentRole === 'ADMIN' && roleChangeModal.newRole === 'USER');

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
              <div className={`${isPromotion ? 'bg-amber-50 border-amber-100' : isDemotion ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'} border-b px-5 py-4 flex items-center justify-between`}>
                <h3 className={`text-base font-bold ${isPromotion ? 'text-amber-900' : isDemotion ? 'text-orange-900' : 'text-blue-900'} flex items-center gap-2`}>
                  <Shield className={`w-5 h-5 ${isPromotion ? 'text-amber-600' : isDemotion ? 'text-orange-600' : 'text-blue-600'}`} />
                  Confirm Role Change
                </h3>
                <button onClick={() => setRoleChangeModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-gray-700">
                  Change <span className="font-semibold text-gray-900">{roleChangeModal.userName}</span>&apos;s role:
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className={`px-3 py-1.5 rounded text-xs font-semibold ${fromBadge.bg} ${fromBadge.text}`}>{fromBadge.label}</span>
                  <span className="text-gray-400">{'\u2192'}</span>
                  <span className={`px-3 py-1.5 rounded text-xs font-semibold ${toBadge.bg} ${toBadge.text}`}>{toBadge.label}</span>
                </div>
                {isPromotion && roleChangeModal.newRole === 'SUPER_ADMIN' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Critical Elevation</p>
                    <p>Super Admins have <strong>full system access</strong> including user management, audit logs, and system settings. Only grant this to fully trusted personnel.</p>
                  </div>
                )}
                {isPromotion && roleChangeModal.newRole === 'ADMIN' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Privilege Elevation</p>
                    <p>Admins can manage products, orders, reviews, and collections. Ensure this user is a trusted team member.</p>
                  </div>
                )}
                {isDemotion && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Privilege Removal</p>
                    <p>This user will immediately lose all admin capabilities and can only access customer features.</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
                <button
                  onClick={() => setRoleChangeModal(null)}
                  className="px-3 py-1.5 rounded text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleChange}
                  className={`px-3 py-1.5 rounded text-sm font-medium text-white inline-flex items-center gap-1.5 ${
                    isPromotion && roleChangeModal.newRole === 'SUPER_ADMIN'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" /> Confirm Change
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default UsersList;
