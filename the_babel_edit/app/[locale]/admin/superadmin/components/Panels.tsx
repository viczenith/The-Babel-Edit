"use client";
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import PanelHeader from './PanelHeader';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { formatCurrency } from '@/lib/utils';
import UsersList from '@/app/[locale]/admin/components/UsersList';
import { useAuth } from '@/app/context/AuthContext';

export const ProductsPanel: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(API_ENDPOINTS.PRODUCTS.ADMIN.LIST, { requireAuth: true });
        setProducts(res.products || res || []);
      } catch (err) {
        console.error('Failed fetching products', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <PanelHeader title="Products" subtitle="Manage product catalog and inventory" />
      {loading ? <div className="text-sm">Loading products...</div> : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-3 py-2">Name</th>
                <th className="px-2 sm:px-3 py-2 hidden sm:table-cell">Price</th>
                <th className="px-2 sm:px-3 py-2 hidden sm:table-cell">Stock</th>
                <th className="px-2 sm:px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-2 sm:px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-2 sm:px-3 py-2 hidden sm:table-cell">${p.price}</td>
                  <td className="px-2 sm:px-3 py-2 hidden sm:table-cell">{p.stock}</td>
                  <td className="px-2 sm:px-3 py-2"><span className={`inline-block px-2 py-1 rounded text-xs ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const OrdersPanel: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(API_ENDPOINTS.ORDERS?.LIST || '/orders', { requireAuth: true });
        setOrders(res.orders || res || []);
      } catch (err) {
        console.error('Failed fetching orders', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <PanelHeader title="Orders" subtitle="View and manage customer orders" />
      {loading ? <div className="text-sm">Loading orders...</div> : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-3 py-2">Order#</th>
                <th className="px-2 sm:px-3 py-2 hidden sm:table-cell">User</th>
                <th className="px-2 sm:px-3 py-2">Total</th>
                <th className="px-2 sm:px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="px-2 sm:px-3 py-2 font-medium">{o.orderNumber || o.id?.slice(0, 8)}</td>
                  <td className="px-2 sm:px-3 py-2 hidden sm:table-cell text-xs">{o.user?.email || o.userId?.slice(0, 8)}</td>
                  <td className="px-2 sm:px-3 py-2 font-medium">{formatCurrency(o.total)}</td>
                  <td className="px-2 sm:px-3 py-2"><span className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const CollectionsPanel: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(API_ENDPOINTS.COLLECTIONS?.LIST || '/collections', { requireAuth: true });
        setCollections(res.collections || res || []);
      } catch (err) {
        console.error('Failed fetching collections', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <PanelHeader title="Collections" subtitle="Manage site collections" />
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          className="p-2 border rounded flex-1 text-sm"
          placeholder="New collection name (e.g. Clothes)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button
          className="px-3 py-2 bg-black text-white rounded text-sm whitespace-nowrap"
          onClick={async () => {
            if (!newName.trim()) { toast.error('Collection name cannot be empty'); return; }
            setSaving(true);
            try {
              const res = await apiRequest<{ collection: any }>('/admin/collections', { method: 'POST', body: { name: newName }, requireAuth: true });
              const created = res.collection || res;
              setCollections(prev => [created, ...prev]);
              setNewName('');
              toast.success('Collection created');
            } catch (err) {
              console.error('Failed to create collection', err);
              toast.error((err as any)?.message || 'Failed to create collection');
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Create'}
        </button>
      </div>

      {loading ? <div className="text-sm">Loading collections...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collections.map((c: any) => (
            <div key={c.id} className="p-3 border rounded flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium text-sm sm:text-base">{c.name}</div>
                <div className="text-xs sm:text-sm text-gray-500">{c.description}</div>
                <div className="mt-1 text-xs text-gray-400">Slug: { (c.slug) || (c.name || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g,'-') }</div>
              </div>
              <div className="flex flex-row sm:flex-col items-stretch sm:items-end gap-2">
                <button className="px-2 py-1 border rounded text-xs sm:text-sm whitespace-nowrap" onClick={async () => {
                  if (!window.confirm('Delete collection? This will not delete products.')) return;
                  try {
                    await apiRequest(API_ENDPOINTS.COLLECTIONS.ADMIN.DELETE(c.id), { method: 'DELETE', requireAuth: true });
                    setCollections(prev => prev.filter(p => p.id !== c.id));
                    toast.success('Collection deleted');
                  } catch (err) {
                    console.error('Failed to delete collection', err);
                    toast.error('Failed to delete collection');
                  }
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// AuditPanel is now handled by the AuditLogs component
export const AuditPanel: React.FC = () => null;

/* ═══════════════════════════════════════════════════════════════════════════════
   SETTINGS PANEL — Comprehensive, fully-persisted settings management
   ═══════════════════════════════════════════════════════════════════════════════ */

interface SiteSetting {
  key: string;
  value: string;
  group: string;
  label: string | null;
  updatedAt: string;
}

// ── Toggle Switch ──
const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  color?: string;
}> = ({ checked, onChange, disabled = false, color = 'green' }) => {
  const colorMap: Record<string, string> = {
    green: 'bg-green-600',
    red: 'bg-red-600',
    blue: 'bg-blue-600',
    amber: 'bg-amber-600',
  };
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? (colorMap[color] || colorMap.green) : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

// ── Section Card ──
const SettingsSection: React.FC<{
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ icon, title, description, children, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
};

// ── Store Configuration ──
const StoreConfiguration: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, saving }) => {
  const [localValues, setLocalValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setLocalValues({
      store_name: settings.store_name || '',
      store_contact_email: settings.store_contact_email || '',
      store_currency: settings.store_currency || 'GBP',
      store_timezone: settings.store_timezone || 'Europe/London',
    });
  }, [settings]);

  const currencies = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'NGN'];
  const timezones = [
    'Europe/London', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
    'Asia/Shanghai', 'Australia/Sydney', 'Africa/Lagos',
  ];

  const handleSave = async (key: string) => {
    if (localValues[key] !== settings[key]) {
      await onUpdate(key, localValues[key]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Store Name */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Store Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded text-sm"
            value={localValues.store_name || ''}
            onChange={e => setLocalValues(prev => ({ ...prev, store_name: e.target.value }))}
            onBlur={() => handleSave('store_name')}
          />
          {saving === 'store_name' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
        </div>
      </div>

      {/* Contact Email */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
        <div className="flex gap-2">
          <input
            type="email"
            className="flex-1 p-2 border rounded text-sm"
            placeholder="admin@thebabeledit.com"
            value={localValues.store_contact_email || ''}
            onChange={e => setLocalValues(prev => ({ ...prev, store_contact_email: e.target.value }))}
            onBlur={() => handleSave('store_contact_email')}
          />
          {saving === 'store_contact_email' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
        </div>
      </div>

      {/* Currency */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
        <select
          className="w-full p-2 border rounded text-sm"
          value={localValues.store_currency || 'GBP'}
          onChange={e => { setLocalValues(prev => ({ ...prev, store_currency: e.target.value })); onUpdate('store_currency', e.target.value); }}
          disabled={saving === 'store_currency'}
        >
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
        <select
          className="w-full p-2 border rounded text-sm"
          value={localValues.store_timezone || 'Europe/London'}
          onChange={e => { setLocalValues(prev => ({ ...prev, store_timezone: e.target.value })); onUpdate('store_timezone', e.target.value); }}
          disabled={saving === 'store_timezone'}
        >
          {timezones.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
    </div>
  );
};

// ── Feature Toggles ──
const FeatureToggles: React.FC<{
  settings: Record<string, string>;
  onToggle: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onToggle, saving }) => {
  const toggles = [
    { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Block all non-admin access to the site', color: 'red', warning: true },
    { key: 'new_user_registration', label: 'New User Registration', description: 'Allow new users to create accounts', color: 'green' },
    { key: 'email_notifications', label: 'Email Notifications', description: 'Send system notification emails', color: 'blue' },
    { key: 'promotional_emails', label: 'Promotional Emails', description: 'Send marketing and promotional emails', color: 'amber' },
    { key: 'guest_checkout', label: 'Guest Checkout', description: 'Allow orders without account creation', color: 'green' },
    { key: 'review_moderation', label: 'Review Moderation', description: 'Hold new reviews for manual approval', color: 'blue' },
  ];

  return (
    <div className="space-y-3">
      {toggles.map(t => {
        const isOn = settings[t.key] === 'true';
        return (
          <div key={t.key} className={`flex items-center justify-between p-3 sm:p-4 border rounded transition-colors ${
            t.warning && isOn ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
          }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base font-semibold text-gray-900">{t.label}</p>
                {t.warning && isOn && (
                  <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 font-medium">ACTIVE</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">{t.description}</p>
            </div>
            <Toggle
              checked={isOn}
              onChange={() => onToggle(t.key, isOn ? 'false' : 'true')}
              disabled={saving === t.key}
              color={t.color}
            />
          </div>
        );
      })}
    </div>
  );
};

// ── Notification Settings ──
const NotificationSettings: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  onToggle: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, onToggle, saving }) => {
  const notifications = [
    { key: 'notify_new_order', label: 'New Order', description: 'Get notified when a new order is placed' },
    { key: 'notify_low_stock', label: 'Low Stock', description: 'Get notified when product stock is low' },
    { key: 'notify_new_review', label: 'New Review', description: 'Get notified when a review is submitted' },
    { key: 'notify_new_user', label: 'New User', description: 'Get notified when a new user registers' },
  ];

  return (
    <div className="space-y-4">
      {notifications.map(n => {
        const isOn = settings[n.key] === 'true';
        return (
          <div key={n.key} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{n.label}</p>
              <p className="text-xs text-gray-600">{n.description}</p>
            </div>
            <Toggle
              checked={isOn}
              onChange={() => onToggle(n.key, isOn ? 'false' : 'true')}
              disabled={saving === n.key}
              color="blue"
            />
          </div>
        );
      })}

      {/* Low stock threshold */}
      <div className="p-3 border rounded">
        <label className="block text-sm font-semibold text-gray-900 mb-1">Low Stock Threshold</label>
        <p className="text-xs text-gray-600 mb-2">Products with stock at or below this number trigger alerts</p>
        <input
          type="number"
          min={1}
          max={100}
          className="w-24 p-2 border rounded text-sm"
          value={settings.low_stock_threshold || '5'}
          onChange={e => onUpdate('low_stock_threshold', e.target.value)}
          disabled={saving === 'low_stock_threshold'}
        />
      </div>
    </div>
  );
};

// ── Order Settings ──
const OrderSettings: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, saving }) => {
  const [localValues, setLocalValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setLocalValues({
      order_number_prefix: settings.order_number_prefix || 'TBE',
      return_window_days: settings.return_window_days || '30',
      auto_cancel_hours: settings.auto_cancel_hours || '48',
      min_order_amount: settings.min_order_amount || '0',
    });
  }, [settings]);

  const handleSave = async (key: string) => {
    if (localValues[key] !== settings[key]) {
      await onUpdate(key, localValues[key]);
    }
  };

  const fields = [
    { key: 'order_number_prefix', label: 'Order Number Prefix', type: 'text', description: 'Prefix for generated order numbers (e.g. TBE-00001)', placeholder: 'TBE' },
    { key: 'return_window_days', label: 'Return Window (Days)', type: 'number', description: 'Number of days customers can request a return', placeholder: '30' },
    { key: 'auto_cancel_hours', label: 'Auto-Cancel Unpaid (Hours)', type: 'number', description: 'Automatically cancel unpaid orders after this many hours (0 = disabled)', placeholder: '48' },
    { key: 'min_order_amount', label: 'Minimum Order Amount', type: 'number', description: 'Minimum order total required for checkout (0 = no minimum)', placeholder: '0' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
          <p className="text-xs text-gray-500 mb-1.5">{f.description}</p>
          <div className="flex gap-2">
            <input
              type={f.type}
              className="flex-1 p-2 border rounded text-sm"
              placeholder={f.placeholder}
              value={localValues[f.key] || ''}
              onChange={e => setLocalValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              onBlur={() => handleSave(f.key)}
              min={f.type === 'number' ? 0 : undefined}
            />
            {saving === f.key && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Shipping Settings ──
const ShippingSettings: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, saving }) => {
  const [localValues, setLocalValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setLocalValues({
      free_shipping_threshold: settings.free_shipping_threshold || '50',
      flat_rate_shipping: settings.flat_rate_shipping || '4.99',
    });
  }, [settings]);

  const handleSave = async (key: string) => {
    if (localValues[key] !== settings[key]) {
      await onUpdate(key, localValues[key]);
    }
  };

  // Parse shipping countries
  let countries: string[] = [];
  try {
    countries = JSON.parse(settings.shipping_countries || '[]');
  } catch { countries = []; }

  const allCountries = [
    { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
    { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
    { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' },
    { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' }, { code: 'NG', name: 'Nigeria' },
    { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' },
    { code: 'PT', name: 'Portugal' }, { code: 'IE', name: 'Ireland' },
    { code: 'SE', name: 'Sweden' }, { code: 'AT', name: 'Austria' },
    { code: 'CH', name: 'Switzerland' },
  ];

  const toggleCountry = (code: string) => {
    const updated = countries.includes(code)
      ? countries.filter(c => c !== code)
      : [...countries, code];
    onUpdate('shipping_countries', JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Free Shipping Threshold</label>
          <p className="text-xs text-gray-500 mb-1.5">Orders above this amount get free shipping (0 = no free shipping)</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              className="flex-1 p-2 border rounded text-sm"
              value={localValues.free_shipping_threshold || ''}
              onChange={e => setLocalValues(prev => ({ ...prev, free_shipping_threshold: e.target.value }))}
              onBlur={() => handleSave('free_shipping_threshold')}
            />
            {saving === 'free_shipping_threshold' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Flat Rate Shipping</label>
          <p className="text-xs text-gray-500 mb-1.5">Default shipping rate when order is below threshold</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              className="flex-1 p-2 border rounded text-sm"
              value={localValues.flat_rate_shipping || ''}
              onChange={e => setLocalValues(prev => ({ ...prev, flat_rate_shipping: e.target.value }))}
              onBlur={() => handleSave('flat_rate_shipping')}
            />
            {saving === 'flat_rate_shipping' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
          </div>
        </div>
      </div>

      {/* Shipping Countries */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Countries</label>
        <p className="text-xs text-gray-500 mb-2">Select which countries you ship to</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {allCountries.map(c => (
            <button
              key={c.code}
              onClick={() => toggleCountry(c.code)}
              disabled={saving === 'shipping_countries'}
              className={`p-2 border rounded text-xs text-left transition-colors ${
                countries.includes(c.code)
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="font-medium">{c.code}</span>
              <span className="ml-1 text-gray-500">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Tax Settings ──
const TaxSettings: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  onToggle: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, onToggle, saving }) => {
  const [localRate, setLocalRate] = React.useState(settings.tax_rate || '20');

  React.useEffect(() => {
    setLocalRate(settings.tax_rate || '20');
  }, [settings.tax_rate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition-colors">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Tax-Inclusive Pricing</p>
          <p className="text-xs text-gray-600">Prices shown to customers include tax</p>
        </div>
        <Toggle
          checked={settings.tax_inclusive_pricing === 'true'}
          onChange={() => onToggle('tax_inclusive_pricing', settings.tax_inclusive_pricing === 'true' ? 'false' : 'true')}
          disabled={saving === 'tax_inclusive_pricing'}
          color="green"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%)</label>
        <p className="text-xs text-gray-500 mb-1.5">Default tax percentage applied to orders</p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            max={50}
            step="0.1"
            className="w-24 p-2 border rounded text-sm"
            value={localRate}
            onChange={e => setLocalRate(e.target.value)}
            onBlur={() => { if (localRate !== settings.tax_rate) onUpdate('tax_rate', localRate); }}
          />
          <span className="text-sm text-gray-500">%</span>
          {saving === 'tax_rate' && <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />}
        </div>
      </div>
    </div>
  );
};

// ── Backups & Exports (Fixed) ──
const BackupsAndExports: React.FC = () => {
  const [exporting, setExporting] = React.useState<string | null>(null);

  const exportData = async (type: 'audit-logs' | 'users-csv' | 'all-data') => {
    setExporting(type);
    try {
      const dateStamp = new Date().toISOString().split('T')[0];

      if (type === 'users-csv') {
        // Real CSV export
        const res = await apiRequest<any>('/auth/admin/users?limit=999999', { requireAuth: true });
        const users = res.users || [];
        const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Phone', 'Role', 'Verified', 'Suspended', 'Auth Source', 'Created At'];
        const rows = users.map((u: any) => [
          u.id,
          u.email,
          u.firstName || '',
          u.lastName || '',
          u.phone || '',
          u.role,
          u.isVerified ? 'Yes' : 'No',
          u.isSuspended ? 'Yes' : 'No',
          u.googleId ? 'Google' : 'Email',
          u.createdAt ? new Date(u.createdAt).toISOString() : '',
        ]);
        const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.map((v: string) => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `users-${dateStamp}.csv`);
      } else if (type === 'audit-logs') {
        const res = await apiRequest<any>('/admin/audit-logs', { requireAuth: true });
        const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `audit-logs-${dateStamp}.json`);
      } else {
        // All data: combine users, orders, products, settings, audit logs
        const [usersRes, ordersRes, productsRes, settingsRes, auditRes] = await Promise.all([
          apiRequest<any>('/auth/admin/users?limit=999999', { requireAuth: true }).catch(() => ({ users: [] })),
          apiRequest<any>('/orders/admin/all?limit=999999', { requireAuth: true }).catch(() => ({ orders: [] })),
          apiRequest<any>('/admin/products?limit=999999', { requireAuth: true }).catch(() => ({ products: [] })),
          apiRequest<any>(API_ENDPOINTS.SETTINGS?.LIST || '/admin/settings', { requireAuth: true }).catch(() => ({ settings: [] })),
          apiRequest<any>('/admin/audit-logs', { requireAuth: true }).catch(() => ({ logs: [] })),
        ]);
        const backup = {
          exportedAt: new Date().toISOString(),
          users: usersRes.users || [],
          orders: ordersRes.orders || [],
          products: productsRes.products || [],
          settings: settingsRes.settings || [],
          auditLogs: auditRes.logs || auditRes || [],
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `full-backup-${dateStamp}.json`);
      }

      toast.success('Export completed');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export data');
    } finally {
      setExporting(null);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exports = [
    { id: 'audit-logs' as const, icon: '📋', label: 'Export Audit Logs', description: 'All audit logs as JSON' },
    { id: 'users-csv' as const, icon: '👥', label: 'Export Users (CSV)', description: 'User list as spreadsheet-ready CSV' },
    { id: 'all-data' as const, icon: '💾', label: 'Full Data Backup', description: 'Users, orders, products, settings, logs' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {exports.map(exp => (
          <button
            key={exp.id}
            onClick={() => exportData(exp.id)}
            disabled={exporting !== null}
            className="p-3 sm:p-4 border rounded hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{exp.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{exp.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{exp.description}</p>
              </div>
            </div>
            {exporting === exp.id && (
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                Exporting…
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <strong>⚠️</strong> Exports contain sensitive data. Store securely and delete after use.
      </div>
    </div>
  );
};

// ── System Health (merged from SystemPanel) ──
const SystemHealth: React.FC = () => {
  const [health, setHealth] = React.useState<{ ok: boolean; details?: any } | null>(null);
  const [checking, setChecking] = React.useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await apiRequest<any>('/health');
      setHealth({ ok: res?.status === 'OK', details: res });
    } catch (err) {
      setHealth({ ok: false, details: err });
    } finally {
      setChecking(false);
    }
  };

  React.useEffect(() => { checkHealth(); }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* API Status */}
        <div className={`p-3 border rounded ${health?.ok ? 'border-green-200 bg-green-50' : health === null ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${health?.ok ? 'bg-green-500' : health === null ? 'bg-gray-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">API Server</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{health ? (health.ok ? 'Healthy' : 'Unavailable') : 'Checking…'}</p>
        </div>

        {/* Database */}
        <div className={`p-3 border rounded ${health?.details?.database === 'connected' ? 'border-green-200 bg-green-50' : health === null ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${health?.details?.database === 'connected' ? 'bg-green-500' : health === null ? 'bg-gray-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">Database</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{health?.details?.database || 'Checking…'}</p>
        </div>

        {/* Environment */}
        <div className="p-3 border rounded">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">Environment</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{health?.details?.environment || 'Unknown'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Last checked: {health?.details?.timestamp ? new Date(health.details.timestamp).toLocaleString() : '—'}
        </p>
        <button
          onClick={checkHealth}
          disabled={checking}
          className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

// ── Invite Controls (preserved from previous implementation) ──
const InviteControls: React.FC = () => {
  const { user, authenticatedFetch, login } = useAuth();
  const [tokens, setTokens] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [lastToken, setLastToken] = React.useState<any | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    fetchTokens();
  }, [user]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/admin/superadmin/tokens', { method: 'GET' });
      setTokens(res.tokens || []);
    } catch (err) {
      console.error('Failed to load tokens', err);
    } finally { setLoading(false); }
  };

  const handleCreate = () => { setShowModal(true); };

  const handleConfirmCreate = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const res = await login(user.email, password);
      if (!res.success) {
        toast.error('Password verification failed');
        setProcessing(false);
        return;
      }
      setCreating(true);
      const created = await authenticatedFetch('/admin/superadmin/tokens', { method: 'POST', body: { expiresInHours: 24 } });
      setLastToken(created || null);
      fetchTokens();
      setShowModal(false);
      setPassword('');
    } catch (err) {
      console.error('Create token failed', err);
      toast.error((err as any)?.message || 'Create failed');
    } finally { setProcessing(false); setCreating(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this token?')) return;
    try {
      await authenticatedFetch(`/admin/superadmin/tokens/${id}/revoke`, { method: 'POST' });
      fetchTokens();
      toast.success('Token revoked');
    } catch (err) {
      console.error('Revoke failed', err);
      toast.error('Failed to revoke token');
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <button className="px-4 py-2 bg-black text-white rounded text-sm whitespace-nowrap" onClick={handleCreate} disabled={creating || processing}>
          {creating || processing ? 'Generating…' : 'Generate Invite Token'}
        </button>
        <div className="text-xs sm:text-sm text-gray-600">Tokens are single-use and expire after 24 hours.</div>
      </div>

      {lastToken && (
        <div className="mb-4 p-3 sm:p-4 border rounded bg-yellow-50">
          <div className="font-medium text-sm sm:text-base">Token (showing once):</div>
          <div className="mt-2 break-all font-mono bg-white p-2 rounded text-xs sm:text-sm">{lastToken.token}</div>
          <div className="text-xs sm:text-sm text-gray-500 mt-1">Expires at: {new Date(lastToken.expiresAt).toLocaleString()}</div>
        </div>
      )}

      <div className="bg-white border rounded p-3 sm:p-4">
        <h2 className="font-semibold text-sm sm:text-base mb-2">Active tokens</h2>
        {loading ? (
          <div className="text-xs sm:text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2 hidden sm:table-cell">Created At</th>
                  <th className="px-2 py-2 hidden md:table-cell">Expires At</th>
                  <th className="px-2 py-2 hidden lg:table-cell">Used At</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-500 text-xs sm:text-sm">No tokens</td></tr>
                )}
                {tokens.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="px-2 py-2 break-all text-xs overflow-hidden">
                      <span title={t.id}>{t.id?.slice(0, 8)}</span>
                    </td>
                    <td className="px-2 py-2 hidden sm:table-cell text-xs whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-2 py-2 hidden md:table-cell text-xs whitespace-nowrap">{new Date(t.expiresAt).toLocaleDateString()}</td>
                    <td className="px-2 py-2 hidden lg:table-cell text-xs whitespace-nowrap">{t.usedAt ? new Date(t.usedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-2 py-2">
                      {!t.usedAt && !t.revoked && (
                        <button className="px-2 py-1 text-xs border rounded whitespace-nowrap" onClick={() => handleRevoke(t.id)}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-6 rounded shadow-md w-full max-w-md mx-2">
            <h3 className="text-base sm:text-lg font-semibold mb-3">Re-enter password to confirm</h3>
            <input type="password" className="w-full p-2 border rounded mb-3 text-sm" placeholder="Current password" value={password} onChange={e => setPassword(e.target.value)} />
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button className="px-3 py-2 border rounded text-sm" onClick={() => { setShowModal(false); setPassword(''); }}>Cancel</button>
              <button className="px-3 py-2 bg-black text-white rounded text-sm" onClick={handleConfirmCreate} disabled={processing}>{processing ? 'Verifying…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Branding & Contact ──
const BrandingContactSettings: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, saving }) => {
  const [localValues, setLocalValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setLocalValues({
      store_tagline: settings.store_tagline || '',
      store_description: settings.store_description || '',
      store_phone: settings.store_phone || '',
      store_address: settings.store_address || '',
      store_logo_url: settings.store_logo_url || '',
      social_facebook: settings.social_facebook || '',
      social_instagram: settings.social_instagram || '',
      social_twitter: settings.social_twitter || '',
      social_tiktok: settings.social_tiktok || '',
    });
  }, [settings]);

  const handleSave = async (key: string) => {
    if (localValues[key] !== settings[key]) {
      await onUpdate(key, localValues[key]);
    }
  };

  const textField = (key: string, label: string, placeholder: string, type: string = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type={type}
          className="flex-1 p-2 border rounded text-sm"
          placeholder={placeholder}
          value={localValues[key] || ''}
          onChange={e => setLocalValues(prev => ({ ...prev, [key]: e.target.value }))}
          onBlur={() => handleSave(key)}
        />
        {saving === key && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Core branding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {textField('store_tagline', 'Store Tagline', 'Curated fashion for the modern soul')}
        {textField('store_logo_url', 'Logo URL', 'https://example.com/logo.png', 'url')}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Store Description</label>
        <div className="flex gap-2">
          <textarea
            className="flex-1 p-2 border rounded text-sm resize-y"
            rows={3}
            placeholder="A brief description of your store for footers, about pages, etc."
            value={localValues.store_description || ''}
            onChange={e => setLocalValues(prev => ({ ...prev, store_description: e.target.value }))}
            onBlur={() => handleSave('store_description')}
          />
          {saving === 'store_description' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
        </div>
      </div>

      {/* Contact information */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {textField('store_phone', 'Phone Number', '+44 20 7946 0958', 'tel')}
          {textField('store_address', 'Business Address', '123 Fashion Street, London, UK')}
        </div>
      </div>

      {/* Social links */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Social Media Links</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {textField('social_facebook', 'Facebook', 'https://facebook.com/thebabeledit', 'url')}
          {textField('social_instagram', 'Instagram', 'https://instagram.com/thebabeledit', 'url')}
          {textField('social_twitter', 'Twitter / X', 'https://x.com/thebabeledit', 'url')}
          {textField('social_tiktok', 'TikTok', 'https://tiktok.com/@thebabeledit', 'url')}
        </div>
      </div>
    </div>
  );
};

// ── SEO & Analytics ──
const SEOSettings: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, saving }) => {
  const [localValues, setLocalValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setLocalValues({
      seo_meta_title: settings.seo_meta_title || '',
      seo_meta_description: settings.seo_meta_description || '',
      seo_og_image_url: settings.seo_og_image_url || '',
      seo_google_analytics: settings.seo_google_analytics || '',
      seo_facebook_pixel: settings.seo_facebook_pixel || '',
    });
  }, [settings]);

  const handleSave = async (key: string) => {
    if (localValues[key] !== settings[key]) {
      await onUpdate(key, localValues[key]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Core SEO */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search Engine Defaults</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Meta Title</label>
            <p className="text-xs text-gray-500 mb-1.5">Shown in browser tabs and search results when a page has no custom title</p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={70}
                className="flex-1 p-2 border rounded text-sm"
                placeholder="The Babel Edit — Curated Fashion & Lifestyle"
                value={localValues.seo_meta_title || ''}
                onChange={e => setLocalValues(prev => ({ ...prev, seo_meta_title: e.target.value }))}
                onBlur={() => handleSave('seo_meta_title')}
              />
              {saving === 'seo_meta_title' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
            </div>
            <p className="text-xs text-gray-400 mt-1">{(localValues.seo_meta_title || '').length}/70 characters</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Meta Description</label>
            <p className="text-xs text-gray-500 mb-1.5">Shown in search engine result snippets</p>
            <div className="flex gap-2">
              <textarea
                maxLength={160}
                rows={2}
                className="flex-1 p-2 border rounded text-sm resize-y"
                placeholder="Discover curated fashion and lifestyle essentials at The Babel Edit. Premium quality, worldwide shipping."
                value={localValues.seo_meta_description || ''}
                onChange={e => setLocalValues(prev => ({ ...prev, seo_meta_description: e.target.value }))}
                onBlur={() => handleSave('seo_meta_description')}
              />
              {saving === 'seo_meta_description' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
            </div>
            <p className="text-xs text-gray-400 mt-1">{(localValues.seo_meta_description || '').length}/160 characters</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default OG Image URL</label>
            <p className="text-xs text-gray-500 mb-1.5">Image shown when your site is shared on social media (recommended: 1200×630px)</p>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 p-2 border rounded text-sm"
                placeholder="https://example.com/og-image.jpg"
                value={localValues.seo_og_image_url || ''}
                onChange={e => setLocalValues(prev => ({ ...prev, seo_og_image_url: e.target.value }))}
                onBlur={() => handleSave('seo_og_image_url')}
              />
              {saving === 'seo_og_image_url' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Analytics & Tracking</p>
        <div className="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800 mb-3">
          <strong>ℹ️</strong> These IDs are inserted into your site headings. Leave blank to disable tracking.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Google Analytics ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded text-sm font-mono"
                placeholder="G-XXXXXXXXXX"
                value={localValues.seo_google_analytics || ''}
                onChange={e => setLocalValues(prev => ({ ...prev, seo_google_analytics: e.target.value }))}
                onBlur={() => handleSave('seo_google_analytics')}
              />
              {saving === 'seo_google_analytics' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Facebook Pixel ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded text-sm font-mono"
                placeholder="123456789012345"
                value={localValues.seo_facebook_pixel || ''}
                onChange={e => setLocalValues(prev => ({ ...prev, seo_facebook_pixel: e.target.value }))}
                onBlur={() => handleSave('seo_facebook_pixel')}
              />
              {saving === 'seo_facebook_pixel' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Inventory Settings ──
const InventorySettings: React.FC<{
  settings: Record<string, string>;
  onToggle: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onToggle, saving }) => {
  const toggles = [
    { key: 'inventory_track_stock', label: 'Track Inventory', description: 'Enable stock-level tracking for all products', color: 'green' },
    { key: 'inventory_hide_out_of_stock', label: 'Hide Out-of-Stock Products', description: 'Automatically hide products with zero stock from the storefront', color: 'blue' },
    { key: 'inventory_allow_backorders', label: 'Allow Backorders', description: 'Let customers order products even when stock is at zero', color: 'amber' },
  ];

  return (
    <div className="space-y-3">
      {toggles.map(t => {
        const isOn = settings[t.key] === 'true';
        return (
          <div key={t.key} className="flex items-center justify-between p-3 sm:p-4 border rounded hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs sm:text-sm text-gray-600">{t.description}</p>
            </div>
            <Toggle
              checked={isOn}
              onChange={() => onToggle(t.key, isOn ? 'false' : 'true')}
              disabled={saving === t.key}
              color={t.color}
            />
          </div>
        );
      })}
    </div>
  );
};

// ── Payment Configuration ──
const PaymentSettings: React.FC<{
  settings: Record<string, string>;
  onToggle: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onToggle, saving }) => {
  const methods = [
    { key: 'payment_stripe_enabled', label: 'Stripe Payments', description: 'Accept credit/debit card payments via Stripe', icon: '💳', color: 'blue' },
    { key: 'payment_cod_enabled', label: 'Cash on Delivery', description: 'Allow customers to pay upon receiving their order', icon: '💵', color: 'green' },
    { key: 'payment_bank_transfer', label: 'Bank Transfer', description: 'Allow manual bank transfer payments (requires order confirmation)', icon: '🏦', color: 'amber' },
  ];

  return (
    <div className="space-y-3">
      <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800">
        <strong>⚠️</strong> Disabling all payment methods will prevent customers from completing checkout. API keys are configured securely via environment variables — they are never stored in the database.
      </div>
      {methods.map(m => {
        const isOn = settings[m.key] === 'true';
        return (
          <div key={m.key} className="flex items-center justify-between p-3 sm:p-4 border rounded hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl">{m.icon}</span>
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-900">{m.label}</p>
                <p className="text-xs sm:text-sm text-gray-600">{m.description}</p>
              </div>
            </div>
            <Toggle
              checked={isOn}
              onChange={() => onToggle(m.key, isOn ? 'false' : 'true')}
              disabled={saving === m.key}
              color={m.color}
            />
          </div>
        );
      })}
    </div>
  );
};

// ── Security Settings ──
const SecuritySettings: React.FC<{
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => Promise<void>;
  onToggle: (key: string, value: string) => Promise<void>;
  saving: string | null;
}> = ({ settings, onUpdate, onToggle, saving }) => {
  const [localValues, setLocalValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setLocalValues({
      security_max_login_attempts: settings.security_max_login_attempts || '5',
      security_lockout_minutes: settings.security_lockout_minutes || '15',
      security_session_timeout: settings.security_session_timeout || '1440',
    });
  }, [settings]);

  const handleSave = async (key: string) => {
    if (localValues[key] !== settings[key]) {
      await onUpdate(key, localValues[key]);
    }
  };

  const strongPwdOn = settings.security_enforce_strong_pwd === 'true';

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
        <strong>ℹ️</strong> Security settings take effect immediately. Changing session timeout will apply to new sessions only.
      </div>

      {/* Strong password toggle */}
      <div className="flex items-center justify-between p-3 sm:p-4 border rounded hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-gray-900">Enforce Strong Passwords</p>
          <p className="text-xs sm:text-sm text-gray-600">Require passwords with uppercase, lowercase, numbers and special characters (min 8 chars)</p>
        </div>
        <Toggle
          checked={strongPwdOn}
          onChange={() => onToggle('security_enforce_strong_pwd', strongPwdOn ? 'false' : 'true')}
          disabled={saving === 'security_enforce_strong_pwd'}
          color="blue"
        />
      </div>

      {/* Numeric fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max Login Attempts</label>
          <p className="text-xs text-gray-500 mb-1.5">Failed attempts before account lockout</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={20}
              className="w-full p-2 border rounded text-sm"
              value={localValues.security_max_login_attempts || ''}
              onChange={e => setLocalValues(prev => ({ ...prev, security_max_login_attempts: e.target.value }))}
              onBlur={() => handleSave('security_max_login_attempts')}
            />
            {saving === 'security_max_login_attempts' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Lockout Duration</label>
          <p className="text-xs text-gray-500 mb-1.5">Minutes before locked accounts can retry</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={1440}
              className="w-full p-2 border rounded text-sm"
              value={localValues.security_lockout_minutes || ''}
              onChange={e => setLocalValues(prev => ({ ...prev, security_lockout_minutes: e.target.value }))}
              onBlur={() => handleSave('security_lockout_minutes')}
            />
            {saving === 'security_lockout_minutes' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Session Timeout</label>
          <p className="text-xs text-gray-500 mb-1.5">Minutes of inactivity before auto-logout</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={5}
              max={10080}
              className="w-full p-2 border rounded text-sm"
              value={localValues.security_session_timeout || ''}
              onChange={e => setLocalValues(prev => ({ ...prev, security_session_timeout: e.target.value }))}
              onBlur={() => handleSave('security_session_timeout')}
            />
            {saving === 'security_session_timeout' && <div className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}
          </div>
          <p className="text-xs text-gray-400 mt-1">= {Math.round(Number(localValues.security_session_timeout || 1440) / 60)} hours</p>
        </div>
      </div>
    </div>
  );
};

// ── Danger Zone ──
const DangerZone: React.FC<{
  onResetSettings: () => Promise<void>;
  resetting: boolean;
}> = ({ onResetSettings, resetting }) => {
  const [confirmText, setConfirmText] = React.useState('');

  return (
    <div className="space-y-3">
      <div className="p-3 border border-red-200 rounded bg-red-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-red-900">Reset All Settings to Defaults</p>
            <p className="text-xs text-red-700 mt-0.5">This will revert all settings to their factory defaults. This cannot be undone.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder='Type "RESET" to confirm'
              className="px-2 py-1.5 border border-red-300 rounded text-xs w-36"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
            />
            <button
              onClick={() => { onResetSettings(); setConfirmText(''); }}
              disabled={confirmText !== 'RESET' || resetting}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
            >
              {resetting ? 'Resetting…' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT: SettingsPanelEnhanced (replaces old + SystemPanel)
// ═══════════════════════════════════════════════════════════
export const SettingsPanelEnhanced: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [resetting, setResetting] = React.useState(false);

  // Fetch all settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ settings: SiteSetting[] }>(
        API_ENDPOINTS.SETTINGS?.LIST || '/admin/settings',
        { requireAuth: true }
      );
      const map: Record<string, string> = {};
      for (const s of (res.settings || [])) {
        map[s.key] = s.value;
      }
      setSettings(map);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchSettings(); }, []);

  // Update a single setting
  const handleUpdate = async (key: string, value: string) => {
    setSaving(key);
    try {
      await apiRequest(
        (API_ENDPOINTS.SETTINGS?.UPDATE as (k: string) => string)?.(key) || `/admin/settings/${key}`,
        { method: 'PATCH', body: { value }, requireAuth: true }
      );
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success(`${key.replace(/_/g, ' ')} updated`);
    } catch (err) {
      console.error('Update setting error:', err);
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  // Toggle (convenience for boolean settings)
  const handleToggle = async (key: string, value: string) => {
    // For maintenance mode, add extra confirmation
    if (key === 'maintenance_mode' && value === 'true') {
      if (!window.confirm('⚠️ Turning on maintenance mode will block ALL non-admin users from using the site. Continue?')) {
        return;
      }
    }
    await handleUpdate(key, value);
  };

  // Reset all settings
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset ALL settings to defaults? This cannot be undone.')) return;
    setResetting(true);
    try {
      const res = await apiRequest<{ settings: SiteSetting[] }>(
        API_ENDPOINTS.SETTINGS?.RESET || '/admin/settings/reset',
        { method: 'POST', requireAuth: true }
      );
      const map: Record<string, string> = {};
      for (const s of (res.settings || [])) {
        map[s.key] = s.value;
      }
      setSettings(map);
      toast.success('All settings reset to defaults');
    } catch (err) {
      console.error('Reset settings error:', err);
      toast.error('Failed to reset settings');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PanelHeader title="Settings" subtitle="Store configuration and system controls" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          <span className="ml-3 text-sm text-gray-600">Loading settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PanelHeader title="Settings" subtitle="Store configuration and system controls" />

      {/* Maintenance mode banner */}
      {settings.maintenance_mode === 'true' && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-3">
          <span className="text-lg">🚧</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Maintenance Mode is ON</p>
            <p className="text-xs text-red-700">All non-admin users are currently blocked from accessing the site.</p>
          </div>
          <button
            onClick={() => handleToggle('maintenance_mode', 'false')}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            Turn Off
          </button>
        </div>
      )}

      {/* Store Configuration */}
      <SettingsSection icon="🏪" title="Store Configuration" description="Basic store details and branding">
        <StoreConfiguration settings={settings} onUpdate={handleUpdate} saving={saving} />
      </SettingsSection>

      {/* Feature Toggles */}
      <SettingsSection icon="🎛️" title="Feature Toggles" description="Enable or disable platform features">
        <FeatureToggles settings={settings} onToggle={handleToggle} saving={saving} />
      </SettingsSection>

      {/* Notification Preferences */}
      <SettingsSection icon="🔔" title="Notification Preferences" description="Configure admin email alerts" defaultOpen={false}>
        <NotificationSettings settings={settings} onUpdate={handleUpdate} onToggle={handleToggle} saving={saving} />
      </SettingsSection>

      {/* Order Settings */}
      <SettingsSection icon="📦" title="Order Settings" description="Order processing and policies" defaultOpen={false}>
        <OrderSettings settings={settings} onUpdate={handleUpdate} saving={saving} />
      </SettingsSection>

      {/* Shipping Settings */}
      <SettingsSection icon="🚚" title="Shipping Settings" description="Delivery rates and zones" defaultOpen={false}>
        <ShippingSettings settings={settings} onUpdate={handleUpdate} saving={saving} />
      </SettingsSection>

      {/* Tax Settings */}
      <SettingsSection icon="💰" title="Tax Settings" description="Tax rates and pricing configuration" defaultOpen={false}>
        <TaxSettings settings={settings} onUpdate={handleUpdate} onToggle={handleToggle} saving={saving} />
      </SettingsSection>

      {/* Branding & Contact */}
      <SettingsSection icon="🎨" title="Branding & Contact" description="Store identity, contact info, and social media links" defaultOpen={false}>
        <BrandingContactSettings settings={settings} onUpdate={handleUpdate} saving={saving} />
      </SettingsSection>

      {/* SEO & Analytics */}
      <SettingsSection icon="🔍" title="SEO & Analytics" description="Search engine defaults, OG tags, and tracking codes" defaultOpen={false}>
        <SEOSettings settings={settings} onUpdate={handleUpdate} saving={saving} />
      </SettingsSection>

      {/* Inventory Settings */}
      <SettingsSection icon="📊" title="Inventory Settings" description="Stock tracking and out-of-stock policies" defaultOpen={false}>
        <InventorySettings settings={settings} onToggle={handleToggle} saving={saving} />
      </SettingsSection>

      {/* Payment Configuration */}
      <SettingsSection icon="💳" title="Payment Configuration" description="Enable or disable payment methods" defaultOpen={false}>
        <PaymentSettings settings={settings} onToggle={handleToggle} saving={saving} />
      </SettingsSection>

      {/* Security */}
      <SettingsSection icon="🛡️" title="Security" description="Login protection, session policy, and password rules" defaultOpen={false}>
        <SecuritySettings settings={settings} onUpdate={handleUpdate} onToggle={handleToggle} saving={saving} />
      </SettingsSection>

      {/* Backups & Exports */}
      <SettingsSection icon="💾" title="Backups & Exports" description="Download site data and audit logs" defaultOpen={false}>
        <BackupsAndExports />
      </SettingsSection>

      {/* System Health */}
      <SettingsSection icon="🖥️" title="System Health" description="API and database status" defaultOpen={false}>
        <SystemHealth />
      </SettingsSection>

      {/* Super Admin Invite Tokens */}
      {user && (user.role || '').toUpperCase() === 'SUPER_ADMIN' && user.isPrimary && (
        <SettingsSection icon="🔐" title="Super Admin Invite Tokens" description="Generate and manage invite tokens" defaultOpen={false}>
          <InviteControls />
        </SettingsSection>
      )}

      {/* Danger Zone */}
      <SettingsSection icon="⚠️" title="Danger Zone" description="Destructive actions — use with caution" defaultOpen={false}>
        <DangerZone onResetSettings={handleReset} resetting={resetting} />
      </SettingsSection>
    </div>
  );
};

// Keep SystemPanel export for backward compat but it just delegates
export const SystemPanel: React.FC = () => (
  <div>
    <PanelHeader title="System Health" subtitle="Runtime & infrastructure status" />
    <SystemHealth />
  </div>
);
