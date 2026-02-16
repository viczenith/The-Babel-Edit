/**
 * DYNAMIC API URL DETECTOR
 * 
 * This utility automatically detects the backend API URL by:
 * 1. Checking environment variables
 * 2. Probing common development ports
 * 3. Providing a fallback
 * 
 * This ensures the frontend works even if the backend runs on a different port
 * due to port conflicts or configuration changes.
 */

const DEVELOPMENT_PORTS = [5000, 5001, 5002, 5003, 5004, 5005];
const DEFAULT_HOST = 'localhost';
const HEALTH_ENDPOINT = '/api/health';

/**
 * Check if a port is available by making a health check request
 */
const checkPort = async (port: number, host: string = DEFAULT_HOST): Promise<boolean> => {
  try {
    const url = `http://${host}:${port}${HEALTH_ENDPOINT}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 401;
  } catch (error) {
    return false;
  }
};

/**
 * Try to find the backend API by probing common ports
 */
const detectBackendPort = async (): Promise<number | null> => {
  for (const port of DEVELOPMENT_PORTS) {
    const available = await checkPort(port);
    if (available) {
      return port;
    }
  }

  return null;
};

/**
 * Get the API base URL with dynamic detection
 */
export const getApiBaseUrl = async (): Promise<string> => {
  // 1. Check environment variable first (most explicit)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Auto-detect in development
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    const detectedPort = await detectBackendPort();
    if (detectedPort) {
      const url = `http://${DEFAULT_HOST}:${detectedPort}/api`;
      return url;
    }
  }

  // 3. Fallback to default
  const fallbackUrl = `http://${DEFAULT_HOST}:5000/api`;
  return fallbackUrl;
};

/**
 * Export the API URL for Next.js environment
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://${DEFAULT_HOST}:5000/api`;
