'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import Button from '@/app/components/ui/Button/Button';
import ConfirmModal from '@/app/components/ui/ConfirmModal/ConfirmModal';
import { X, Plus, Pencil, Trash2, Tag, Layers, FolderOpen } from 'lucide-react';

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

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
}

interface TypeFormData {
  name: string;
  description: string;
}

/** Auto-generate a URL-safe slug from a name */
const slugify = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

export default function ProductTypesManagement() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>('create');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({ name: '', slug: '', description: '' });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Type modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeModalMode, setTypeModalMode] = useState<'create' | 'edit'>('create');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeFormData, setTypeFormData] = useState<TypeFormData>({ name: '', description: '' });

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'category' | 'type'; id: string; name?: string } | null>(null);

  /** Notify other components (Navbar, ProductForm, AdminSectionNav) that categories changed */
  const notifyCategoryUpdate = () => {
    try { window.dispatchEvent(new CustomEvent('productCategories:updated')); } catch (_) {}
  };

  /** Fetch categories and return fresh data; also updates selectedCategory */
  const loadCategories = useCallback(async (): Promise<ProductCategory[]> => {
    try {
      setLoading(true);
      const data = await apiRequest<ProductCategory[]>(API_ENDPOINTS.CATEGORIES.LIST);
      const list = Array.isArray(data) ? data : [];
      setCategories(list);

      // Keep selectedCategory in sync with fresh data
      setSelectedCategory(prev => {
        if (!prev) return null;
        return list.find(c => c.id === prev.id) || null;
      });

      return list;
    } catch (err) {
      toast.error('Failed to load categories');
      console.error('Error loading categories:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ─── Category CRUD ────────────────────────────────────────────────

  const openCreateCategoryModal = () => {
    setCategoryModalMode('create');
    setCategoryFormData({ name: '', slug: '', description: '' });
    setEditingCategoryId(null);
    setSlugManuallyEdited(false);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat: ProductCategory) => {
    setCategoryModalMode('edit');
    setEditingCategoryId(cat.id);
    setCategoryFormData({ name: cat.name, slug: cat.slug, description: cat.description || '' });
    setSlugManuallyEdited(true); // Don't auto-slug when editing
    setShowCategoryModal(true);
  };

  const handleCategoryNameChange = (value: string) => {
    const updates: Partial<CategoryFormData> = { name: value };
    // Auto-generate slug from name unless user manually edited the slug
    if (!slugManuallyEdited) {
      updates.slug = slugify(value);
    }
    setCategoryFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCategorySlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setCategoryFormData(prev => ({ ...prev, slug: slugify(value) }));
  };

  const handleSubmitCategoryModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim() || !categoryFormData.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      if (categoryModalMode === 'create') {
        await apiRequest(API_ENDPOINTS.CATEGORIES.ADMIN.CREATE, { method: 'POST', body: categoryFormData });
        toast.success(`Category "${categoryFormData.name}" created`);
      } else if (editingCategoryId) {
        await apiRequest(API_ENDPOINTS.CATEGORIES.ADMIN.UPDATE(editingCategoryId), { method: 'PATCH', body: categoryFormData });
        toast.success(`Category "${categoryFormData.name}" updated`);
      }
      setShowCategoryModal(false);
      await loadCategories();
      notifyCategoryUpdate();
    } catch (err: any) {
      const msg = err?.message || `Failed to ${categoryModalMode === 'create' ? 'create' : 'update'} category`;
      toast.error(msg);
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategory = (categoryId: string, name?: string) => {
    setDeleteTarget({ kind: 'category', id: categoryId, name });
    setShowDeleteModal(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await apiRequest(API_ENDPOINTS.CATEGORIES.ADMIN.DELETE(categoryId), { method: 'DELETE' });
      toast.success('Category deleted');
      if (selectedCategory?.id === categoryId) setSelectedCategory(null);
      await loadCategories();
      notifyCategoryUpdate();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete category');
      console.error('Error deleting category:', err);
    }
  };

  // ─── Type CRUD ────────────────────────────────────────────────────

  const openCreateTypeModal = () => {
    setTypeModalMode('create');
    setEditingTypeId(null);
    setTypeFormData({ name: '', description: '' });
    setShowTypeModal(true);
  };

  const openEditTypeModal = (type: ProductType) => {
    setTypeModalMode('edit');
    setEditingTypeId(type.id);
    setTypeFormData({ name: type.name, description: type.description || '' });
    setShowTypeModal(true);
  };

  const handleSubmitTypeModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!typeFormData.name.trim()) {
      toast.error('Type name is required');
      return;
    }

    setSaving(true);
    try {
      if (typeModalMode === 'create') {
        await apiRequest(API_ENDPOINTS.TYPES.ADMIN.CREATE, {
          method: 'POST',
          body: { ...typeFormData, categoryId: selectedCategory.id }
        });
        toast.success(`Type "${typeFormData.name}" created`);
      } else if (editingTypeId) {
        await apiRequest(API_ENDPOINTS.TYPES.ADMIN.UPDATE(editingTypeId), { method: 'PATCH', body: typeFormData });
        toast.success(`Type "${typeFormData.name}" updated`);
      }
      setShowTypeModal(false);
      await loadCategories();
      notifyCategoryUpdate();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${typeModalMode === 'create' ? 'create' : 'update'} type`);
      console.error('Error saving type:', err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteType = (typeId: string, name?: string) => {
    setDeleteTarget({ kind: 'type', id: typeId, name });
    setShowDeleteModal(true);
  };

  const handleDeleteType = async (typeId: string) => {
    try {
      await apiRequest(API_ENDPOINTS.TYPES.ADMIN.DELETE(typeId), { method: 'DELETE' });
      toast.success('Type deleted');
      await loadCategories();
      notifyCategoryUpdate();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete type');
      console.error('Error deleting type:', err);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Types & Categories</h1>
        <p className="text-gray-500 text-sm sm:text-base mt-1">
          Manage product categories and their types for filtering across the store
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Categories Panel (2 cols) ─────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Section Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateCategoryModal}
            >
              Add
            </Button>
          </div>

          {/* Categories List */}
          <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No categories yet</p>
                <p className="text-gray-400 text-xs mt-1">Create one to get started</p>
              </div>
            ) : (
              categories.map((cat) => {
                const isActive = selectedCategory?.id === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`group relative flex items-center justify-between p-3.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 border border-blue-200 shadow-sm'
                        : 'bg-gray-50 border border-transparent hover:bg-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-medium text-sm truncate ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                        {cat.name}
                      </h3>
                      <p className={`text-xs font-mono mt-0.5 truncate ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                        /{cat.slug}
                      </p>
                      <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {cat.types?.length || 0} type{(cat.types?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Actions - visible on hover or when active */}
                    <div className={`flex items-center gap-1 ml-2 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditCategoryModal(cat); }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit category"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); confirmDeleteCategory(cat.id, cat.name); }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Types Panel (3 cols) ──────────────────────────────────── */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200">
          {selectedCategory ? (
            <>
              {/* Section Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedCategory.name}</h2>
                    <p className="text-xs text-gray-400">Manage types in this category</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={openCreateTypeModal}
                >
                  Add Type
                </Button>
              </div>

              {/* Types List */}
              <div className="p-4 max-h-[65vh] overflow-y-auto">
                {selectedCategory.types && selectedCategory.types.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCategory.types.map((type) => (
                      <div
                        key={type.id}
                        className="group flex items-center justify-between p-3.5 bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg transition-all duration-200"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{type.name}</h4>
                          {type.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{type.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditTypeModal(type)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit type"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => confirmDeleteType(type.id, type.name)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete type"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Tag className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No types in this category</p>
                    <p className="text-gray-400 text-xs mt-1">Add one to get started</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
              <Layers className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-500 text-base font-medium">Select a category</p>
              <p className="text-gray-400 text-sm mt-1">Choose a category from the left to manage its types</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Category Modal ──────────────────────────────────────────── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white px-6 py-5 flex items-center justify-between rounded-t-2xl border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {categoryModalMode === 'create' ? 'Create Category' : 'Edit Category'}
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  {categoryModalMode === 'create'
                    ? 'Add a new product category'
                    : `Editing "${categoryFormData.name}"`}
                </p>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-500 hover:bg-gray-100 rounded-lg p-2 transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitCategoryModal} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g., Clothes"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={categoryFormData.name}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug</label>
                <input
                  type="text"
                  placeholder="auto-generated from name"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={categoryFormData.slug}
                  onChange={(e) => handleCategorySlugChange(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1.5">URL-safe identifier — auto-generated from name, or type to customize.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  placeholder="Category description (optional)"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end pt-2 border-t border-gray-100">
                <Button variant="ghost" type="button" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={saving} disabled={saving}>
                  {categoryModalMode === 'create' ? 'Create Category' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Type Modal ──────────────────────────────────────────────── */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white px-6 py-5 flex items-center justify-between rounded-t-2xl border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {typeModalMode === 'create' ? 'Create Type' : 'Edit Type'}
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  {typeModalMode === 'create'
                    ? `Adding type to "${selectedCategory?.name}"`
                    : `Editing "${typeFormData.name}"`}
                </p>
              </div>
              <button
                onClick={() => setShowTypeModal(false)}
                className="text-gray-500 hover:bg-gray-100 rounded-lg p-2 transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitTypeModal} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type Name</label>
                <input
                  type="text"
                  placeholder="e.g., T-Shirt"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  placeholder="Type description (optional)"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  rows={3}
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end pt-2 border-t border-gray-100">
                <Button variant="ghost" type="button" onClick={() => setShowTypeModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={saving} disabled={saving}>
                  {typeModalMode === 'create' ? 'Create Type' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ───────────────────────────────── */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        onConfirm={async () => {
          if (deleteTarget?.kind === 'category') {
            await handleDeleteCategory(deleteTarget.id);
          } else if (deleteTarget?.kind === 'type') {
            await handleDeleteType(deleteTarget.id);
          }
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.kind === 'category' ? 'Category' : 'Type'}`}
        message={
          deleteTarget?.kind === 'category'
            ? `Are you sure you want to delete "${deleteTarget?.name}"? All types in this category will also be deleted.`
            : `Are you sure you want to delete type "${deleteTarget?.name}"?`
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
