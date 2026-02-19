'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { Trash2, Check, Star, Search, X, RefreshCw, MessageSquare, AlertCircle, Bug, Lightbulb, HelpCircle, Filter, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface FeedbackUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Feedback {
  id: string;
  userId?: string;
  user?: FeedbackUser | null;
  type: 'GENERAL' | 'BUG' | 'SUGGESTION' | 'OTHER';
  message: string;
  pageUrl?: string;
  isResolved: boolean;
  isFeatured: boolean;
  createdAt: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; bg: string; text: string; dot: string }> = {
  GENERAL: { label: 'General', icon: MessageSquare, bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  BUG: { label: 'Bug Report', icon: Bug, bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  SUGGESTION: { label: 'Suggestion', icon: Lightbulb, bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  OTHER: { label: 'Other', icon: HelpCircle, bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
};

export default function FeedbacksManager() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [k: string]: boolean }>({});

  // Search & filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'not-featured'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Expanded feedback
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>(API_ENDPOINTS.FEEDBACK.LIST + '?limit=999999', { requireAuth: true });
      setFeedbacks(Array.isArray(res) ? res : (res?.feedbacks || []));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load feedback');
    } finally { setLoading(false); }
  };

  const toggleFeature = async (fb: Feedback) => {
    setActionLoading(s => ({ ...s, [`f-${fb.id}`]: true }));
    try {
      await apiRequest(API_ENDPOINTS.FEEDBACK.UPDATE(fb.id), { method: 'PUT', body: { isFeatured: !fb.isFeatured }, requireAuth: true });
      toast.success(fb.isFeatured ? 'Removed from featured' : 'Added to featured');
      await fetchList();
    } catch (err) {
      console.error(err);
      toast.error('Action failed');
    } finally { setActionLoading(s => ({ ...s, [`f-${fb.id}`]: false })); }
  };

  const markResolved = async (fb: Feedback) => {
    setActionLoading(s => ({ ...s, [`r-${fb.id}`]: true }));
    try {
      await apiRequest(API_ENDPOINTS.FEEDBACK.UPDATE(fb.id), { method: 'PUT', body: { isResolved: !fb.isResolved }, requireAuth: true });
      toast.success(fb.isResolved ? 'Marked unresolved' : 'Marked resolved');
      await fetchList();
    } catch (err) { toast.error('Failed'); } finally { setActionLoading(s => ({ ...s, [`r-${fb.id}`]: false })); }
  };

  const deleteFeedback = async (id: string) => {
    setActionLoading(s => ({ ...s, [`d-${id}`]: true }));
    try {
      await apiRequest(API_ENDPOINTS.FEEDBACK.DELETE(id), { method: 'DELETE', requireAuth: true });
      toast.success('Feedback deleted');
      setDeleteConfirm(null);
      await fetchList();
    } catch (err) { toast.error('Failed to delete'); } finally { setActionLoading(s => ({ ...s, [`d-${id}`]: false })); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const unresolved = feedbacks.filter(f => !f.isResolved).length;
    const resolved = feedbacks.filter(f => f.isResolved).length;
    const featured = feedbacks.filter(f => f.isFeatured).length;
    const byType: Record<string, number> = { GENERAL: 0, BUG: 0, SUGGESTION: 0, OTHER: 0 };
    feedbacks.forEach(f => { if (byType[f.type] !== undefined) byType[f.type]++; });
    return { total, unresolved, resolved, featured, byType };
  }, [feedbacks]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (typeFilter !== 'all') c++;
    if (statusFilter !== 'all') c++;
    if (featuredFilter !== 'all') c++;
    if (sortBy !== 'newest') c++;
    return c;
  }, [typeFilter, statusFilter, featuredFilter, sortBy]);

  // Filtered & sorted
  const filteredFeedbacks = useMemo(() => {
    let items = feedbacks;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(f =>
        f.message.toLowerCase().includes(q) ||
        (f.user && `${f.user.firstName} ${f.user.lastName}`.toLowerCase().includes(q)) ||
        (f.user?.email && f.user.email.toLowerCase().includes(q)) ||
        (f.pageUrl && f.pageUrl.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'all') {
      items = items.filter(f => f.type === typeFilter);
    }

    if (statusFilter === 'resolved') {
      items = items.filter(f => f.isResolved);
    } else if (statusFilter === 'unresolved') {
      items = items.filter(f => !f.isResolved);
    }

    if (featuredFilter === 'featured') {
      items = items.filter(f => f.isFeatured);
    } else if (featuredFilter === 'not-featured') {
      items = items.filter(f => !f.isFeatured);
    }

    items = [...items].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return items;
  }, [feedbacks, search, typeFilter, statusFilter, featuredFilter, sortBy]);

  const clearAllFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setFeaturedFilter('all');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Feedback</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">Manage customer feedback, bug reports, and suggestions.</p>
        </div>
        <button
          onClick={fetchList}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'all' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'unresolved' ? 'all' : 'unresolved')}
          className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'unresolved' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Unresolved</p>
            {stats.unresolved > 0 && <XCircle className="w-3.5 h-3.5 text-red-500" />}
          </div>
          <p className="text-xl font-bold text-red-600 mt-1">{stats.unresolved}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
          className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'resolved' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Resolved</p>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.resolved}</p>
        </button>
        <button
          onClick={() => setFeaturedFilter(featuredFilter === 'featured' ? 'all' : 'featured')}
          className={`p-3 rounded-xl border text-left transition-all ${featuredFilter === 'featured' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Featured</p>
            <Star className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.featured}</p>
        </button>
        {/* Type breakdown */}
        <button
          onClick={() => setTypeFilter(typeFilter === 'BUG' ? 'all' : 'BUG')}
          className={`p-3 rounded-xl border text-left transition-all ${typeFilter === 'BUG' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Bugs</p>
            <Bug className="w-3.5 h-3.5 text-red-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.byType.BUG}</p>
        </button>
        <button
          onClick={() => setTypeFilter(typeFilter === 'SUGGESTION' ? 'all' : 'SUGGESTION')}
          className={`p-3 rounded-xl border text-left transition-all ${typeFilter === 'SUGGESTION' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Suggestions</p>
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.byType.SUGGESTION}</p>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by message, user, email, or page..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              filtersOpen || activeFilterCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">{activeFilterCount}</span>
            )}
          </button>

          {(activeFilterCount > 0 || search) && (
            <button onClick={clearAllFilters} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}

          <p className="text-xs text-gray-500 ml-auto whitespace-nowrap">
            Showing {filteredFeedbacks.length} of {feedbacks.length}
          </p>
        </div>

        {filtersOpen && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="GENERAL">General</option>
                  <option value="BUG">Bug Report</option>
                  <option value="SUGGESTION">Suggestion</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="unresolved">Unresolved</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Featured</label>
                <select
                  value={featuredFilter}
                  onChange={(e) => setFeaturedFilter(e.target.value as any)}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="featured">Featured</option>
                  <option value="not-featured">Not Featured</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active filter pills */}
        {activeFilterCount > 0 && !filtersOpen && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                Type: {typeConfig[typeFilter]?.label || typeFilter}
                <button onClick={() => setTypeFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                {statusFilter === 'resolved' ? 'Resolved' : 'Unresolved'}
                <button onClick={() => setStatusFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {featuredFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                {featuredFilter === 'featured' ? 'Featured' : 'Not Featured'}
                <button onClick={() => setFeaturedFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                Sort: {sortBy}
                <button onClick={() => setSortBy('newest')} className="text-gray-400 hover:text-gray-600 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Feedbacks List */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading feedback...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {search || activeFilterCount > 0 ? 'No feedback matches your filters' : 'No feedback yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Feedback will appear here when users submit it'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeedbacks.map(fb => {
            const tc = typeConfig[fb.type] || typeConfig.OTHER;
            const TypeIcon = tc.icon;
            const isExpanded = expandedId === fb.id;

            return (
              <div
                key={fb.id}
                className={`rounded-xl border transition-all hover:shadow-sm ${
                  fb.isResolved ? 'border-gray-200 bg-gray-50/50 opacity-75' : 'border-gray-200 bg-white'
                } ${fb.isFeatured ? 'border-amber-200 bg-amber-50/30 opacity-100' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tc.bg}`}>
                      <TypeIcon className={`w-4 h-4 ${tc.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">
                              {fb.user ? `${fb.user.firstName} ${fb.user.lastName}` : 'Anonymous'}
                            </span>
                            {/* Type badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${tc.bg} ${tc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                              {tc.label}
                            </span>
                            {/* Status badges */}
                            {fb.isResolved && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Resolved
                              </span>
                            )}
                            {fb.isFeatured && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                <Star className="w-3 h-3" /> Featured
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                            {fb.user?.email && <span>{fb.user.email}</span>}
                            <span>{new Date(fb.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleFeature(fb)}
                            disabled={!!actionLoading[`f-${fb.id}`]}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              fb.isFeatured
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={fb.isFeatured ? 'Remove from featured' : 'Add to featured'}
                          >
                            {actionLoading[`f-${fb.id}`] ? '...' : fb.isFeatured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button
                            onClick={() => markResolved(fb)}
                            disabled={!!actionLoading[`r-${fb.id}`]}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              fb.isResolved
                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={fb.isResolved ? 'Mark unresolved' : 'Mark resolved'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: fb.id, name: fb.user ? `${fb.user.firstName}'s feedback` : 'this feedback' })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Message */}
                      <p className={`text-sm text-gray-600 mt-2 ${!isExpanded && fb.message.length > 200 ? 'line-clamp-2' : ''}`}>
                        {fb.message}
                      </p>
                      {fb.message.length > 200 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-0.5"
                        >
                          {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
                        </button>
                      )}

                      {/* Page URL */}
                      {fb.pageUrl && (
                        <p className="text-xs text-gray-400 mt-2 truncate">
                          Page: <span className="font-mono">{fb.pageUrl}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm z-10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-50 border-b border-red-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-900">Delete Feedback</h3>
                  <p className="text-xs text-red-700">This action cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>?</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => deleteFeedback(deleteConfirm.id)}
                disabled={!!actionLoading[`d-${deleteConfirm.id}`]}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading[`d-${deleteConfirm.id}`] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
