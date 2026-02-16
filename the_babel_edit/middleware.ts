import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Supported locales
const LOCALES = ['en', 'fr'] as const;
const DEFAULT_LOCALE = 'en';

// Helper: Extract locale from pathname
const getLocaleFromPathname = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  return LOCALES.includes(firstSegment as any) ? firstSegment : DEFAULT_LOCALE;
};

// Helper: Get pathname without locale
const getPathnameWithoutLocale = (pathname: string, locale: string): string => {
  if (pathname.startsWith(`/${locale}`)) {
    return pathname.substring(`/${locale}`.length) || '/';
  }
  return pathname;
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get current locale (defaults to 'en')
  const currentLocale = getLocaleFromPathname(pathname);
  const pathWithoutLocale = getPathnameWithoutLocale(pathname, currentLocale);

  // Allow all routes to continue
  return NextResponse.next();
}

// Apply middleware only to normal pages (skip assets and API routes)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
