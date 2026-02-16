'use client';
import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IMAGES } from '@/app/constants/constants';
import SearchInput from '@/app/components/ui/SearchInput/SearchInput';
import styles from './Navbar.module.css';
// icon imports
import { Shirt, Footprints, BriefcaseBusiness, Gem, PlaneLanding, Tag, ShoppingBasket, Menu, X, Search, Heart, Package, User } from 'lucide-react';
import Select from '../../ui/Select/Select';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useProductCategories } from '@/app/hooks/useProductCategories';
import en from '@/locales/en/common.json';
import fr from '@/locales/fr/common.json';
import { useCartStore, useWishlistStore } from '@/app/store';
import { useNavigationLoading } from '@/app/hooks/useNavigationLoading';

const options = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
];

function Navbar() {
  const { navigateWithLoading } = useNavigationLoading();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const currentLocale = pathname.split('/')[1] || 'en';
  const [selectOption, setSelectedOption] = useState(currentLocale);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Hydration-safe store integration
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const cartItemCount = useCartStore(state => state.totalItems);
  const rawWishlistCount = useWishlistStore(state => state.getWishlistCount());
  const wishlistCount = mounted ? rawWishlistCount : 0;
  const safeCartCount = mounted ? cartItemCount : 0;

  const translations: Record<string, Record<string, string>> = { en, fr };
  const t = (key: string) => (translations[currentLocale] || translations['en'])[key] || key;

  const handleLanguageChange = (locale: string) => {
    setSelectedOption(locale);
    const segments = pathname.split('/');
    segments[1] = locale;
    navigateWithLoading(segments.join('/'));
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      navigateWithLoading(`/${currentLocale}/products?search=${encodeURIComponent(query.trim())}`);
    }
  }, [navigateWithLoading, currentLocale]);

  // Dynamic navigation items from backend categories (fallback to default static list)
  const { categories: navCategories, loading: navCategoriesLoading } = useProductCategories();

  const defaultNavigation = [
    { icon: <Shirt className="h-3.5 w-3.5" />, label: t('clothes'), href: `/${currentLocale}/products?category=clothes`, category: 'clothes' },
    { icon: <Footprints className="h-3.5 w-3.5" />, label: t('shoes'), href: `/${currentLocale}/products?category=shoes`, category: 'shoes' },
    { icon: <BriefcaseBusiness className="h-3.5 w-3.5" />, label: t('bags'), href: `/${currentLocale}/products?category=bags`, category: 'bags' },
    { icon: <Gem className="h-3.5 w-3.5" />, label: t('accessories'), href: `/${currentLocale}/products?category=accessories`, category: 'accessories' },
  ];

  const navigationItems = (!navCategoriesLoading && navCategories && navCategories.length > 0)
    ? navCategories.slice(0, 6).map(cat => ({
        icon: <span className="text-lg">{cat.icon}</span>,
        label: cat.name,
        href: `/${currentLocale}/products?category=${cat.slug}`,
        category: cat.slug
      }))
    : defaultNavigation;


  return (
    <nav className={styles.navbar_container}>
      {/* Top Navigation - Desktop */}
      <div className={`${styles.top_nav} ${styles.desktop_only}`}>
        <Select
          options={options}
          value={selectOption}
          onChange={handleLanguageChange}
          placeholder="Language"
        />
        <button
          onClick={() => navigateWithLoading(`/${currentLocale}/account`)}
          className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          <User className="h-3 w-3" />
          <span>{t('account')}</span>
        </button>
        <button
          onClick={() => navigateWithLoading(`/${currentLocale}/orders`)}
          className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          <Package className="h-3 w-3" />
          <span>{t('orders')}</span>
        </button>
        <button
          onClick={() => navigateWithLoading(`/${currentLocale}/wishlist`)}
          className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          <Heart className="h-3 w-3" />
          <span>{t('wishlist')}</span>
        </button>
        <button
          onClick={() => navigateWithLoading(`/${currentLocale}/cart`)}
          className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span>{t('cart')}</span>
          <ShoppingBasket className="h-3 w-3" />
        </button>
      </div>

      {/* Main Navbar */}
      <div className={styles.navbar}>
        {/* Logo - Far Left */}
        <div className={styles.logo_container}>
          <button onClick={() => navigateWithLoading(`/${currentLocale}/dashboard`)} className="brand">
            <Image
              src={IMAGES.LOGO_WHITE_RM}
              alt="logo"
              width={120}
              height={40}
              className={styles.desktop_only}
            />
            <Image
              src={IMAGES.LOGO_ICON_BLACK}
              alt="logo"
              width={35}
              height={35}
              className={styles.mobile_only}
            />
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className={`${styles.nav_links} ${styles.desktop_only}`}>
          {navigationItems.map((item, index) => (
            <div key={index} className={styles.links}>
              {item.icon}
              <button
                onClick={() => navigateWithLoading(item.href)}
                className={
                  category === item.category ? styles.activeLink : ''
                }
              >
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Desktop Icons & Search */}
        <div className={`flex items-center space-x-4 ${styles.desktop_only}`}>
          <div className={styles.search}>
            <SearchInput
              onSearch={handleSearch}
              placeholder={t('searchPlaceholder')}
            />
          </div>
          <button
            onClick={() => navigateWithLoading(`/${currentLocale}/wishlist`)}
            className="relative"
          >
            <Heart className="h-4 w-4 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors" />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigateWithLoading(`/${currentLocale}/cart`)}
            className="relative"
          >
            <ShoppingBasket className="h-4 w-4 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors" />
            {safeCartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {safeCartCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div
          className={`${styles.mobile_search_container} ${styles.mobile_only}`}
        >
          <div className={styles.mobile_search_bar}>
            <SearchInput
              onSearch={handleSearch}
              placeholder={t('searchPlaceholder')}
            />
          </div>
        </div>

        {/* Mobile Icons */}
        <div className={`${styles.mobile_icons} ${styles.mobile_only}`}>
          <button
            onClick={() => navigateWithLoading(`/${currentLocale}/cart`)}
            className={`${styles.icon_button} relative`}
          >
            <ShoppingBasket className="h-5 w-5" />
            {safeCartCount > 0 && (
              <span className={styles.cart_badge}>{safeCartCount}</span>
            )}
          </button>

          <button
            onClick={toggleMenu}
            className={styles.hamburger_btn}
            aria-label="Toggle menu"
          >
            <div className={styles.hamburger_icon}>
              <span
                className={`${styles.hamburger_line} ${
                  isMenuOpen ? styles.line_top : ''
                }`}
              ></span>
              <span
                className={`${styles.hamburger_line} ${
                  isMenuOpen ? styles.line_middle : ''
                }`}
              ></span>
              <span
                className={`${styles.hamburger_line} ${
                  isMenuOpen ? styles.line_bottom : ''
                }`}
              ></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className={`${styles.mobile_menu} ${styles.menu_open}`}>
          <div className={styles.mobile_menu_content}>
            {/* Mobile Icons Row */}
            <div className="flex justify-around py-4 border-b border-gray-200">
              <button
                onClick={() => {
                  navigateWithLoading(`/${currentLocale}/wishlist`);
                  closeMenu();
                }}
                className="flex flex-col items-center space-y-1"
              >
                <div className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors relative">
                  <Heart className="h-4 w-4 text-gray-600" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">{t('wishlist')}</span>
              </button>
              <button
                onClick={() => {
                  navigateWithLoading(`/${currentLocale}/account`);
                  closeMenu();
                }}
                className="flex flex-col items-center space-y-1"
              >
                <div className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <svg
                    className="h-4 w-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span className="text-xs text-gray-600">{t('account')}</span>
              </button>
              <button
                onClick={() => {
                  navigateWithLoading(`/${currentLocale}/orders`);
                  closeMenu();
                }}
                className="flex flex-col items-center space-y-1"
              >
                <div className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Package className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-xs text-gray-600">{t('orders')}</span>
              </button>
            </div>

            {/* Language Selector */}
            <div
              className={`${styles.mobile_menu_item} py-2 border-b border-gray-200`}
            >
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <Select
                  options={options}
                  value={selectOption}
                  onChange={handleLanguageChange}
                  placeholder="Select Language"
                />
              </div>
            </div>

            {/* Mobile Menu Items */}
            <div className="space-y-1">
              {navigationItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    navigateWithLoading(item.href);
                    closeMenu();
                  }}
                  className={`${styles.mobile_menu_item} flex items-center space-x-3 px-4 py-3 text-base font-medium hover:bg-gray-50 rounded-lg transition-colors ${
                    category === item.category
                      ? 'text-blue-600 bg-blue-50 font-semibold border-l-4 border-blue-600'
                      : 'text-gray-800'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      category === item.category ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    {React.cloneElement(item.icon, {
                      className: `h-3.5 w-3.5 ${
                        category === item.category
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`,
                    })}
                  </div>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className={styles.menu_overlay}
          onClick={closeMenu}
        />
      )}
    </nav>
  );
};

export default Navbar;
