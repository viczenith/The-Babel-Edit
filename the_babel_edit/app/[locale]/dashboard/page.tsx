'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Menu, X, ShoppingBag, Search, User, Heart, Star, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import FeedbackModal from '@/app/components/FeedbackModal';
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface Feedback {
  id: string;
  message: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
}

interface Testimonial {
  id: string;
  comment: string;
  rating: number;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// Your original components would be imported here
import NavbarWithSuspense from '@/app/components/features/Navbar/NavbarWithSuspense'
import AnnouncementBar from '@/app/components/features/AnnouncementBar/AnnouncementBar';
import Carousel from '@/app/components/features/Carousel/Carousel';
import FeedbackCarousel from '@/app/components/features/FeedbackCarousel/FeedbackCarousel';
import Footer from '@/app/components/features/Footer/Footer';
import { useProductStore, useCartStore, useWishlistStore, Product } from '@/app/store';
import { useAuth } from '@/app/context/AuthContext';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';

const TextDivider = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center py-8">
    <div className="flex-grow h-px bg-gray-300"></div>
    <h2 className="mx-8 text-2xl md:text-3xl font-bold text-gray-900">{text}</h2>
    <div className="flex-grow h-px bg-gray-300"></div>
  </div>
);

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');

/** Check if an image URL points to our backend (local dev or Render production) */
const isBackendImageUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  if (url.includes('/uploads/')) return true;
  if (url.includes('localhost:5000')) return true;
  if (url.includes('.onrender.com')) return true;
  if (API_HOST && url.startsWith(API_HOST)) return true;
  return false;
};

const TransparentImageCard = ({ backgroundImage, title, subtitle, description, className }: {
  backgroundImage: string;
  title: string;
  subtitle: string;
  description: string;
  className: string;
}) => {
  // Check if image is from backend
  const isBackendUrl = isBackendImageUrl(backgroundImage);
  
  return (
    <div className={`relative group overflow-hidden rounded-xl ${className}`}>
      {backgroundImage && (
        isBackendUrl ? (
          // Use regular img for backend URLs to avoid Next.js Image optimization issues
          <img
            src={backgroundImage}
            alt={title || 'Card image'}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Crect fill="%23d1d5db" width="24" height="24"/%3E%3C/svg%3E';
            }}
          />
        ) : (
          // Use Next.js Image for external URLs
          <Image
            src={backgroundImage}
            alt={title || 'Card image'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized={false}
          />
        )
      )}
      {!backgroundImage && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400">No Highlight available</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end">
        <div className="w-full h-24 md:h-28 p-6 text-white bg-white/10 backdrop-blur-md backdrop-saturate-150 border-t border-white/20 flex flex-col justify-center">
          <h3 className="text-xl md:text-2xl font-bold mb-2 line-clamp-1">{title}</h3>
          <p className="text-sm opacity-90 line-clamp-2">{description}</p>
        </div>
      </div>
    </div>
  );
};

// Square Product Card specifically for "Popular This Week" section
const SquareProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'en';

  const isProductInWishlist = isInWishlist(product.id);
  const isProductInCart = useCartStore(state => state.isInCart(product.id));

  const handleProductClick = () => {
    router.push(`/${locale}/products/${product.id}`);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is authenticated
    if (!user) {
      toast.error('Please sign in to add items to cart', {
        duration: 3000,
        position: 'top-right',
      });
      router.push(`/${locale}/auth/login`);
      return;
    }

    try {
      await addToCart(product.id, 1);
      toast.success(`${product.name} added to cart!`, {
        duration: 3000,
        position: 'top-right',
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart. Please try again.', {
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is authenticated
    if (!user) {
      toast.error('Please sign in to add items to wishlist', {
        duration: 3000,
        position: 'top-right',
      });
      router.push(`/${locale}/auth/login`);
      return;
    }

    try {
      if (isProductInWishlist) {
        await removeFromWishlist(product.id);
        toast.success(`${product.name} removed from wishlist`, {
          duration: 2000,
        });
      } else {
        await addToWishlist(product.id);
        toast.success(`${product.name} added to wishlist!`, {
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      toast.error(`Failed to ${isProductInWishlist ? 'remove from' : 'add to'} wishlist`, {
        duration: 3000,
      });
    }
  };

  return (
    <div
      className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-72 rounded-2xl bg-white shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden group cursor-pointer snap-center"
      style={{ transform: 'translateZ(0)' }}
      onClick={handleProductClick}
    >
      {/* Square Image Container */}
      <div className="relative w-full aspect-square overflow-hidden">
        {(() => {
          const imageUrl = product.imageUrl || product.images?.[0] || '/placeholder-product.jpg';
          const isBackendUrl = isBackendImageUrl(imageUrl);

          return isBackendUrl ? (
            <img
              src={imageUrl}
              alt={product.name || 'Product image'}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-product.jpg'; }}
            />
          ) : (
            <Image
              src={imageUrl}
              alt={product.name || 'Product image'}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          );
        })()}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Discount badge */}
        {product.isActive && product.discountPercentage > 0 && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg tracking-wide">
            -{product.discountPercentage}% OFF
          </div>
        )}

        {/* Featured badge */}
        {product.isFeatured && !(product.isActive && product.discountPercentage > 0) && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <Star className="w-3 h-3 fill-white" /> Featured
          </div>
        )}

        {/* Wishlist Button — always visible on mobile, hover on desktop */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md border border-white/30 shadow-lg transition-all duration-300 hover:scale-110 ${
            isProductInWishlist
              ? 'bg-pink-500/90 opacity-100'
              : 'bg-white/80 opacity-100 md:opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-4 h-4 transition-colors duration-300 ${
            isProductInWishlist ? 'fill-white text-white' : 'text-gray-700'
          }`} />
        </button>

        {/* Quick Add to Cart — slides up from bottom on hover */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out">
          <button
            onClick={handleAddToCart}
            disabled={isProductInCart}
            className="w-full py-3 bg-black/80 backdrop-blur-md text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4" />
            {isProductInCart ? 'In Cart' : 'Quick Add'}
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-gray-700 transition-colors">
            {product.name}
          </h3>
          {product.collection && (
            <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wider">{product.collection.name}</p>
          )}
        </div>

        {/* Rating */}
        {product.avgRating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.round(product.avgRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-gray-500 ml-1">({product.reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-900 text-lg">
            ${product.price}
          </span>
          {product.comparePrice && (
            <span className="text-xs text-gray-400 line-through">
              ${product.comparePrice}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
const ArrowButton = ({ direction, onClick, className }: {
  direction: 'left' | 'right';
  onClick: () => void;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`absolute top-1/2 transform -translate-y-1/2 z-10 rounded-full p-3.5 shadow-xl backdrop-blur-md border border-white/40 transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95 ${direction === 'left' ? 'left-2 md:left-4' : 'right-2 md:right-4'
      } ${className}`}
    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,240,245,0.9) 100%)' }}
  >
    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d={direction === 'left' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  </button>
);

function Dashboard() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  // Store integration
  const {
    fetchFeaturedProducts,
    fetchProducts,
    featuredProducts,
    products,
    loading,
    error
  } = useProductStore();

  // Additional state for collections/categories
  const [collections, setCollections] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [highlightCards, setHighlightCards] = useState<any[]>([]);
  const [summerBanner, setSummerBanner] = useState<any>(null);
  const [featuredFeedbacks, setFeaturedFeedbacks] = useState<Feedback[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    // Fetch featured products from backend
    fetchFeaturedProducts(8); // Get 8 featured products

    // Fetch collections for the highlight cards
    fetchCollections();

    // Fetch dashboard content from API
    fetchHeroData();
    fetchHighlightCardsData();
    fetchSummerBannerData();
  }, []);

  useEffect(() => {
    const fetchFeaturedFeedbacks = async () => {
      try {
        const data = await apiRequest<Feedback[]>(API_ENDPOINTS.FEEDBACK.FEATURED);
        setFeaturedFeedbacks(data);
      } catch (error) {
        console.error('Failed to fetch featured feedbacks:', error);
      } finally {
        setFeedbacksLoading(false);
      }
    };
    fetchFeaturedFeedbacks();
  }, []);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await apiRequest<Testimonial[]>(API_ENDPOINTS.ADMIN.TESTIMONIALS.PUBLIC_LIST);
        setTestimonials(data);
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
      } finally {
        setTestimonialsLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  // Fetch featured feedbacks for display on dashboard
  const fetchFeaturedFeedbacks = async () => {
    try {
      const data = await apiRequest<Feedback[]>(API_ENDPOINTS.FEEDBACK.FEATURED);
      setFeaturedFeedbacks(data);
    } catch (error) {
      console.error('Failed to fetch featured feedbacks:', error);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedFeedbacks();
  }, []);

  // Fetch collections for the highlight section
  const fetchCollections = async () => {
    try {
      const response = await apiRequest<any>('/collections');
      setCollections(response.collections || response || []);
    } catch (error) {
      console.warn('Backend not available, using fallback collections:');
      // Set empty collections array so the page still renders with default cards
      setCollections([]);
    }
  };

  const fetchHeroData = async () => {
    try {
      const data = await apiRequest<any[]>(API_ENDPOINTS.DASHBOARD.GET_HERO_SLIDES);
      if (Array.isArray(data) && data.length > 0) {
        // Normalize to expected slide shape (id, imageUrl, alt, description)
        const normalized = data.map((s) => ({
          id: s.id,
          imageUrl: s.imageUrl || s.image || '',
          alt: s.alt || s.title || '',
          description: s.description || '',
        }));
        setHeroSlides(normalized);
      } else {
        setHeroSlides(getDefaultHeroSlides());
      }
    } catch (error) {
      console.warn('Failed to fetch hero slides from API, using defaults:', error);
      setHeroSlides(getDefaultHeroSlides());
    }
  };

  const fetchHighlightCardsData = async () => {
    try {
      const data = await apiRequest<any[]>(API_ENDPOINTS.DASHBOARD.GET_HIGHLIGHT_CARDS);
      if (Array.isArray(data) && data.length > 0) {
        // Normalize API response to ensure all fields are present
        const normalized = data.map((card: any) => ({
          id: card.id || '',
          title: card.title || 'Highlight Item',
          description: card.description || '',
          imageUrl: card.imageUrl || card.image || '',
          position: card.position || 0
        }));
        setHighlightCards(normalized);
      } else {
        setHighlightCards(getDefaultHighlightCards());
      }
    } catch (error) {
      setHighlightCards(getDefaultHighlightCards());
    }
  };

  const fetchSummerBannerData = async () => {
    try {
      const data = await apiRequest<any>(API_ENDPOINTS.DASHBOARD.GET_SUMMER_BANNER);
      if (data) {
        // Normalize the response to ensure all fields are present with proper defaults
        const normalized = {
          id: data.id || 'default',
          summerBannerTitle: data.summerBannerTitle || '',
          summerBannerDescription: data.summerBannerDescription || data.description || '',
          summerBannerButtonText: data.summerBannerButtonText || '',
          summerBannerCountdownDays: data.summerBannerCountdownDays || 7,
          summerBannerCountdownHours: data.summerBannerCountdownHours || 8,
          summerBannerCountdownMinutes: data.summerBannerCountdownMinutes || 4,
          summerBannerCountdownSeconds: data.summerBannerCountdownSeconds || 5,
          summerBannerBackgroundImage: data.summerBannerBackgroundImage || data.backgroundImage || data.image || '',
          summerBannerLinkText: data.summerBannerLinkText || null,
          summerBannerLinkUrl: data.summerBannerLinkUrl || null,
          summerBannerStartDate: data.summerBannerStartDate || null,
          summerBannerEndDate: data.summerBannerEndDate || null,
          summerBannerBgColor: data.summerBannerBgColor || null,
          summerBannerTextColor: data.summerBannerTextColor || null,
          summerBannerPriority: data.summerBannerPriority || 0
        };
        setSummerBanner(normalized);
      } else {
        setSummerBanner(getDefaultSummerBanner());
      }
    } catch (error) {
      console.warn('Failed to fetch summer banner from API, using defaults:', error);
      setSummerBanner(getDefaultSummerBanner());
    }
  };

  const getDefaultHeroSlides = () => [
    {
      id: '1',
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop',
      alt: 'Fashion Collection',
      description: 'Discover the latest fashion trends'
    },
    {
      id: '2',
      imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=600&fit=crop',
      alt: 'Luxury Shopping',
      description: 'Experience luxury like never before'
    },
    {
      id: '3',
      imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=600&fit=crop',
      alt: 'Summer Collection',
      description: 'New summer arrivals are here'
    },
    {
      id: '4',
      imageUrl: 'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=1200&h=600&fit=crop',
      alt: 'Forest path with tall trees',
      description: 'Walk through ancient forests and connect with nature'
    }
  ];

  const getDefaultHighlightCards = () => [
    {
      id: '1',
      title: t('exclusiveShoes'),
      description: t('priceOff', { percent: 20 }),
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=500&fit=crop',
      position: 0
    },
    {
      id: '2',
      title: t('exquisiteStyles'),
      description: t('priceOff', { percent: 15 }),
      imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=500&fit=crop',
      position: 1
    },
    {
      id: '3',
      title: t('newArrivals'),
      description: t('priceOff', { percent: 25 }),
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=500&fit=crop',
      position: 2
    },
    {
      id: '4',
      title: t('exclusiveItems'),
      description: t('priceOff', { percent: 30 }),
      imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=500&fit=crop',
      position: 3
    }
  ];

  const getDefaultSummerBanner = () => ({
    id: 'default',
    summerBannerTitle: 'SUMMER COLLECTIONS',
    summerBannerDescription: 'Limited time offer - Don\'t miss out!',
    summerBannerButtonText: 'SHOP NOW →',
    summerBannerCountdownDays: 7,
    summerBannerCountdownHours: 8,
    summerBannerCountdownMinutes: 4,
    summerBannerCountdownSeconds: 5,
    summerBannerBackgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop&crop=center'
  });

  // Your original translation function
  const t = (key: string, vars?: { [key: string]: string | number }) => {
    const translations: { [locale: string]: { [key: string]: string } } = {
      en: {
        thisWeeksHighlight: "This Week's Highlight",
        exclusiveShoes: "Exclusive Collection",
        exquisiteStyles: "Exquisite Styles",
        priceOff: `Special Offer ${vars?.percent || 20}% off`,
        popularThisWeek: "Popular This Week",
        brandsForYou: "Brands For You",
        newArrivals: "New Arrivals",
        exclusiveItems: "Exclusive Items"
      } 
    };
    let str = translations[locale]?.[key] || translations['en'][key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{{${k}}}`, String(v));
      });
    }
    return str;
  };

  const productsWrapperRef = useRef<HTMLDivElement>(null);
  const [currentPosition, setCurrentPosition] = useState(0);

  const scrollProducts = (direction: 'left' | 'right') => {
    if (!productsWrapperRef.current) return;

    const cardWidth = 288; // Width of square cards (w-72 = 18rem = 288px)
    const gap = 24; // Gap between cards (1.5rem = 24px)
    const scrollAmount = cardWidth + gap;
    const containerWidth = productsWrapperRef.current.parentElement?.clientWidth || 0;
    const totalWidth = productsWrapperRef.current.scrollWidth;
    const maxScroll = -(totalWidth - containerWidth);

    if (direction === 'left') {
      setCurrentPosition(prev => Math.min(0, prev + scrollAmount));
    } else {
      setCurrentPosition(prev => Math.max(maxScroll, prev - scrollAmount));
    }
  };

  // Create highlight cards from collections
  const getHighlightCardsDisplay = () => {
    // If we have highlight cards from API, use them
    if (highlightCards.length > 0) {
      return highlightCards.map(card => ({
        title: card.title || 'Featured Item',
        description: card.description || '',
        image: card.imageUrl || card.image || ''
      }));
    }

    // Fall back to collections if available
    if (collections.length > 0) {
      return collections.slice(0, 4).map((collection, index) => ({
        title: collection.name || 'Featured Item',
        description: collection.description || '',
        image: collection.imageUrl || ''
      }));
    }

    // Use default cards as last resort
    return getDefaultHighlightCards().map(card => ({
      title: card.title || 'Featured Item',
      description: card.description || '',
      image: card.imageUrl || ''
    }));
  };

  const displayHighlightCards = getHighlightCardsDisplay();

  return (
    <div className="min-h-screen">
      <header>
        <NavbarWithSuspense />
        <AnnouncementBar variant="banner" locale={locale} />
      </header>

      <section>
        <Carousel
          slides={heroSlides.map(slide => ({
            id: slide.id,
            image: slide.imageUrl,
            alt: slide.alt,
            description: slide.description
          }))}
          height="500px"
        />
      </section>

      <TextDivider text={t('thisWeeksHighlight')} />

      <section className="py-8 px-4 max-w-7xl mx-auto">
        {/* Desktop: Your original asymmetric layout, Mobile: 2-column grid */}
        <article className="hidden md:flex justify-center gap-4 mb-4">
          <TransparentImageCard
            backgroundImage={displayHighlightCards[0]?.image}
            title={displayHighlightCards[0]?.title}
            subtitle={displayHighlightCards[0]?.title}
            description={displayHighlightCards[0]?.description}
            className="flex-[0_0_30%] min-w-[250px] h-96"
          />
          <TransparentImageCard
            backgroundImage={displayHighlightCards[1]?.image}
            title={displayHighlightCards[1]?.title}
            subtitle={displayHighlightCards[1]?.title}
            description={displayHighlightCards[1]?.description}
            className="flex-[0_0_60%] min-w-[250px] h-96"
          />
        </article>

        <article className="hidden md:flex justify-center gap-4">
          <TransparentImageCard
            backgroundImage={displayHighlightCards[2]?.image}
            title={displayHighlightCards[2]?.title}
            subtitle={displayHighlightCards[2]?.title}
            description={displayHighlightCards[2]?.description}
            className="flex-[0_0_60%] min-w-[250px] h-96"
          />
          <TransparentImageCard
            backgroundImage={displayHighlightCards[3]?.image}
            title={displayHighlightCards[3]?.title}
            subtitle={displayHighlightCards[3]?.title}
            description={displayHighlightCards[3]?.description}
            className="flex-[0_0_30%] min-w-[250px] h-96"
          />
        </article>

        {/* Mobile: 2x2 Grid */}
        <div className="md:hidden grid grid-cols-2 gap-4">
          {displayHighlightCards.map((card, index) => (
            <TransparentImageCard
              key={index}
              backgroundImage={card.image}
              title={card.title}
              subtitle={card.title}
              description={card.description}
              className="h-64"
            />
          ))}
        </div>
      </section>

      <TextDivider text={t('popularThisWeek')} />

      <section className="py-16 md:py-20 relative max-w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #f8f9fc 0%, #eef1f8 50%, #f8f9fc 100%)' }}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          {/* Section subtitle */}
          <p className="text-center text-sm text-gray-400 uppercase tracking-[0.2em] mb-2 font-medium">Curated for you</p>

          {/* Mobile scroll hint */}
          <div className="flex items-center justify-center gap-2 mb-6 md:hidden">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>Swipe to explore</span>
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>

          {/* Desktop: Arrow navigation */}
          <ArrowButton
            direction="left"
            onClick={() => scrollProducts('left')}
            className={`hidden md:flex ${currentPosition === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
          />

          {/* Products Container */}
          <div className="overflow-x-auto md:overflow-hidden px-2 sm:px-4 md:px-16 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <div
              ref={productsWrapperRef}
              className="flex gap-4 sm:gap-5 md:gap-6 md:transition-transform md:duration-500 md:ease-out pb-6 snap-x snap-mandatory md:snap-none"
              style={{
                transform: `translateX(${currentPosition}px)`,
              }}
            >
              {loading ? (
                // Skeleton loader with shimmer
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-72 bg-white rounded-2xl shadow-md overflow-hidden snap-center">
                    <div className="w-full aspect-square relative overflow-hidden bg-gray-100">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease-in-out infinite',
                        }}
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-100 rounded-full w-3/4" style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
                      <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                      <div className="flex items-center gap-2">
                        <div className="h-5 bg-gray-100 rounded-full w-16" />
                        <div className="h-3 bg-gray-100 rounded-full w-12" />
                      </div>
                    </div>
                  </div>
                ))
              ) : error ? (
                // Error state
                <div className="flex flex-col items-center justify-center py-16 px-4 w-full">
                  <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
                    <span className="text-4xl">⚠️</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Products</h3>
                  <p className="text-gray-500 text-center max-w-sm mb-6 text-sm leading-relaxed">
                    {error.includes('Failed to fetch')
                      ? 'We couldn\'t reach our servers. Please check your connection and try again.'
                      : error
                    }
                  </p>
                  <button
                    onClick={() => fetchFeaturedProducts(8, true)}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Try Again
                  </button>
                </div>
              ) : featuredProducts.length > 0 ? (
                featuredProducts.filter(p => p.stock > 0).map((product) => (
                  <SquareProductCard key={product.id} product={product} />
                ))
              ) : (
                // Empty state
                <div className="flex flex-col items-center justify-center py-16 px-4 w-full">
                  <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-5">
                    <span className="text-4xl">📦</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Featured Products</h3>
                  <p className="text-gray-500 text-center max-w-sm text-sm leading-relaxed">
                    Our featured collection is being refreshed. Check back soon for handpicked selections.
                  </p>
                  <button
                    onClick={() => fetchFeaturedProducts(8, true)}
                    className="mt-5 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          <ArrowButton
            direction="right"
            onClick={() => scrollProducts('right')}
            className={`hidden md:flex ${currentPosition <= -(productsWrapperRef.current?.scrollWidth || 0) +
                (productsWrapperRef.current?.parentElement?.clientWidth || 0)
                ? 'opacity-30 cursor-not-allowed' : ''
              }`}
          />

          {/* View All CTA */}
          {!loading && !error && featuredProducts.length > 0 && (
            <div className="flex justify-center mt-10">
              <Link
                href={`/${locale}/products`}
                className="group inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-gray-900 text-gray-900 text-sm font-semibold hover:bg-gray-900 hover:text-white transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/10"
              >
                View All Products
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Shimmer keyframes */}
        <style jsx>{`
          @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </section>

      <AnnouncementBar variant="banner" locale={locale} />
      <TextDivider text={t('brandsForYou')} />

      <section className="py-8 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 items-center">
          {[
            { name: "Nike", src: "https://logos-world.net/wp-content/uploads/2020/04/Nike-Logo.png" },
            { name: "Adidas", src: "https://logos-world.net/wp-content/uploads/2020/04/Adidas-Logo.png" },
            { name: "Gucci", src: "https://logos-world.net/wp-content/uploads/2020/04/Gucci-Logo.png" },
            { name: "Louis Vuitton", src: "https://logos-world.net/wp-content/uploads/2020/04/Louis-Vuitton-Logo.png" },
            { name: "Zara", src: "https://logos-world.net/wp-content/uploads/2020/05/Zara-Logo-700x394.png" },
            { name: "H&M", src: "https://logos-world.net/wp-content/uploads/2020/04/HM-Logo-700x394.png" },
            { name: "Puma", src: "https://logos-world.net/wp-content/uploads/2020/04/Puma-Logo.png" },
            { name: "Uniqlo", src: "https://logos-world.net/wp-content/uploads/2023/01/Uniqlo-Logo-500x281.png" },
            { name: "Chanel" },
            { name: "Prada" },
            { name: "Dior" },
            { name: "Versace" },
            { name: "Balenciaga", src: "https://logowik.com/content/uploads/images/balenciaga5106.jpg" },
            { name: "Fendi" },
            { name: "Burberry", src: "https://static.cdnlogo.com/logos/b/6/burberry.svg" },
            { name: "Hermes" },
          ].map((brand, index) => (
            <div key={index} className="flex items-center justify-center p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-300 group">
              {brand.src ? (
                <img
                  src={brand.src}
                  alt={brand.name}
                  className="h-6 md:h-8 w-auto object-contain opacity-60 group-hover:opacity-90 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                  onError={(e) => {
                    // Replace with text fallback on error
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">${brand.name}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">
                  {brand.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <TextDivider text="Share Your Thoughts" />
      <section className="py-8 px-4 max-w-7xl mx-auto text-center">
        <p className="text-lg text-gray-600 mb-6 text-center">
          Your feedback helps us grow! Share your suggestions, report issues, or simply say hello.
        </p>
        <Button onClick={() => setShowFeedbackModal(true)} className="px-8 py-3 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300">
          <MessageSquarePlus className="mr-3 h-5 w-5" />
          Leave Feedback
        </Button>
        <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} locale={locale} />
      </section>

      <section className="py-8 px-4 max-w-7xl mx-auto">
        {/* Summer Banner Carousel — with scheduling support */}
        {(() => {
          // Check scheduling: hide banner if outside date range
          const now = new Date();
          const startDate = summerBanner?.summerBannerStartDate ? new Date(summerBanner.summerBannerStartDate) : null;
          const endDate = summerBanner?.summerBannerEndDate ? new Date(summerBanner.summerBannerEndDate) : null;
          const isScheduled = (!startDate || startDate <= now) && (!endDate || endDate >= now);

          if (!isScheduled) return null;

          const bannerTextColor = summerBanner?.summerBannerTextColor || '#ffffff';
          const bannerBgColor = summerBanner?.summerBannerBgColor || null;

          return (
            <div className="relative rounded-2xl overflow-hidden group">
              {(() => {
                const bannerImage = summerBanner?.summerBannerBackgroundImage || getDefaultSummerBanner().summerBannerBackgroundImage;
                const isBackendUrl = isBackendImageUrl(bannerImage);
                
                return isBackendUrl ? (
                  <img
                    src={bannerImage}
                    alt="Summer Collection"
                    className="w-full h-auto min-h-[400px] md:min-h-[500px] object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"%3E%3Crect fill="%23d1d5db" width="1200" height="600"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%239ca3af"%3ESummer Banner%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <Image
                    src={bannerImage}
                    alt="Summer Collection"
                    width={1200}
                    height={600}
                    className="w-full h-auto object-cover min-h-[400px] md:min-h-[500px]"
                  />
                );
              })()}
              
              {/* Gradient Overlay — supports custom bg color */}
              <div
                className="absolute inset-0"
                style={{
                  background: bannerBgColor
                    ? `linear-gradient(to right, ${bannerBgColor}99, ${bannerBgColor}66, ${bannerBgColor}33)`
                    : 'linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.4), rgba(0,0,0,0.2))'
                }}
              />
              
              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-center md:justify-start">
                <div className="text-center md:text-left p-6 md:p-12 md:ml-8 max-w-md">
                  <h2
                    className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg"
                    style={{ color: bannerTextColor }}
                  >
                    {summerBanner?.summerBannerTitle || getDefaultSummerBanner().summerBannerTitle}
                  </h2>
                  <p
                    className="text-lg mb-8 drop-shadow-md font-semibold"
                    style={{ color: bannerTextColor }}
                  >
                    {summerBanner?.summerBannerDescription || getDefaultSummerBanner().summerBannerDescription}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
                    <button className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                      {summerBanner?.summerBannerButtonText || getDefaultSummerBanner().summerBannerButtonText}
                    </button>
                    {summerBanner?.summerBannerLinkText && summerBanner?.summerBannerLinkUrl && (
                      <Link
                        href={`/${locale}${summerBanner.summerBannerLinkUrl.startsWith('/') ? summerBanner.summerBannerLinkUrl : '/' + summerBanner.summerBannerLinkUrl}`}
                        className="px-6 py-4 border-2 rounded-full font-bold hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                        style={{ color: bannerTextColor, borderColor: `${bannerTextColor}80` }}
                      >
                        {summerBanner.summerBannerLinkText}
                      </Link>
                    )}
                  </div>
                  
                  {/* Countdown Timer */}
                  <div className="flex justify-center md:justify-start gap-2 mt-10" style={{ color: bannerTextColor }}>
                    <div className="text-center bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20">
                      <div className="text-2xl md:text-3xl font-bold">
                        {String(summerBanner?.summerBannerCountdownDays || getDefaultSummerBanner().summerBannerCountdownDays).padStart(2, '0')}
                      </div>
                      <div className="text-xs md:text-sm opacity-80">Days</div>
                    </div>
                    <div className="flex items-center text-2xl md:text-3xl opacity-50">:</div>
                    <div className="text-center bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20">
                      <div className="text-2xl md:text-3xl font-bold">
                        {String(summerBanner?.summerBannerCountdownHours || getDefaultSummerBanner().summerBannerCountdownHours).padStart(2, '0')}
                      </div>
                      <div className="text-xs md:text-sm opacity-80">Hours</div>
                    </div>
                    <div className="flex items-center text-2xl md:text-3xl opacity-50">:</div>
                    <div className="text-center bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20">
                      <div className="text-2xl md:text-3xl font-bold">
                        {String(summerBanner?.summerBannerCountdownMinutes || getDefaultSummerBanner().summerBannerCountdownMinutes).padStart(2, '0')}
                      </div>
                      <div className="text-xs md:text-sm opacity-80">Mins</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="mb-8">
            <p className="text-pink-600 font-script text-xl mb-2">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">THEY SAYS</h2>
            <p className="text-gray-500 text-sm tracking-wider">OUR HAPPY CLIENTS</p>
          </div>
          {testimonialsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : testimonials.length > 0 ? (
            <FeedbackCarousel testimonials={testimonials} />
          ) : (
            <div className="py-8">
              <p className="text-gray-500 mb-4">No testimonials yet.</p>
              <p className="text-sm text-gray-400">Check back soon to see what our customers are saying!</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Feedback Section */}
      {featuredFeedbacks && featuredFeedbacks.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="mb-8">
              <p className="text-blue-600 font-script text-xl mb-2">Your Feedback Matters</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">FEATURED FEEDBACK</h2>
              <p className="text-gray-500 text-sm tracking-wider">SHARED EXPERIENCES & SUGGESTIONS</p>
            </div>
            {feedbacksLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <FeedbackCarousel feedbacks={featuredFeedbacks} />
            )}
          </div>
        </section>
      )}

      <footer>
        <Footer />
      </footer>
    </div>
  );
};

export default Dashboard;
