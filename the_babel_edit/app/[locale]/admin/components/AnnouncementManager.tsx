'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, Megaphone, Tag, Info, AlertTriangle, Sparkles, Palette } from 'lucide-react';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { commonClasses } from '@/app/utils/designSystem';
import Button from '@/app/components/ui/Button/Button';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'SALE' | 'INFO' | 'NEW_ARRIVAL' | 'WARNING' | 'CUSTOM';
  linkText: string | null;
  linkUrl: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  message: '',
  type: 'INFO',
  linkText: '',
  linkUrl: '',
  backgroundColor: '',
  textColor: '',
  isActive: true,
  isDismissible: true,
  priority: 0,
  startDate: null,
  endDate: null,
};

const TYPE_CONFIG = {
  SALE: { label: 'Sale / Promo', icon: Tag, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', defaultBg: '#dc2626', defaultText: '#ffffff' },
  INFO: { label: 'Information', icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', defaultBg: '#2563eb', defaultText: '#ffffff' },
  NEW_ARRIVAL: { label: 'New Arrival', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', defaultBg: '#059669', defaultText: '#ffffff' },
  WARNING: { label: 'Warning / Notice', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', defaultBg: '#d97706', defaultText: '#ffffff' },
  CUSTOM: { label: 'Custom', icon: Palette, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', defaultBg: '#7c3aed', defaultText: '#ffffff' },
};

const AnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch all announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(API_ENDPOINTS.ANNOUNCEMENTS.LIST, { requireAuth: true });
      setAnnouncements(data.announcements || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setIsCreating(false);
    setForm({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      linkText: announcement.linkText || '',
      linkUrl: announcement.linkUrl || '',
      backgroundColor: announcement.backgroundColor || '',
      textColor: announcement.textColor || '',
      isActive: announcement.isActive,
      isDismissible: announcement.isDismissible,
      priority: announcement.priority,
      startDate: announcement.startDate ? announcement.startDate.slice(0, 16) : null,
      endDate: announcement.endDate ? announcement.endDate.slice(0, 16) : null,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        linkText: form.linkText || null,
        linkUrl: form.linkUrl || null,
        backgroundColor: form.backgroundColor || null,
        textColor: form.textColor || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (isCreating) {
        await apiRequest(API_ENDPOINTS.ANNOUNCEMENTS.CREATE, {
          method: 'POST',
          body: payload,
          requireAuth: true,
        });
        toast.success('Announcement created!');
      } else if (editingId) {
        await apiRequest(API_ENDPOINTS.ANNOUNCEMENTS.UPDATE(editingId), {
          method: 'PUT',
          body: payload,
          requireAuth: true,
        });
        toast.success('Announcement updated!');
      }

      cancelEdit();
      await fetchAnnouncements();
    } catch {
      toast.error('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiRequest(API_ENDPOINTS.ANNOUNCEMENTS.TOGGLE(id), {
        method: 'PATCH',
        requireAuth: true,
      });
      await fetchAnnouncements();
      toast.success('Announcement toggled');
    } catch {
      toast.error('Failed to toggle announcement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(API_ENDPOINTS.ANNOUNCEMENTS.DELETE(id), {
        method: 'DELETE',
        requireAuth: true,
      });
      setDeleteConfirm(null);
      await fetchAnnouncements();
      toast.success('Announcement deleted');
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const getStatusBadge = (ann: Announcement) => {
    const now = new Date();
    if (!ann.isActive) return { label: 'Inactive', className: 'bg-gray-100 text-gray-600' };
    if (ann.startDate && new Date(ann.startDate) > now) return { label: 'Scheduled', className: 'bg-yellow-100 text-yellow-700' };
    if (ann.endDate && new Date(ann.endDate) < now) return { label: 'Expired', className: 'bg-red-100 text-red-700' };
    return { label: 'Live', className: 'bg-green-100 text-green-700' };
  };

  const renderForm = () => {
    const typeConfig = TYPE_CONFIG[form.type];

    return (
      <div className="space-y-5 p-5 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {isCreating ? 'Create New Announcement' : 'Edit Announcement'}
        </h3>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleFormChange('title', e.target.value)}
            placeholder="e.g., Flash Sale This Weekend!"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.message}
            onChange={(e) => handleFormChange('message', e.target.value)}
            placeholder="e.g., Get up to 80% discount on all products. Limited time only!"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Announcement Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map(key => {
              const config = TYPE_CONFIG[key];
              const Icon = config.icon;
              const isSelected = form.type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleFormChange('type', key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all
                    ${isSelected
                      ? `${config.bg} ${config.border} ${config.color} ring-2 ring-offset-1 ring-current`
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Text (optional)</label>
            <input
              type="text"
              value={form.linkText || ''}
              onChange={(e) => handleFormChange('linkText', e.target.value)}
              placeholder="e.g., Shop Now, Read More"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
            <input
              type="text"
              value={form.linkUrl || ''}
              onChange={(e) => handleFormChange('linkUrl', e.target.value)}
              placeholder="e.g., /products?category=sale"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
            <input
              type="datetime-local"
              value={form.startDate || ''}
              onChange={(e) => handleFormChange('startDate', e.target.value || null)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to show immediately</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
            <input
              type="datetime-local"
              value={form.endDate || ''}
              onChange={(e) => handleFormChange('endDate', e.target.value || null)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
          </div>
        </div>

        {/* Custom Colors (shown for CUSTOM type or as override) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.backgroundColor || typeConfig.defaultBg}
                onChange={(e) => handleFormChange('backgroundColor', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.backgroundColor || ''}
                onChange={(e) => handleFormChange('backgroundColor', e.target.value)}
                placeholder={typeConfig.defaultBg}
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.textColor || typeConfig.defaultText}
                onChange={(e) => handleFormChange('textColor', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.textColor || ''}
                onChange={(e) => handleFormChange('textColor', e.target.value)}
                placeholder={typeConfig.defaultText}
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => handleFormChange('priority', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Higher = shown first</p>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleFormChange('isActive', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Active on save</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDismissible}
              onChange={(e) => handleFormChange('isDismissible', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Users can dismiss</span>
          </label>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Live Preview</label>
          <div
            className="rounded-lg px-4 py-3 text-sm font-medium text-center"
            style={{
              backgroundColor: form.backgroundColor || typeConfig.defaultBg,
              color: form.textColor || typeConfig.defaultText,
            }}
          >
            <span>{form.message || 'Your announcement message will appear here'}</span>
            {form.linkText && (
              <span className="ml-2 underline font-semibold">{form.linkText}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            variant="primary"
            className="flex items-center gap-2"
            disabled={saving || !form.title.trim() || !form.message.trim()}
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Announcement'}
          </Button>
          <Button onClick={cancelEdit} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <section className={commonClasses.card}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            Announcement Bar
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage announcement banners shown across the store (products page header, etc.)
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button
            onClick={startCreate}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </Button>
        )}
      </div>

      {/* Create / Edit Form */}
      {(isCreating || editingId) && renderForm()}

      {/* List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm mt-1">Create your first announcement to display on the products page.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-6">
          {announcements.map(ann => {
            const typeConfig = TYPE_CONFIG[ann.type];
            const Icon = typeConfig.icon;
            const status = getStatusBadge(ann);

            return (
              <div
                key={ann.id}
                className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${
                  ann.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left - Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border} border`}>
                        <Icon className="w-3 h-3" />
                        {typeConfig.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                      {ann.priority > 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          Priority: {ann.priority}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 truncate">{ann.title}</h4>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{ann.message}</p>
                    {ann.linkText && (
                      <p className="text-xs text-blue-600 mt-1">
                        Link: {ann.linkText} → {ann.linkUrl || '(no URL)'}
                      </p>
                    )}
                    {(ann.startDate || ann.endDate) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {ann.startDate && `From: ${new Date(ann.startDate).toLocaleDateString()}`}
                        {ann.startDate && ann.endDate && ' — '}
                        {ann.endDate && `To: ${new Date(ann.endDate).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>

                  {/* Right - Preview swatch + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="w-8 h-8 rounded-full border border-gray-300"
                      style={{ backgroundColor: ann.backgroundColor || typeConfig.defaultBg }}
                      title={`Color: ${ann.backgroundColor || typeConfig.defaultBg}`}
                    />
                    <button
                      onClick={() => handleToggle(ann.id)}
                      className={`p-2 rounded-md transition-colors ${
                        ann.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={ann.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {ann.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEdit(ann)}
                      className="p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit"
                      disabled={!!editingId || isCreating}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(ann.id)}
                      className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Announcement?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-md font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AnnouncementManager;
