'use client';

import React, { useState, useEffect } from 'react';
import { Collection } from '@/app/store/types';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, AlertCircle, RotateCcw, Loader, ChevronDown, Eye, EyeOff, Search, X } from 'lucide-react';
import Button from '@/app/components/ui/Button/Button';
import ConfirmModal from '@/app/components/ui/ConfirmModal/ConfirmModal';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column, Action } from '@/app/components/ui/DataTable/DataTable';

interface CollectionStats {
  id: string;
  products: number;
  featured: number;
  revenue?: number;
}

export const CollectionsManager: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsStats, setCollectionsStats] = useState<{ [key: string]: CollectionStats }>({});
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    sortOrder: 0,
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const response = await apiRequest<{ collections: Collection[] }>(
        API_ENDPOINTS.COLLECTIONS.LIST + '?limit=100',
        { requireAuth: true }
      );
      
      const allCollections = Array.isArray(response.collections) ? response.collections : (response as any).collections || [];
      setCollections(allCollections.sort((a: Collection, b: Collection) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));

      // Fetch stats for each collection
      const statsPromises = allCollections.map(async (col: Collection) => {
        try {
          const stats = await apiRequest<any>(
            API_ENDPOINTS.COLLECTIONS.ADMIN.STATS(col.id),
            { requireAuth: true }
          );
          return {
            id: col.id,
            products: stats.productCount || 0,
            featured: stats.featuredCount || 0,
            revenue: stats.totalRevenue || 0,
          };
        } catch (e) {
          return { id: col.id, products: 0, featured: 0, revenue: 0 };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: { [key: string]: CollectionStats } = {};
      statsResults.forEach((stat) => {
        statsMap[stat.id] = stat;
      });
      setCollectionsStats(statsMap);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load collections';
      setLoadingError(errorMessage);
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) errors.name = 'Collection name is required';
    if (!formData.slug.trim()) errors.slug = 'Slug is required';
    if (formData.slug.includes(' ')) errors.slug = 'Slug cannot contain spaces';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      if (editingCollection) {
        // Update existing collection
        await apiRequest(API_ENDPOINTS.COLLECTIONS.ADMIN.UPDATE(editingCollection.id), {
          method: 'PUT',
          body: formData,
          requireAuth: true,
        });
        toast.success('Collection updated successfully!');
      } else {
        // Create new collection
        await apiRequest(API_ENDPOINTS.COLLECTIONS.ADMIN.CREATE, {
          method: 'POST',
          body: formData,
          requireAuth: true,
        });
        toast.success('Collection created successfully!');
      }
      
      resetForm();
      await fetchCollections();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save collection';
      toast.error(errorMessage);
      console.error('Error saving collection:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      slug: collection.slug || '',
      description: collection.description || '',
      imageUrl: collection.imageUrl || '',
      sortOrder: collection.sortOrder ?? 0,
      isActive: collection.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiRequest(API_ENDPOINTS.COLLECTIONS.ADMIN.DELETE(deleteConfirm.id), {
        method: 'DELETE',
        requireAuth: true,
      });
      toast.success('Collection deleted successfully!');
      setDeleteConfirm({ isOpen: false, id: '', name: '' });
      await fetchCollections();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete collection';
      toast.error(errorMessage);
      console.error('Error deleting collection:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (collection: Collection) => {
    setActionLoading(prev => ({ ...prev, [`toggle-${collection.id}`]: true }));
    try {
      await apiRequest(API_ENDPOINTS.COLLECTIONS.ADMIN.UPDATE(collection.id), {
        method: 'PUT',
        body: { ...collection, isActive: !collection.isActive },
        requireAuth: true,
      });
      toast.success(`Collection ${!collection.isActive ? 'activated' : 'deactivated'}`);
      await fetchCollections();
    } catch (error) {
      toast.error('Failed to update collection status');
      console.error('Error toggling collection:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`toggle-${collection.id}`]: false }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      sortOrder: 0,
      isActive: true,
    });
    setEditingCollection(null);
    setShowForm(false);
    setFormErrors({});
  };

  const filteredCollections = collections.filter(col =>
    col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const collectionColumns: Column<Collection>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '25%',
      cell: (col) => (
        <div className="flex items-center gap-3">
          {col.imageUrl && (
            <img
              src={col.imageUrl}
              alt={col.name}
              className="h-10 w-10 rounded object-cover"
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{col.name}</p>
            <p className="text-xs text-gray-500">{col.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      width: '30%',
      cell: (col) => <p className="text-sm text-gray-600 truncate">{col.description || '-'}</p>,
    },
    {
      key: 'stats',
      header: 'Statistics',
      cell: (col) => {
        const stats = collectionsStats[col.id];
        if (!stats) return <span className="text-sm text-gray-500">Loading...</span>;
        return (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{stats.products}</p>
              <p className="text-xs text-gray-500">products</p>
            </div>
            {(stats.revenue ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{formatCurrency(stats.revenue ?? 0)}</p>
                <p className="text-xs text-gray-500">revenue</p>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'sortOrder',
      header: 'Order',
      cell: (col) => <span className="text-sm text-gray-600">{col.sortOrder ?? 0}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (col) => (
        <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
          col.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {col.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const collectionActions: Action<Collection>[] = [
    {
      label: (col) => col.isActive ? 'Deactivate' : 'Activate',
      onClick: (col) => handleToggleActive(col),
      variant: (col) => col.isActive ? 'outline' : 'primary',
      loading: (col) => actionLoading[`toggle-${col.id}`],
    },
    {
      label: 'Edit',
      onClick: (col) => handleEdit(col),
      variant: 'outline',
    },
    {
      label: 'Delete',
      onClick: (col) => setDeleteConfirm({ isOpen: true, id: col.id, name: col.name }),
      variant: 'danger',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Collections Management</h1>
          <p className="mt-2 text-sm text-gray-600">Create and manage product collections. Organize products into categories for better customer experience.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition whitespace-nowrap shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs sm:text-sm text-blue-600 font-medium">Total Collections</div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-2">{collections.length}</div>
          <div className="text-xs text-blue-600 mt-1">{collections.filter(c => c.isActive).length} active</div>
        </div>

        <div className="p-4 sm:p-5 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-xs sm:text-sm text-green-600 font-medium">Total Products</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-900 mt-2">
            {Object.values(collectionsStats).reduce((sum, stat) => sum + stat.products, 0)}
          </div>
          <div className="text-xs text-green-600 mt-1">across all collections</div>
        </div>

        <div className="p-4 sm:p-5 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-xs sm:text-sm text-purple-600 font-medium">Total Revenue</div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-900 mt-2">
            {formatCurrency(Object.values(collectionsStats).reduce((sum, stat) => sum + (stat.revenue || 0), 0))}
          </div>
          <div className="text-xs text-purple-600 mt-1">from collections</div>
        </div>

        <div className="p-4 sm:p-5 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-xs sm:text-sm text-orange-600 font-medium">Performance</div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-900 mt-2">
            {collections.length > 0
              ? ((collections.filter(c => c.isActive).length / collections.length) * 100).toFixed(0)
              : '0'}
            %
          </div>
          <div className="text-xs text-orange-600 mt-1">active rate</div>
        </div>
      </div>

      {/* Error State */}
      {loadingError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{loadingError}</p>
          </div>
          <button
            onClick={fetchCollections}
            className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition"
            title="Retry loading"
          >
            <RotateCcw className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search collections by name or slug..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading collections...</p>
            </div>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {collections.length === 0 ? 'No collections yet' : 'No matching collections'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {collections.length === 0
                ? 'Start by creating your first product collection'
                : 'Try adjusting your search terms'}
            </p>
            {collections.length === 0 && (
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create First Collection
              </button>
            )}
          </div>
        ) : (
          <DataTable
            data={filteredCollections}
            columns={collectionColumns}
            actions={collectionActions}
            loading={loading}
            emptyMessage="No collections found"
          />
        )}
      </div>

      {/* Collection Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 sm:px-8 py-6 sm:py-8 flex items-center justify-between border-b">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {editingCollection ? 'Edit Collection' : 'Create New Collection'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {editingCollection ? 'Update collection details' : 'Add a new product collection'}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Collection Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    setFormErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g., Summer Collection"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
              </div>

              {/* Slug Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Slug (URL-friendly)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, slug: e.target.value }));
                    setFormErrors(prev => ({ ...prev, slug: '' }));
                  }}
                  placeholder="e.g., summer-collection"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formErrors.slug && <p className="mt-1 text-sm text-red-600">{formErrors.slug}</p>}
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this collection..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Image URL Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.imageUrl && (
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="mt-3 h-24 w-24 object-cover rounded border"
                    onError={() => console.error('Image failed to load')}
                  />
                )}
              </div>

              {/* Sort Order and Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>

                <div>
                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Active</p>
                      <p className="text-xs text-gray-500">Visible to customers</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingCollection ? 'Update Collection' : 'Create Collection'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={handleDelete}
        title="Delete Collection"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default CollectionsManager;
