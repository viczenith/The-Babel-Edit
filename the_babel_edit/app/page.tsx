'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IMAGES } from './constants/constants';
import styles from './landing.module.css';
import Footer from './components/features/Footer/Footer';
import { resolveImageUrl } from './utils/imageUrl';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest, API_ENDPOINTS } from './lib/api';
import AnnouncementBar from './components/features/AnnouncementBar/AnnouncementBar';

interface LandingPageData {
  landingPageBackgroundMode: 'NONE' | 'IMAGE' | 'VIDEO';
  landingPageVideoUrl: string;
  landingPageBackgroundImage: string;
  landingPageTitle: string;
  landingPageSubtitle: string;
  landingPageButtonText: string;
  landingPageButtonLink: string;
  landingPageOverlayOpacity: number;
  landingPageBgColor: string | null;
  landingPageTextColor: string | null;
}

export default function LandingPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [landingData, setLandingData] = useState<LandingPageData | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        // Fetch config to check visibility
        const config = await apiRequest<any>(API_ENDPOINTS.DASHBOARD.GET_CONFIG);
        if (config && config.landingPageHeroVisible === false) {
          // Landing page hero hidden by admin — show branded default
          setLoading(false);
          return;
        }

        const data = await apiRequest<any>(API_ENDPOINTS.DASHBOARD.GET_LANDING_PAGE);
        if (data && data.landingPageBackgroundMode && data.landingPageBackgroundMode !== 'NONE') {
          setLandingData({
            landingPageBackgroundMode: data.landingPageBackgroundMode,
            landingPageVideoUrl: data.landingPageVideoUrl || '',
            landingPageBackgroundImage: data.landingPageBackgroundImage || '',
            landingPageTitle: data.landingPageTitle || 'Welcome to The Babel Edit',
            landingPageSubtitle: data.landingPageSubtitle || 'Discover Premium Fashion & Lifestyle',
            landingPageButtonText: data.landingPageButtonText || 'Shop Now',
            landingPageButtonLink: data.landingPageButtonLink || '/products',
            landingPageOverlayOpacity: data.landingPageOverlayOpacity || 40,
            landingPageBgColor: data.landingPageBgColor || null,
            landingPageTextColor: data.landingPageTextColor || null,
          });
          setHasRealData(true);
        }
      } catch {
        // Silent — backend may not be running locally; branded default will show
      } finally {
        setLoading(false);
      }
    };

    fetchLandingData();
  }, []);

  const navigateTo = (path: string) => {
    router.push(`/${currentLocale}${path.startsWith('/') ? path : '/' + path}`);
  };

  const heroTextColor = landingData?.landingPageTextColor || '#ffffff';
  const heroBgColor = landingData?.landingPageBgColor || null;

  const isDarkHero = hasRealData && landingData?.landingPageBackgroundMode !== 'NONE';

  return (
    <div className={styles.container}>
      {/* Fixed Header */}
      <header className={styles.header} style={!isDarkHero ? { color: '#0f172a' } : undefined}>
        <div className={styles.logo}>
          <Image
            src={isDarkHero ? IMAGES.LOGO_WHITE_RM : IMAGES.LOGO_DARK_RM}
            alt="The Babel Edit"
            width={120}
            height={40}
            style={{ width: 'auto', height: '40px' }}
            priority
          />
        </div>
        <button className={styles.hamburger} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
          <span className={styles.hamburgerLine} style={!isDarkHero ? { background: '#0f172a' } : undefined} />
          <span className={styles.hamburgerLine} style={!isDarkHero ? { background: '#0f172a' } : undefined} />
          <span className={styles.hamburgerLine} style={!isDarkHero ? { background: '#0f172a' } : undefined} />
        </button>
        <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
          <Link href={`/${currentLocale}/dashboard`} className={styles.navLink} style={!isDarkHero && !isMenuOpen ? { color: '#0f172a', textShadow: 'none' } : undefined}>Shop Now</Link>
          <Link href={`/${currentLocale}/about`} className={styles.navLink} style={!isDarkHero && !isMenuOpen ? { color: '#0f172a', textShadow: 'none' } : undefined}>About</Link>
          <Link href={`/${currentLocale}/contact`} className={styles.navLink} style={!isDarkHero && !isMenuOpen ? { color: '#0f172a', textShadow: 'none' } : undefined}>Contact</Link>
        </nav>
      </header>

      <main className={styles.main}>
        {/* ── Hero Section ── */}
        {!loading && hasRealData && landingData?.landingPageBackgroundMode === 'VIDEO' && landingData.landingPageVideoUrl ? (
          /* ▸ VIDEO Mode */
          <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
            <video
              autoPlay muted loop playsInline preload="auto"
              poster={landingData.landingPageBackgroundImage ? resolveImageUrl(landingData.landingPageBackgroundImage) : undefined}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.95)' }}
              onError={(e) => {
                (e.target as HTMLVideoElement).style.display = 'none';
                const fallback = document.getElementById('hero-video-fallback');
                if (fallback) fallback.style.display = 'block';
              }}
              onCanPlay={(e) => { (e.target as HTMLVideoElement).play().catch(() => {}); }}
            >
              <source src={resolveImageUrl(landingData.landingPageVideoUrl)} type="video/mp4" />
              <source src={resolveImageUrl(landingData.landingPageVideoUrl)} type="video/webm" />
            </video>

            {landingData.landingPageBackgroundImage && (
              <img
                id="hero-video-fallback"
                src={resolveImageUrl(landingData.landingPageBackgroundImage)}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: 'none' }}
              />
            )}

            <div className="absolute inset-0" style={{ backgroundColor: heroBgColor || '#000', opacity: landingData.landingPageOverlayOpacity / 100 }} />
            <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-black/10" />

            <div className="relative z-10 text-center px-6 max-w-2xl">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 drop-shadow-lg tracking-tight" style={{ color: heroTextColor }}>
                {landingData.landingPageTitle}
              </h1>
              <p className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-95 font-light" style={{ color: heroTextColor }}>
                {landingData.landingPageSubtitle}
              </p>
              <button
                onClick={() => navigateTo(landingData.landingPageButtonLink)}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                {landingData.landingPageButtonText}
              </button>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
              <svg className="w-6 h-6" style={{ color: heroTextColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </section>

        ) : !loading && hasRealData && landingData?.landingPageBackgroundMode === 'IMAGE' && landingData.landingPageBackgroundImage ? (
          /* ▸ IMAGE Mode */
          <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
            <img
              src={resolveImageUrl(landingData.landingPageBackgroundImage)}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ backgroundColor: heroBgColor || '#000', opacity: landingData.landingPageOverlayOpacity / 100 }} />

            <div className="relative z-10 text-center px-6 max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg" style={{ color: heroTextColor }}>
                {landingData.landingPageTitle}
              </h1>
              <p className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-95" style={{ color: heroTextColor }}>
                {landingData.landingPageSubtitle}
              </p>
              <button
                onClick={() => navigateTo(landingData.landingPageButtonLink)}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                {landingData.landingPageButtonText}
              </button>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
              <svg className="w-6 h-6" style={{ color: heroTextColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </section>

        ) : (
          /* ▸ Branded Default — no admin content configured */
          <section
            className="relative w-full h-screen flex items-center justify-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #E3CCCB 0%, #E3DACB 50%, #f5e6df 100%)' }}
          >
            {/* Subtle ambient glow using brand red */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute top-1/4 left-1/3 w-125 h-125 rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, #E3CCCB, transparent)' }} />
              <div className="absolute bottom-1/4 right-1/4 w-150 h-150 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #E3DACB, transparent)' }} />
            </div>

            <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
              <Image
                src={IMAGES.LOGO_DARK_RM}
                alt="The Babel Edit"
                width={180}
                height={60}
                className="mx-auto mb-8 opacity-90"
                style={{ width: 'auto', height: '60px' }}
                priority
              />
              <p className="text-xs sm:text-sm uppercase tracking-[0.4em] mb-5 font-semibold" style={{ color: '#7f1d1d' }}>
                Curated Fashion &amp; Lifestyle
              </p>
              <h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-6"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#0f172a' }}
              >
                The Babel Edit
              </h1>
              <div className="w-20 h-0.5 mx-auto mb-6" style={{ backgroundColor: '#ef4444' }} />
              <p className="text-lg sm:text-xl max-w-lg mx-auto mb-10 leading-relaxed font-medium" style={{ color: '#374151' }}>
                Discover handpicked collections of clothing, shoes, bags &amp; accessories — crafted for the modern you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigateTo('/dashboard')}
                  className="inline-flex items-center gap-2 px-9 py-4 text-white rounded-full font-bold text-base transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                  style={{ backgroundColor: '#ef4444' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                >
                  Shop Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
                <Link
                  href={`/${currentLocale}/about`}
                  className="px-8 py-4 rounded-full text-base font-bold transition-all duration-300 hover:bg-black/5"
                  style={{ border: '2px solid #7f1d1d', color: '#7f1d1d' }}
                >
                  Our Story
                </Link>
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
              <svg className="w-6 h-6" style={{ color: '#7f1d1d88' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </section>
        )}

        {/* Announcement Bar */}
        <AnnouncementBar variant="banner" locale={currentLocale} />

        {/* Value Propositions */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-sm uppercase tracking-[0.3em] text-gray-500 mb-3 font-semibold">Why choose us</p>
            <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-16" style={{ color: '#0f172a' }}>The Babel Edit Experience</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              <div className="text-center group">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center transition-all duration-300" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', '--tw-bg-opacity': 1 } as React.CSSProperties} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.querySelector('svg')!.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fee2e2'; e.currentTarget.querySelector('svg')!.style.color = ''; }}>
                  <svg className="w-6 h-6 transition-colors duration-300" style={{ color: '#7f1d1d' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#0f172a' }}>Curated Styles</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto font-medium">
                  Every piece handpicked for quality, fit, and timeless appeal — no filler, only essentials.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center transition-all duration-300" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.querySelector('svg')!.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fee2e2'; e.currentTarget.querySelector('svg')!.style.color = ''; }}>
                  <svg className="w-6 h-6 transition-colors duration-300" style={{ color: '#7f1d1d' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#0f172a' }}>Secure Checkout</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto font-medium">
                  Shop with confidence — Stripe-powered payments, encrypted data, and buyer protection.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center transition-all duration-300" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.querySelector('svg')!.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fee2e2'; e.currentTarget.querySelector('svg')!.style.color = ''; }}>
                  <svg className="w-6 h-6 transition-colors duration-300" style={{ color: '#7f1d1d' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#0f172a' }}>Fast Delivery</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto font-medium">
                  Carefully packed and shipped quickly — because you shouldn't have to wait for great style.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-6" style={{ background: 'linear-gradient(180deg, #faf5f4 0%, #E3DACB33 100%)' }}>
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: '#0f172a' }}>Ready to Explore?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">
              Browse our latest collections and find pieces that define your style.
            </p>
            <Link
              href={`/${currentLocale}/dashboard`}
              className="inline-flex items-center gap-2 px-9 py-4 text-white rounded-full font-bold text-base transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              style={{ backgroundColor: '#ef4444' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
            >
              Start Shopping
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
 