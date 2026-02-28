import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

// ── Default settings with metadata ──
// These are seeded on first GET if no rows exist yet.
const DEFAULT_SETTINGS = [
  // General / Store
  { key: 'store_name',        value: 'The Babel Edit', group: 'general',       label: 'Store Name' },
  { key: 'store_contact_email', value: '',              group: 'general',       label: 'Contact Email' },
  { key: 'store_currency',    value: 'USD',             group: 'general',       label: 'Currency' },
  { key: 'store_timezone',    value: 'America/New_York', group: 'general',       label: 'Timezone' },

  // Feature Toggles
  { key: 'maintenance_mode',       value: 'false', group: 'features', label: 'Maintenance Mode' },
  { key: 'new_user_registration',  value: 'true',  group: 'features', label: 'New User Registration' },
  { key: 'email_notifications',    value: 'true',  group: 'features', label: 'Email Notifications' },
  { key: 'promotional_emails',     value: 'false', group: 'features', label: 'Promotional Emails' },
  { key: 'guest_checkout',         value: 'false', group: 'features', label: 'Guest Checkout' },
  { key: 'review_moderation',      value: 'false', group: 'features', label: 'Review Moderation' },

  // Notifications
  { key: 'notify_new_order',      value: 'true',  group: 'notifications', label: 'New Order Alert' },
  { key: 'notify_low_stock',      value: 'true',  group: 'notifications', label: 'Low Stock Alert' },
  { key: 'notify_new_review',     value: 'false', group: 'notifications', label: 'New Review Alert' },
  { key: 'notify_new_user',       value: 'false', group: 'notifications', label: 'New User Registration Alert' },
  { key: 'low_stock_threshold',   value: '5',     group: 'notifications', label: 'Low Stock Threshold' },

  // Orders
  { key: 'order_number_prefix',    value: 'TBE',  group: 'orders', label: 'Order Number Prefix' },
  { key: 'return_window_days',     value: '30',   group: 'orders', label: 'Return Window (Days)' },
  { key: 'auto_cancel_hours',      value: '48',   group: 'orders', label: 'Auto-Cancel Unpaid Orders (Hours)' },
  { key: 'min_order_amount',       value: '0',    group: 'orders', label: 'Minimum Order Amount' },

  // Shipping
  { key: 'free_shipping_threshold', value: '50',   group: 'shipping', label: 'Free Shipping Threshold' },
  { key: 'flat_rate_shipping',      value: '4.99', group: 'shipping', label: 'Flat Rate Shipping' },
  { key: 'shipping_countries',      value: JSON.stringify(['GB', 'US', 'FR', 'DE', 'IT', 'ES']), group: 'shipping', label: 'Shipping Countries' },

  // Tax
  { key: 'tax_rate',              value: '20',    group: 'tax', label: 'Tax Rate (%)' },
  { key: 'tax_inclusive_pricing',  value: 'true',  group: 'tax', label: 'Prices Include Tax' },

  // Branding & Contact
  { key: 'store_tagline',         value: '',                  group: 'branding', label: 'Store Tagline' },
  { key: 'store_description',     value: '',                  group: 'branding', label: 'Store Description' },
  { key: 'store_phone',           value: '',                  group: 'branding', label: 'Phone Number' },
  { key: 'store_address',         value: '1616 Whistler Drive, Little Elm, TX 75068',                  group: 'branding', label: 'Business Address' },
  { key: 'store_logo_url',        value: '',                  group: 'branding', label: 'Logo URL' },
  { key: 'social_facebook',       value: '',                  group: 'branding', label: 'Facebook URL' },
  { key: 'social_instagram',      value: '',                  group: 'branding', label: 'Instagram URL' },
  { key: 'social_twitter',        value: '',                  group: 'branding', label: 'Twitter / X URL' },
  { key: 'social_tiktok',         value: '',                  group: 'branding', label: 'TikTok URL' },

  // SEO
  { key: 'seo_meta_title',        value: 'The Babel Edit — Curated Fashion & Lifestyle', group: 'seo', label: 'Default Meta Title' },
  { key: 'seo_meta_description',  value: '',                  group: 'seo', label: 'Default Meta Description' },
  { key: 'seo_og_image_url',      value: '',                  group: 'seo', label: 'Default OG Image URL' },
  { key: 'seo_google_analytics',  value: '',                  group: 'seo', label: 'Google Analytics ID' },
  { key: 'seo_facebook_pixel',    value: '',                  group: 'seo', label: 'Facebook Pixel ID' },

  // Inventory
  { key: 'inventory_track_stock',       value: 'true',  group: 'inventory', label: 'Track Inventory' },
  { key: 'inventory_hide_out_of_stock', value: 'false', group: 'inventory', label: 'Hide Out-of-Stock Products' },
  { key: 'inventory_allow_backorders',  value: 'false', group: 'inventory', label: 'Allow Backorders' },

  // Payment
  { key: 'payment_stripe_enabled',      value: 'true',  group: 'payment', label: 'Stripe Payments' },
  { key: 'payment_cod_enabled',         value: 'false', group: 'payment', label: 'Cash on Delivery' },
  { key: 'payment_bank_transfer',       value: 'false', group: 'payment', label: 'Bank Transfer' },

  // Security
  { key: 'security_max_login_attempts', value: '5',    group: 'security', label: 'Max Login Attempts' },
  { key: 'security_lockout_minutes',    value: '15',   group: 'security', label: 'Lockout Duration (Minutes)' },
  { key: 'security_session_timeout',    value: '1440', group: 'security', label: 'Session Timeout (Minutes)' },
  { key: 'security_enforce_strong_pwd', value: 'true', group: 'security', label: 'Enforce Strong Passwords' },
];

// ── Seed defaults — upserts missing keys into existing databases too ──
const ensureDefaults = async () => {
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.siteSettings.upsert({
      where: { key: setting.key },
      update: {},          // don't overwrite existing values
      create: setting,     // insert if key doesn't exist yet
    });
  }
};

// ── GET /admin/settings ── All settings (grouped) ──
export const getAllSettings = async (req, res) => {
  try {
    await ensureDefaults();

    const settings = await prisma.siteSettings.findMany({
      orderBy: { key: 'asc' },
    });

    // Group by group field
    const grouped = {};
    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push(s);
    }

    res.json({ settings, grouped });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

// ── GET /admin/settings/:key ── Single setting ──
export const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await prisma.siteSettings.findUnique({ where: { key } });
    if (!setting) {
      return res.status(404).json({ message: `Setting "${key}" not found` });
    }
    res.json({ setting });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ message: 'Failed to fetch setting' });
  }
};

// ── PATCH /admin/settings/:key ── Update single setting ──
export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ message: 'Value is required' });
    }

    const existing = await prisma.siteSettings.findUnique({ where: { key } });
    if (!existing) {
      return res.status(404).json({ message: `Setting "${key}" not found` });
    }

    const previousValue = existing.value;
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const updated = await prisma.siteSettings.update({
      where: { key },
      data: { value: stringValue },
    });

    // Audit log the change
    await appendAuditLog({
      action: 'update_setting',
      resource: 'SiteSettings',
      resourceId: key,
      details: JSON.stringify({ key, previousValue, newValue: stringValue }),
      previousValues: JSON.stringify({ value: previousValue }),
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: key === 'maintenance_mode' ? 'warning' : 'info',
    });

    res.json({ setting: updated });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Failed to update setting' });
  }
};

// ── PUT /admin/settings/bulk ── Update multiple settings at once ──
export const bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body; // Array of { key, value }

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ message: 'Settings array is required' });
    }

    const results = [];
    const auditDetails = [];

    for (const { key, value } of settings) {
      if (!key || value === undefined || value === null) continue;

      const existing = await prisma.siteSettings.findUnique({ where: { key } });
      if (!existing) continue;

      const previousValue = existing.value;
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (previousValue === stringValue) continue; // no change

      const updated = await prisma.siteSettings.update({
        where: { key },
        data: { value: stringValue },
      });

      results.push(updated);
      auditDetails.push({ key, previousValue, newValue: stringValue });
    }

    // Single audit log for bulk update
    if (auditDetails.length > 0) {
      await appendAuditLog({
        action: 'bulk_update_settings',
        resource: 'SiteSettings',
        details: JSON.stringify(auditDetails),
        userId: req.user?.userId,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: auditDetails.some(d => d.key === 'maintenance_mode') ? 'warning' : 'info',
      });
    }

    res.json({ updated: results.length, settings: results });
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

// ── POST /admin/settings/reset ── Reset all settings to defaults ──
export const resetSettings = async (req, res) => {
  try {
    // Get current values for audit
    const current = await prisma.siteSettings.findMany();
    const currentMap = {};
    for (const s of current) currentMap[s.key] = s.value;

    // Delete all and re-seed
    await prisma.siteSettings.deleteMany();
    for (const setting of DEFAULT_SETTINGS) {
      await prisma.siteSettings.create({ data: setting });
    }

    await appendAuditLog({
      action: 'reset_settings',
      resource: 'SiteSettings',
      details: JSON.stringify({ message: 'All settings reset to defaults' }),
      previousValues: JSON.stringify(currentMap),
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'critical',
    });

    const settings = await prisma.siteSettings.findMany({ orderBy: { key: 'asc' } });
    res.json({ message: 'Settings reset to defaults', settings });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ message: 'Failed to reset settings' });
  }
};

// ── Public-safe keys (never includes secrets like API keys) ──
const ALLOWED_PUBLIC_KEYS = [
  // General
  'maintenance_mode', 'store_name', 'store_currency', 'store_timezone',
  // Branding & Contact
  'store_contact_email', 'store_tagline', 'store_description', 'store_phone',
  'store_address', 'store_logo_url',
  'social_facebook', 'social_instagram', 'social_twitter', 'social_tiktok',
  // SEO (no analytics IDs — those are public too since they go in <head>)
  'seo_meta_title', 'seo_meta_description', 'seo_og_image_url',
  'seo_google_analytics', 'seo_facebook_pixel',
  // Shipping & Tax (needed for checkout)
  'free_shipping_threshold', 'flat_rate_shipping', 'shipping_countries',
  'tax_rate', 'tax_inclusive_pricing',
  // Orders (return window shown on product pages)
  'return_window_days', 'min_order_amount',
  // Inventory (controls storefront display)
  'inventory_hide_out_of_stock', 'inventory_allow_backorders',
  // Payment methods (controls checkout UI)
  'payment_stripe_enabled', 'payment_cod_enabled', 'payment_bank_transfer',
  // Features
  'guest_checkout',
];

// ── GET /admin/settings/public/:key ── Single public setting (no auth) ──
export const getPublicSetting = async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_PUBLIC_KEYS.includes(key)) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    const setting = await prisma.siteSettings.findUnique({ where: { key } });
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Get public setting error:', error);
    res.status(500).json({ message: 'Failed to fetch setting' });
  }
};

// ── GET /admin/settings/public ── All public settings in one call (no auth) ──
export const getPublicSettingsBatch = async (req, res) => {
  try {
    await ensureDefaults();

    const settings = await prisma.siteSettings.findMany({
      where: { key: { in: ALLOWED_PUBLIC_KEYS } },
      orderBy: { key: 'asc' },
    });

    const map = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    res.json({ settings: settings.map(s => ({ key: s.key, value: s.value })), map });
  } catch (error) {
    console.error('Get public settings batch error:', error);
    res.status(500).json({ message: 'Failed to fetch public settings' });
  }
};

// ── Export helper: get a setting value by key (for use in other controllers) ──
export const getSettingValue = async (key, defaultValue = null) => {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key } });
    return setting ? setting.value : defaultValue;
  } catch {
    return defaultValue;
  }
};
