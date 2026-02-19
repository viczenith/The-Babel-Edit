import { create } from 'zustand';
import { apiRequest, API_ENDPOINTS } from '../lib/api';

/* ──────────────────────────────────────────────────────────
   Site Settings Store — public settings fetched once on load
   and consumed across Footer, Contact, Checkout, Layout, etc.
   ────────────────────────────────────────────────────────── */

export interface SiteSettings {
  // General / Store
  store_name: string;
  store_contact_email: string;
  store_currency: string;
  store_timezone: string;

  // Branding & Contact
  store_tagline: string;
  store_description: string;
  store_phone: string;
  store_address: string;
  store_logo_url: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_tiktok: string;

  // SEO
  seo_meta_title: string;
  seo_meta_description: string;
  seo_og_image_url: string;
  seo_google_analytics: string;
  seo_facebook_pixel: string;

  // Notifications
  low_stock_threshold: string;

  // Orders
  order_number_prefix: string;
  return_window_days: string;
  auto_cancel_hours: string;
  min_order_amount: string;

  // Shipping
  free_shipping_threshold: string;
  flat_rate_shipping: string;
  shipping_countries: string; // JSON array string

  // Tax
  tax_rate: string;
  tax_inclusive_pricing: string;

  // Inventory
  inventory_track_stock: string;
  inventory_hide_out_of_stock: string;
  inventory_allow_backorders: string;

  // Payment
  payment_stripe_enabled: string;
  payment_cod_enabled: string;
  payment_bank_transfer: string;

  // Features
  maintenance_mode: string;
  guest_checkout: string;

  // Security
  security_max_login_attempts: string;
  security_lockout_minutes: string;
  security_session_timeout: string;
  security_enforce_strong_pwd: string;

  // Catch-all for any new keys
  [key: string]: string;
}

interface SiteSettingsState {
  settings: SiteSettings;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  getSetting: (key: string, fallback?: string) => string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  store_name: 'The Babel Edit',
  store_contact_email: 'support@babeledit.com',
  store_currency: 'USD',
  store_timezone: 'America/New_York',
  store_tagline: '',
  store_description: '',
  store_phone: '',
  store_address: '',
  store_logo_url: '',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
  social_tiktok: '',
  seo_meta_title: 'The Babel Edit — Curated Fashion & Lifestyle',
  seo_meta_description: '',
  seo_og_image_url: '',
  seo_google_analytics: '',
  seo_facebook_pixel: '',
  low_stock_threshold: '5',
  order_number_prefix: 'TBE',
  return_window_days: '30',
  auto_cancel_hours: '48',
  min_order_amount: '0',
  free_shipping_threshold: '50',
  flat_rate_shipping: '4.99',
  shipping_countries: JSON.stringify(['GB', 'US', 'FR', 'DE', 'IT', 'ES']),
  tax_rate: '20',
  tax_inclusive_pricing: 'true',
  inventory_track_stock: 'true',
  inventory_hide_out_of_stock: 'false',
  inventory_allow_backorders: 'false',
  payment_stripe_enabled: 'true',
  payment_cod_enabled: 'false',
  payment_bank_transfer: 'false',
  maintenance_mode: 'false',
  guest_checkout: 'false',
  security_max_login_attempts: '5',
  security_lockout_minutes: '15',
  security_session_timeout: '1440',
  security_enforce_strong_pwd: 'true',
};

export const useSiteSettingsStore = create<SiteSettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,
  loading: false,
  error: null,

  fetchSettings: async () => {
    // Prevent duplicate fetches
    if (get().loading || get().loaded) return;
    set({ loading: true, error: null });

    try {
      let merged = { ...DEFAULT_SETTINGS };

      // Single batch call to /admin/settings/public — returns all public-safe settings at once
      try {
        const res = await apiRequest<{ settings: Array<{ key: string; value: string }>; map: Record<string, string> }>(
          '/admin/settings/public'
        );
        if (res?.map) {
          merged = { ...merged, ...res.map };
        } else if (res?.settings) {
          for (const s of res.settings) {
            merged[s.key] = s.value;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch public settings batch, using defaults:', err);
      }

      set({ settings: merged, loaded: true, loading: false });
    } catch (err) {
      console.error('Failed to load site settings:', err);
      set({ error: 'Failed to load settings', loading: false, loaded: true });
    }
  },

  getSetting: (key: string, fallback: string = '') => {
    return get().settings[key] || fallback;
  },
}));
