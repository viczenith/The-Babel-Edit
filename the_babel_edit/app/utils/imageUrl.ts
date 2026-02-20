/**
 * Shared image URL utilities for handling backend-uploaded images.
 *
 * Images may come from:
 *  1. Cloudinary (full URL starting with https://res.cloudinary.com/...)
 *  2. Backend local storage served via /uploads/ path
 *  3. External URLs (Unsplash, etc.)
 *
 * In production, the backend is on Render (*.onrender.com) while the frontend
 * is on Vercel. Next.js <Image> requires explicit domain allowlisting.
 * For backend-hosted images we use a regular <img> tag to avoid domain issues.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
// Strip /api suffix to get the server origin
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/**
 * Check if an image URL is served from our own backend
 * (local dev or Render production) — as opposed to Cloudinary/Unsplash/etc.
 */
export function isBackendImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  // Relative /uploads/ path (stored in DB after normalization)
  if (url.startsWith('/uploads/')) return true;
  // Contains /uploads/ path segment (full URL form)
  if (url.includes('/uploads/')) return true;
  // Local development servers
  if (url.includes('localhost:5000')) return true;
  if (url.includes('127.0.0.1:5000')) return true;
  // Render production backend
  if (url.includes('.onrender.com')) return true;
  // Matches the configured API origin
  if (API_ORIGIN && API_ORIGIN !== 'http://localhost:5000' && url.startsWith(API_ORIGIN)) return true;
  return false;
}

/**
 * Resolve an image URL into a displayable src.
 *
 * For backend-hosted images:
 *   - If it's a relative /uploads/ path, prepend the API origin
 *   - If it's an absolute backend URL, use it directly (no proxy needed in production)
 *
 * For external images (Cloudinary, Unsplash):
 *   - Return as-is
 *
 * @param url - The raw image URL from the API/database
 * @param fallback - Fallback image if url is empty
 */
export function resolveImageUrl(url: string | undefined | null, fallback = '/images/babel_logo_black.jpg'): string {
  if (!url) return fallback;

  // Relative /uploads/ path — prepend API origin
  if (url.startsWith('/uploads/')) {
    return `${API_ORIGIN}${url}`;
  }

  // Already a full URL — return as-is
  return url;
}
