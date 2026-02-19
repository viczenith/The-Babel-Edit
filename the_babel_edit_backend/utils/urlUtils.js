/**
 * URL utility for resolving image/upload URLs dynamically.
 * 
 * Images are stored as relative paths (/uploads/filename.jpg) in the DB.
 * This util resolves them to full URLs based on the current environment.
 */

/**
 * Get the base URL for serving uploaded files.
 * Priority: SERVER_URL env > request-derived URL > localhost fallback
 */
export function getBaseUrl(req) {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/$/, ''); // strip trailing slash
  }
  if (req) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    return `${protocol}://${host}`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
}

/**
 * Convert a relative path to a full URL.
 * If the value is already a full URL (http/https), return as-is.
 * If it's a relative path (/uploads/...), prepend the base URL.
 */
export function resolveImageUrl(relativePath, req) {
  if (!relativePath) return relativePath;
  // Already a full URL (Cloudinary, external, etc.) — leave as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  // Ensure path starts with /
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${getBaseUrl(req)}${path}`;
}

/**
 * Resolve all image URLs in a product object.
 */
export function resolveProductImages(product, req) {
  if (!product) return product;
  return {
    ...product,
    imageUrl: resolveImageUrl(product.imageUrl, req),
    images: Array.isArray(product.images) 
      ? product.images.map(img => typeof img === 'string' ? resolveImageUrl(img, req) : img)
      : product.images,
  };
}

/**
 * Extract relative path from a full URL.
 * e.g., "http://localhost:5000/uploads/file.jpg" → "/uploads/file.jpg"
 * If already relative or a Cloudinary URL, returns as-is.
 */
export function toRelativePath(fullUrl) {
  if (!fullUrl) return fullUrl;
  // Already relative
  if (fullUrl.startsWith('/')) return fullUrl;
  // Cloudinary or external CDN — keep as-is
  if (fullUrl.includes('cloudinary.com') || fullUrl.includes('res.cloudinary')) return fullUrl;
  try {
    const url = new URL(fullUrl);
    // Only convert localhost/our-server URLs to relative
    if (url.pathname.startsWith('/uploads/')) {
      return url.pathname; // e.g., /uploads/filename.jpg
    }
  } catch {
    // Not a valid URL, return as-is
  }
  return fullUrl;
}
