import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ClientProviders } from "./providers/ClientProviders";
import { RouteLoadingProvider } from "./components/providers/RouteLoadingProvider";
import ToastProvider from "./providers/ToastProvider";
import GlobalLoading from "./components/ui/GlobalLoading/GlobalLoading";
import { PWAProvider } from "./providers/PWAProvider";
import AnalyticsScripts from "./components/AnalyticsScripts";

export const metadata: Metadata = {
  // Basic SEO
  metadataBase: new URL('https://thebabeledit.com'),
  title: {
    default: 'The Babel Edit | Curated Pre-Loved Fashion from Around the World',
    template: '%s | The Babel Edit'
  },

  description: 'Discover sustainable fashion at The Babel Edit. We curate high-quality, pre-loved clothing from around the world. Vintage treasures to contemporary finds that celebrate individuality and promote conscious fashion choices.',

  keywords: [
    'sustainable fashion',
    'pre-loved clothing',
    'vintage fashion',
    'curated fashion',
    'conscious fashion',
    'secondhand designer',
    'eco-friendly fashion',
    'timeless style',
    'pre-owned luxury',
    'sustainable shopping'
  ],

  authors: [{ name: 'The Babel Edit' }],
  creator: 'The Babel Edit',
  publisher: 'The Babel Edit',

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thebabeledit.com',
    siteName: 'The Babel Edit',
    title: 'The Babel Edit | Curated Pre-Loved Fashion from Around the World',
    description: 'Discover sustainable fashion at Babel. We curate high-quality, pre-loved clothing from around the world that celebrates individuality and promotes conscious fashion choices.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'The Babel Edit - Curated Pre-Loved Fashion',
        type: 'image/jpeg',
      },
      {
        url: '/og-image-square.jpg',
        width: 600,
        height: 600,
        alt: 'The Babel Edit Logo',
        type: 'image/jpeg',
      }
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    site: '@thebabeledit', // Update with your actual Twitter handle
    creator: '@thebabeledit',
    title: 'The Babel Edit | Curated Pre-Loved Fashion',
    description: 'Sustainable, curated fashion from around the world. Vintage treasures to contemporary finds.',
    images: ['/twitter-image.jpg'],
  },

  // Icons & Manifest
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#ef4444' },
    ],
  },

  manifest: '/manifest.json',

  // Additional meta
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification and analytics meta tags
  verification: {
    google: 'your-google-verification-code', // Add your actual verification codes
    // bing: 'your-bing-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },

  // Additional tags
  other: {
    'theme-color': '#ef4444',
    'color-scheme': 'light',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Babel Edit',
    'application-name': 'The Babel Edit',
    'msapplication-TileColor': '#ef4444',
    'msapplication-config': '/browserconfig.xml'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ef4444' },
    { media: '(prefers-color-scheme: dark)', color: '#ef4444' }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://thebabeledit.com/#organization',
                  name: 'The Babel Edit',
                  url: 'https://thebabeledit.com',
                  logo: {
                    '@type': 'ImageObject',
                    url: 'https://thebabeledit.com/logo.png',
                    width: 512,
                    height: 512
                  },
                  description: 'Curated pre-loved fashion from around the world. Sustainable, timeless clothing that transcends trends.',
                  sameAs: [
                    'https://instagram.com/thebabeledit',
                    'https://twitter.com/thebabeledit'
                  ]
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://thebabeledit.com/#website',
                  url: 'https://thebabeledit.com',
                  name: 'The Babel Edit',
                  description: 'Curated pre-loved fashion from around the world',
                  publisher: {
                    '@id': 'https://thebabeledit.com/#organization'
                  },
                  potentialAction: [
                    {
                      '@type': 'SearchAction',
                      target: {
                        '@type': 'EntryPoint',
                        urlTemplate: 'https://thebabeledit.com/search?q={search_term_string}'
                      },
                      'query-input': 'required name=search_term_string'
                    }
                  ]
                },
                {
                  '@type': 'Store',
                  '@id': 'https://thebabeledit.com/#store',
                  name: 'The Babel Edit',
                  description: 'Curated pre-loved fashion store specializing in sustainable, high-quality clothing from around the world.',
                  url: 'https://thebabeledit.com',
                  telephone: '(555) 123-4567',
                  email: 'support@thebabeledit.com',
                  currenciesAccepted: 'USD',
                  paymentAccepted: 'Credit Card, PayPal, Apple Pay',
                  priceRange: '$$',
                  address: {
                    '@type': 'PostalAddress',
                    addressCountry: 'US'
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ClientProviders>
            <PWAProvider showInstallPromptOnLoad={false}>
              <RouteLoadingProvider>
                {children}
                <GlobalLoading />
                <ToastProvider />
                <AnalyticsScripts />
              </RouteLoadingProvider>
            </PWAProvider>
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
