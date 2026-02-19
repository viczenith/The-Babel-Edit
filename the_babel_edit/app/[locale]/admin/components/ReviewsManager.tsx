'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { Trash2, Star, User, Search, X, RefreshCw, MessageSquare, Award, AlertCircle, ChevronDown, ChevronUp, ShieldCheck, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface ReviewProduct {
  id: string;
  name: string;
}

interface Review {
  id: string;
  userId: string;
  user?: ReviewUser;
  productId: string;
  product?: ReviewProduct;
  rating: number;
  title?: string;
  comment?: string;
  isVerified?: boolean;
  createdAt: string;
}

export default function ReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<{ [k: string]: boolean }>({});

  // Search & filters
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'not-featured'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Expanded review
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
    fetchFeatured();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<any>(API_ENDPOINTS.REVIEWS.LIST + '?limit=999999', { requireAuth: true });
      setReviews(Array.isArray(data) ? data : (data?.reviews || []));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatured = async () => {
    try {
      const ids = await apiRequest<string[]>(API_ENDPOINTS.ADMIN.TESTIMONIALS.LIST, { requireAuth: true });
      setFeaturedIds(Array.isArray(ids) ? ids : []);
    } catch (err) {
      console.error(err);
      setFeaturedIds([]);
    }
  };

  const toggleFeature = async (reviewId: string) => {
    const isFeatured = featuredIds.includes(reviewId);
    setActionLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      if (isFeatured) {
        await apiRequest(API_ENDPOINTS.ADMIN.TESTIMONIALS.REMOVE(reviewId), { method: 'DELETE', requireAuth: true });
        toast.success('Removed from testimonials');
      } else {
        await apiRequest(API_ENDPOINTS.ADMIN.TESTIMONIALS.ADD, { method: 'POST', body: { reviewId }, requireAuth: true });
        toast.success('Added as testimonial');
      }
      await fetchFeatured();
    } catch (err) {
      console.error(err);
      toast.error('Action failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const deleteReview = async (reviewId: string) => {
    setActionLoading(prev => ({ ...prev, [`del-${reviewId}`]: true }));
    try {
      await apiRequest(API_ENDPOINTS.REVIEWS.DELETE(reviewId), { method: 'DELETE', requireAuth: true });
      toast.success('Review deleted');
      setDeleteConfirm(null);
      await fetchReviews();
      await fetchFeatured();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    } finally {
      setActionLoading(prev => ({ ...prev, [`del-${reviewId}`]: false }));
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = reviews.length;
    const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { if (distribution[r.rating] !== undefined) distribution[r.rating]++; });
    const featured = featuredIds.length;
    const verified = reviews.filter(r => r.isVerified).length;
    return { total, avgRating, distribution, featured, verified };
  }, [reviews, featuredIds]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (ratingFilter !== 'all') c++;
    if (featuredFilter !== 'all') c++;
    if (sortBy !== 'newest') c++;
    return c;
  }, [ratingFilter, featuredFilter, sortBy]);

  // Filtered & sorted reviews
  const filteredReviews = useMemo(() => {
    let items = reviews;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(r =>
        (r.user && `${r.user.firstName} ${r.user.lastName}`.toLowerCase().includes(q)) ||
        (r.product?.name && r.product.name.toLowerCase().includes(q)) ||
        (r.comment && r.comment.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q))
      );
    }

    if (ratingFilter !== 'all') {
      items = items.filter(r => r.rating === ratingFilter);
    }

    if (featuredFilter === 'featured') {
      items = items.filter(r => featuredIds.includes(r.id));
    } else if (featuredFilter === 'not-featured') {
      items = items.filter(r => !featuredIds.includes(r.id));
    }

    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest': return b.rating - a.rating;
        case 'lowest': return a.rating - b.rating;
        default: return 0;
      }
    });

    return items;
  }, [reviews, search, ratingFilter, featuredFilter, sortBy, featuredIds]);

  const clearAllFilters = () => {
    setSearch('');
    setRatingFilter('all');
    setFeaturedFilter('all');
    setSortBy('newest');
  };

  const renderStars = (rating: number, size = 'w-4 h-4') => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`${size} ${n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Reviews & Testimonials</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">Manage customer reviews and curate testimonials for your storefront.</p>
        </div>
        <button
          onClick={() => { fetchReviews(); fetchFeatured(); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards + Rating Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">Total Reviews</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="p-3 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">Average Rating</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
        <div className="p-3 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Testimonials</p>
            <Award className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.featured}</p>
        </div>
        <div className="p-3 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Verified</p>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.verified}</p>
        </div>
        {/* Rating Distribution */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 mb-2">Distribution</p>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map(n => {
              const count = stats.distribution[n] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <button
                  key={n}
                  onClick={() => setRatingFilter(ratingFilter === n ? 'all' : n)}
                  className={`flex items-center gap-1.5 w-full text-left rounded px-1 py-0.5 transition-colors ${ratingFilter === n ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                >
                  <span className="text-xs font-medium text-gray-600 w-3">{n}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-5 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reviewer, product, or content..."
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
            Showing {filteredReviews.length} of {reviews.length}
          </p>
        </div>

        {filtersOpen && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Rating</label>
                <select
                  value={ratingFilter === 'all' ? 'all' : String(ratingFilter)}
                  onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Testimonial Status</label>
                <select
                  value={featuredFilter}
                  onChange={(e) => setFeaturedFilter(e.target.value as any)}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="featured">Featured as Testimonial</option>
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
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active filter pills (when panel closed) */}
        {activeFilterCount > 0 && !filtersOpen && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {ratingFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 border border-gray-200 rounded-full">
                {ratingFilter} Stars
                <button onClick={() => setRatingFilter('all')} className="text-gray-400 hover:text-gray-600 ml-0.5"><X className="w-3 h-3" /></button>
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

      {/* Reviews List */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {search || activeFilterCount > 0 ? 'No reviews match your filters' : 'No reviews yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Reviews will appear here when customers submit them'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => {
            const isFeatured = featuredIds.includes(r.id);
            const isExpanded = expandedId === r.id;
            return (
              <div
                key={r.id}
                className={`rounded-xl border transition-all ${
                  isFeatured ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'
                } hover:shadow-sm`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Anonymous'}
                            </span>
                            {isFeatured && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                <Award className="w-3 h-3" /> Testimonial
                              </span>
                            )}
                            {r.isVerified && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {renderStars(r.rating, 'w-3.5 h-3.5')}
                            <span className="text-xs text-gray-400">
                              {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleFeature(r.id)}
                            disabled={!!actionLoading[r.id]}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              isFeatured
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {actionLoading[r.id] ? '...' : isFeatured ? 'Remove Testimonial' : 'Make Testimonial'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: r.id, name: r.user ? `${r.user.firstName}'s review` : 'this review' })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product link */}
                      {r.product && (
                        <p className="text-xs text-gray-400 mt-1">
                          on <span className="font-medium text-gray-500">{r.product.name}</span>
                        </p>
                      )}

                      {/* Review text */}
                      {r.title && <p className="text-sm font-medium text-gray-800 mt-2">{r.title}</p>}
                      {r.comment && (
                        <p className={`text-sm text-gray-600 mt-1 ${!isExpanded && r.comment.length > 200 ? 'line-clamp-2' : ''}`}>
                          {r.comment}
                        </p>
                      )}
                      {r.comment && r.comment.length > 200 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-0.5"
                        >
                          {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
                        </button>
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
                  <h3 className="text-base font-bold text-red-900">Delete Review</h3>
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
                onClick={() => deleteReview(deleteConfirm.id)}
                disabled={!!actionLoading[`del-${deleteConfirm.id}`]}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading[`del-${deleteConfirm.id}`] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
