'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IMAGES } from './constants/constants';
import styles from './landing.module.css';
import Footer from './components/features/Footer/Footer';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest, API_ENDPOINTS } from './lib/api';
import { toast } from 'react-hot-toast';

interface LandingPageData {
  landingPageBackgroundMode: 'NONE' | 'IMAGE' | 'VIDEO';
  landingPageVideoUrl: string;
  landingPageBackgroundImage: string;
  landingPageTitle: string;
  landingPageSubtitle: string;
  landingPageButtonText: string;
  landingPageButtonLink: string;
  landingPageOverlayOpacity: number;
  landingPageLinkText: string | null;
  landingPageLinkUrl: string | null;
  landingPageStartDate: string | null;
  landingPageEndDate: string | null;
  landingPageBgColor: string | null;
  landingPageTextColor: string | null;
  landingPagePriority: number;
}

export default function LandingPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [landingData, setLandingData] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const data = await apiRequest<any>(API_ENDPOINTS.DASHBOARD.GET_LANDING_PAGE);
        if (data) {
          setLandingData({
            landingPageBackgroundMode: data.landingPageBackgroundMode || 'NONE',
            landingPageVideoUrl: data.landingPageVideoUrl || '',
            landingPageBackgroundImage: data.landingPageBackgroundImage || '',
            landingPageTitle: data.landingPageTitle || 'Welcome to The Babel Edit',
            landingPageSubtitle: data.landingPageSubtitle || 'Discover Premium Fashion & Lifestyle',
            landingPageButtonText: data.landingPageButtonText || 'Shop Now',
            landingPageButtonLink: data.landingPageButtonLink || '/products',
            landingPageOverlayOpacity: data.landingPageOverlayOpacity || 40,
            landingPageLinkText: data.landingPageLinkText || null,
            landingPageLinkUrl: data.landingPageLinkUrl || null,
            landingPageStartDate: data.landingPageStartDate || null,
            landingPageEndDate: data.landingPageEndDate || null,
            landingPageBgColor: data.landingPageBgColor || null,
            landingPageTextColor: data.landingPageTextColor || null,
            landingPagePriority: data.landingPagePriority || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch landing page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLandingData();
  }, []);

  const handleButtonClick = () => {
    const link = landingData?.landingPageButtonLink || '/products';
    router.push(`/${currentLocale}${link.startsWith('/') ? link : '/' + link}`);
  };

  const handleLinkClick = () => {
    const link = landingData?.landingPageLinkUrl;
    if (link) {
      router.push(`/${currentLocale}${link.startsWith('/') ? link : '/' + link}`);
    }
  };

  // Check if the landing page hero is within its scheduled date range
  const isHeroScheduled = () => {
    if (!landingData) return true;
    const now = new Date();
    if (landingData.landingPageStartDate && new Date(landingData.landingPageStartDate) > now) return false;
    if (landingData.landingPageEndDate && new Date(landingData.landingPageEndDate) < now) return false;
    return true;
  };

  // Get text color (custom override or default white)
  const heroTextColor = landingData?.landingPageTextColor || '#ffffff';
  const heroBgColor = landingData?.landingPageBgColor || null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image
            src={IMAGES.LOGO_WHITE_RM}
            alt="Babel Edit Logo"
            width={120}
            height={40}
            style={{ width: 'auto', height: '40px' }}
            priority
          />
        </div>
        <button className={styles.hamburger} onClick={toggleMenu}>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </button>
        <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
          <Link href={`/${currentLocale}/dashboard`} className={styles.navLink}>Shop now</Link>
          <Link href={`/${currentLocale}/about`} className={styles.navLink}>About</Link>
          <Link href={`/${currentLocale}/contact`} className={styles.navLink}>Contact</Link>
        </nav>
      </header>

      <main className={styles.main}>
        {/* Hero Section - Three Modes */}
        {!loading && isHeroScheduled() && landingData?.landingPageBackgroundMode === 'VIDEO' && landingData.landingPageVideoUrl ? (
          // Mode: VIDEO with fallback image
          <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
            {/* Background Video — beautiful autoplay */}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={landingData.landingPageBackgroundImage || undefined}
              className="absolute inset-0 w-full h-full object-cover scale-[1.02] transition-transform duration-[2000ms]"
              style={{ filter: 'brightness(0.95)' }}
              onError={(e) => {
                // On video error, show fallback image by hiding video
                (e.target as HTMLVideoElement).style.display = 'none';
                const fallback = document.getElementById('hero-video-fallback');
                if (fallback) fallback.style.display = 'block';
              }}
              onCanPlay={(e) => {
                // Ensure autoplay starts on ready
                (e.target as HTMLVideoElement).play().catch(() => {});
              }}
            >
              <source src={landingData.landingPageVideoUrl} type="video/mp4" />
              <source src={landingData.landingPageVideoUrl} type="video/webm" />
              Your browser does not support the video tag.
            </video>

            {/* Video Fallback Image */}
            {landingData.landingPageBackgroundImage && (
              <img
                id="hero-video-fallback"
                src={landingData.landingPageBackgroundImage}
                alt="Landing page background fallback"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: 'none' }}
              />
            )}

            {/* Overlay — supports custom bg color */}
            <div
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                backgroundColor: heroBgColor || '#000000',
                opacity: landingData.landingPageOverlayOpacity / 100,
              }}
            ></div>

            {/* Subtle gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

            {/* Content */}
            <div className="relative z-10 text-center px-4 max-w-2xl animate-fade-in">
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 drop-shadow-lg tracking-tight"
                style={{ color: heroTextColor }}
              >
                {landingData.landingPageTitle}
              </h1>
              <p
                className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-95 font-light"
                style={{ color: heroTextColor }}
              >
                {landingData.landingPageSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleButtonClick}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {landingData.landingPageButtonText}
                </button>
                {landingData.landingPageLinkText && landingData.landingPageLinkUrl && (
                  <button
                    onClick={handleLinkClick}
                    className="px-6 py-3 border-2 border-white/70 font-semibold rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                    style={{ color: heroTextColor, borderColor: `${heroTextColor}80` }}
                  >
                    {landingData.landingPageLinkText}
                  </button>
                )}
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
              <svg className="w-6 h-6" style={{ color: heroTextColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </section>
        ) : !loading && isHeroScheduled() && landingData?.landingPageBackgroundMode === 'IMAGE' && landingData.landingPageBackgroundImage ? (
          // Mode: IMAGE background
          <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <img
              src={landingData.landingPageBackgroundImage}
              alt="Landing page background"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay — supports custom bg color */}
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                backgroundColor: heroBgColor || '#000000',
                opacity: landingData.landingPageOverlayOpacity / 100,
              }}
            ></div>

            {/* Content */}
            <div className="relative z-10 text-center px-4 max-w-2xl">
              <h1
                className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg"
                style={{ color: heroTextColor }}
              >
                {landingData.landingPageTitle}
              </h1>
              <p
                className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-95"
                style={{ color: heroTextColor }}
              >
                {landingData.landingPageSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleButtonClick}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {landingData.landingPageButtonText}
                </button>
                {landingData.landingPageLinkText && landingData.landingPageLinkUrl && (
                  <button
                    onClick={handleLinkClick}
                    className="px-6 py-3 border-2 border-white/70 font-semibold rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                    style={{ color: heroTextColor, borderColor: `${heroTextColor}80` }}
                  >
                    {landingData.landingPageLinkText}
                  </button>
                )}
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
              <svg className="w-6 h-6" style={{ color: heroTextColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </section>
        ) : (
          // Mode: NONE - Default gradient hero section
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.title}>{landingData?.landingPageTitle || 'Welcome to the Babel Edit'}</h1>
              <p className={styles.subtitle}>{landingData?.landingPageSubtitle || 'Your Ultimate Fashion Destination'}</p>
              <button
                onClick={handleButtonClick}
                className={styles.ctaButton}
              >
                {landingData?.landingPageButtonText || 'Explore Collection'}
              </button>
            </div>
          </section>
        )}

        <section className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👗</div>
            <h2>Exclusive Styles</h2>
            <p>Discover our curated collection of premium fashion items</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛍️</div>
            <h2>Easy Shopping</h2>
            <p>Seamless shopping experience with secure checkout</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚚</div>
            <h2>Fast Delivery</h2>
            <p>Quick and reliable shipping to your doorstep</p>
          </div>
        </section>

        <section className={styles.cta}>
          <h2>Ready to Start Shopping?</h2>
          <p>Join us today and discover the latest trends</p>
          <Link href={`/${currentLocale}/dashboard`} className={styles.ctaButton}>
            Visit Dashboard
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
 