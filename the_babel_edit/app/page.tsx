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
        {!loading && landingData?.landingPageBackgroundMode === 'VIDEO' && landingData.landingPageVideoUrl ? (
          // Mode: VIDEO with fallback image
          <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
            {/* Background Video */}
            <video
              autoPlay
              muted
              loop
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => {
                // Video failed, fallback will be shown via CSS
              }}
            >
              <source src={landingData.landingPageVideoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Video Fallback Image */}
            {landingData.landingPageBackgroundImage && (
              <img
                src={landingData.landingPageBackgroundImage}
                alt="Landing page background fallback"
                className="absolute inset-0 w-full h-full object-cover hidden"
                style={{ display: 'none' }}
              />
            )}

            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black transition-opacity duration-300"
              style={{ opacity: `${landingData.landingPageOverlayOpacity / 100}` }}
            ></div>

            {/* Content */}
            <div className="relative z-10 text-center !text-white px-4 max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                {landingData.landingPageTitle}
              </h1>
              <p className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-95">
                {landingData.landingPageSubtitle}
              </p>
              <button
                onClick={handleButtonClick}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {landingData.landingPageButtonText}
              </button>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </section>
        ) : !loading && landingData?.landingPageBackgroundMode === 'IMAGE' && landingData.landingPageBackgroundImage ? (
          // Mode: IMAGE background
          <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <img
              src={landingData.landingPageBackgroundImage}
              alt="Landing page background"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black transition-opacity duration-300"
              style={{ opacity: `${landingData.landingPageOverlayOpacity / 100}` }}
            ></div>

            {/* Content */}
            <div className="relative z-10 text-center text-white px-4 max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                {landingData.landingPageTitle}
              </h1>
              <p className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-95">
                {landingData.landingPageSubtitle}
              </p>
              <button
                onClick={handleButtonClick}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {landingData.landingPageButtonText}
              </button>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
 