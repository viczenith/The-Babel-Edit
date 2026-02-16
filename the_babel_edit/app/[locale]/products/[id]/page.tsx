'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';
import ProductCard from '@/app/components/features/ProductCard/ProductCard';
import { useProductStore, useCartStore, useWishlistStore } from '@/app/store';
import { useAuthStore } from '@/app/store/useAuthStore';
import { Product } from '@/app/store/types';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import en from '@/locales/en/common.json';
import fr from '@/locales/fr/common.json';
import { formatCurrency } from '@/lib/utils';

/*  HELPERS  */

const isBackendImage = (url: string): boolean => {
  try { const u = new URL(url); return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1'; } catch { return false; }
};

const resolveImageUrl = (url: string): string => {
  if (!url) return '/images/babel_logo_black.jpg';
  if (isBackendImage(url)) return `/api/image?url=${encodeURIComponent(url)}`;
  return url;
};

const PLACEHOLDER = '/images/babel_logo_black.jpg';

const SIZE_CHART = [
  { label: 'XS', uk: '6', us: '2', eu: '34', chest: '31-32"' },
  { label: 'S', uk: '8', us: '4', eu: '36', chest: '33-34"' },
  { label: 'M', uk: '10', us: '6', eu: '38', chest: '35-36"' },
  { label: 'L', uk: '12', us: '8', eu: '40', chest: '37-39"' },
  { label: 'XL', uk: '14', us: '10', eu: '42', chest: '40-42"' },
  { label: 'XXL', uk: '16', us: '12', eu: '44', chest: '43-45"' },
];

const COLOR_HEX: Record<string, string> = {
  black: '#1a1a1a', red: '#ef4444', green: '#22c55e', white: '#ffffff',
  purple: '#7c3aed', blue: '#3b82f6', pink: '#ec4899', yellow: '#eab308',
  orange: '#f97316', gray: '#6b7280', grey: '#6b7280', navy: '#1e3a5f',
  brown: '#92400e', beige: '#d4c5a9', cream: '#fffdd0', teal: '#14b8a6',
  maroon: '#7f1d1d', coral: '#f97171', olive: '#65a30d', burgundy: '#800020',
};

/*  TYPES  */

interface ReviewData {
  id: string; rating: number; title?: string; comment?: string; createdAt: string;
  user: { firstName: string; lastName: string; avatar?: string };
}

interface RelatedProduct {
  id: string; name: string; price: number; comparePrice?: number; imageUrl?: string;
  stock: number; discountPercentage: number; isInStock: boolean;
}

/*  STAR RATING  */

function StarRating({ rating, size = 'md', interactive = false, onChange }: {
  rating: number; size?: 'sm' | 'md' | 'lg'; interactive?: boolean; onChange?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const px = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const Tag = interactive ? 'button' : 'span';
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => {
        const active = interactive ? (hover || rating) >= s : rating >= s;
        const half = !interactive && !active && rating >= s - 0.5;
        return (
          <Tag key={s} {...(interactive ? { type: 'button' as const } : {})}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
            onClick={() => interactive && onChange?.(s)}
            onMouseEnter={() => interactive && setHover(s)} onMouseLeave={() => interactive && setHover(0)}>
            <svg width={px} height={px} viewBox="0 0 20 20" fill="none">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                fill={active ? '#f59e0b' : half ? 'url(#hg)' : '#e5e7eb'} stroke={active || half ? '#f59e0b' : '#e5e7eb'} strokeWidth=".5"/>
              {half && <defs><linearGradient id="hg"><stop offset="50%" stopColor="#f59e0b"/><stop offset="50%" stopColor="#e5e7eb"/></linearGradient></defs>}
            </svg>
          </Tag>
        );
      })}
    </div>
  );
}

/*  SIZE GUIDE MODAL  */

function SizeGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h3 className="text-lg font-semibold">Size Guide</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['Size','UK','US','EU','Chest'].map(h => <th key={h} className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((r) => (
                <tr key={r.label} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 font-semibold text-gray-900">{r.label}</td>
                  <td className="py-3 text-gray-600">{r.uk}</td>
                  <td className="py-3 text-gray-600">{r.us}</td>
                  <td className="py-3 text-gray-600">{r.eu}</td>
                  <td className="py-3 text-gray-600">{r.chest}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-400">Between sizes? We recommend sizing up for a relaxed fit.</p>
        </div>
      </div>
    </div>
  );
}

/*  IMAGE GALLERY  */

function Gallery({ images, onWishlistClick, isWishlisted, wishlistLoading }: {
  images: { src: string; alt: string }[]; onWishlistClick: () => void; isWishlisted: boolean; wishlistLoading: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [zoomed, setZoomed] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const ref = useRef<HTMLDivElement>(null);

  const src = (s: string) => (!s || failed.has(s)) ? PLACEHOLDER : resolveImageUrl(s);

  if (!images?.length) return (
    <div className="rounded-2xl bg-gray-50 aspect-square flex items-center justify-center"><p className="text-gray-400 text-sm">No image</p></div>
  );

  const mainSrc = src(images[idx].src);
  const unopt = isBackendImage(images[idx].src);

  return (
    <div className="space-y-3">
      <div ref={ref}
        className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-square cursor-crosshair group"
        onMouseEnter={() => setZoomed(true)} onMouseLeave={() => setZoomed(false)}
        onMouseMove={e => { if (!ref.current) return; const r = ref.current.getBoundingClientRect(); setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}>
        <Image src={mainSrc} alt={images[idx].alt} fill sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized={unopt} priority
          className={`object-cover transition-transform duration-500 ease-out ${zoomed ? 'scale-150' : 'scale-100'}`}
          style={zoomed ? { transformOrigin: `${pos.x}% ${pos.y}%` } : undefined}
          onError={() => setFailed(p => new Set(p).add(images[idx].src))} />

        {/* Floating actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button onClick={e => { e.stopPropagation(); onWishlistClick(); }} disabled={wishlistLoading}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all hover:scale-110 active:scale-95">
            {wishlistLoading ? (
              <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            ) : (
              <svg className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-pink-500 text-pink-500' : 'fill-none text-gray-500'}`} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            )}
          </button>
          <button onClick={() => { if (navigator.share) navigator.share({ title: 'Check this out', url: window.location.href }); else { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); } }}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all hover:scale-110 active:scale-95">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
          </button>
        </div>

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">{idx + 1} / {images.length}</div>
        )}

        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity tracking-wide uppercase font-medium pointer-events-none">
          Hover to zoom
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button key={img.src + i} onClick={() => setIdx(i)}
              className={`relative shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-lg overflow-hidden transition-all duration-200 ${i === idx ? 'ring-2 ring-blue-600 ring-offset-2' : 'opacity-50 hover:opacity-90'}`}>
              <Image src={src(img.src)} alt={img.alt} width={72} height={72} unoptimized={isBackendImage(img.src)}
                onError={() => setFailed(p => new Set(p).add(img.src))} className="w-full h-full object-cover"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/*  REVIEW FORM  */

function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const { isAuthenticated } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  if (!isAuthenticated) return (
    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
      <p className="text-gray-500 mb-3 text-sm">Sign in to leave a review</p>
      <Link href="/en/auth" className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Sign In</Link>
    </div>
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error('Please select a rating'); return; }
    setSending(true);
    try {
      await apiRequest(API_ENDPOINTS.REVIEWS.CREATE, { method: 'POST', body: { productId, rating, title, comment } });
      toast.success('Review submitted!'); setRating(0); setTitle(''); setComment(''); onSubmitted();
    } catch (err: any) { toast.error(err?.message || 'Failed to submit review'); }
    finally { setSending(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h4 className="font-semibold text-gray-900">Write a Review</h4>
      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Rating *</label>
        <StarRating rating={rating} size="lg" interactive onChange={setRating}/>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Sum up your experience..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"/>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Review</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your thoughts..." rows={3}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all resize-none"/>
      </div>
      <button type="submit" disabled={sending || !rating}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
        {sending && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
        Submit Review
      </button>
    </form>
  );
}

/*  REVIEW CARD  */

function ReviewCard({ review }: { review: ReviewData }) {
  const initials = `${review.user.firstName?.[0] || ''}${review.user.lastName?.[0] || ''}`.toUpperCase();
  const date = new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div className="py-5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
          {review.user.avatar ? <Image src={resolveImageUrl(review.user.avatar)} alt="" width={32} height={32} className="rounded-full object-cover" unoptimized/> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">{review.user.firstName} {review.user.lastName}</span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-400">{date}</span>
          </div>
          <StarRating rating={review.rating} size="sm"/>
        </div>
      </div>
      {review.title && <p className="font-medium text-sm text-gray-900 mb-1">{review.title}</p>}
      {review.comment && <p className="text-sm text-gray-500 leading-relaxed">{review.comment}</p>}
    </div>
  );
}

/*  SKELETON  */

function ProductSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar/>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-3 bg-gray-200/60 rounded w-48 mb-8 animate-pulse"/>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-7 aspect-square bg-gray-100 rounded-2xl animate-pulse"/>
          <div className="lg:col-span-5 space-y-5 py-2">
            <div className="h-3 bg-gray-200/60 rounded w-28 animate-pulse"/>
            <div className="h-8 bg-gray-200/60 rounded w-3/4 animate-pulse"/>
            <div className="h-4 bg-gray-200/60 rounded w-36 animate-pulse"/>
            <div className="h-7 bg-gray-200/60 rounded w-32 animate-pulse"/>
            <div className="space-y-2 pt-4">{[1,2,3].map(i => <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" style={{width: `${90-i*15}%`}}/>)}</div>
            <div className="h-px bg-gray-100 my-6"/>
            <div className="flex gap-2.5">{[1,2,3,4].map(i => <div key={i} className="w-9 h-9 rounded-full bg-gray-100 animate-pulse"/>)}</div>
            <div className="flex gap-2">{[1,2,3,4,5].map(i => <div key={i} className="w-14 h-11 rounded-lg bg-gray-100 animate-pulse"/>)}</div>
            <div className="h-13 bg-gray-200/60 rounded-xl animate-pulse mt-8"/>
          </div>
        </div>
      </main>
      <Footer/>
    </div>
  );
}

/*  MAIN COMPONENT  */

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const locale = (params.locale as string) || 'en';
  const reviewsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sizeSystem, setSizeSystem] = useState<'uk' | 'us'>('uk');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'shipping'>('details');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);

  const { currentProduct, loading, error, fetchProductById, featuredProducts, fetchFeaturedProducts } = useProductStore();
  const { addToCart, isProductLoading } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist, loading: wishlistLoading } = useWishlistStore();

  const translations: Record<string, Record<string, string>> = { en, fr };
  const t = useCallback((key: string, vars?: Record<string, any>) => {
    let str = (translations[locale] || translations['en'])[key] || key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{{${k}}}`, String(v)); });
    return str;
  }, [locale]);

  const productImages = useMemo(() => {
    if (!currentProduct) return [];
    let parsed: string[] = [];
    if (Array.isArray(currentProduct.images)) parsed = currentProduct.images;
    else if (typeof currentProduct.images === 'string') { try { parsed = JSON.parse(currentProduct.images); } catch { parsed = []; } }
    const valid = parsed.filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
    return valid.length ? valid.map((url, i) => ({ src: url, alt: `${currentProduct.name} ${i + 1}` })) : [{ src: currentProduct.imageUrl || PLACEHOLDER, alt: currentProduct.name }];
  }, [currentProduct]);

  const sizes = useMemo(() => (!currentProduct?.sizes ? [] : Array.isArray(currentProduct.sizes) ? currentProduct.sizes : []), [currentProduct]);
  const colors = useMemo(() => (!currentProduct?.colors ? [] : Array.isArray(currentProduct.colors) ? currentProduct.colors : []), [currentProduct]);

  useEffect(() => {
    if (currentProduct) {
      if (sizes.length && !sizes.includes(selectedSize)) setSelectedSize(sizes[0]);
      if (colors.length && !colors.includes(selectedColor)) setSelectedColor(colors[0]);
    }
  }, [currentProduct, sizes, colors]);

  useEffect(() => { if (productId) fetchProductById(productId).catch(() => toast.error('Failed to load product')); }, [productId, fetchProductById]);

  useEffect(() => {
    if (currentProduct) {
      const raw = currentProduct as any;
      if (Array.isArray(raw.reviews)) setReviews(raw.reviews);
      if (Array.isArray(raw.relatedProducts)) setRelatedProducts(raw.relatedProducts);
    }
  }, [currentProduct]);

  useEffect(() => { if (!relatedProducts.length && !featuredProducts.length) fetchFeaturedProducts(5).catch(() => {}); }, [relatedProducts.length, featuredProducts.length, fetchFeaturedProducts]);

  useEffect(() => {
    if (!ctaRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting), { threshold: 0 });
    observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, [currentProduct]);

  const handleAddToCart = async () => {
    if (!currentProduct) return;
    try {
      await addToCart(currentProduct.id, quantity, { size: selectedSize || undefined, color: selectedColor || undefined });
      toast.success('Added to cart!', { icon: '\u{1F6D2}', duration: 3000 });
    } catch { toast.error('Failed to add to cart'); }
  };

  const handleWishlist = async () => {
    if (!currentProduct) return;
    try {
      if (isInWishlist(currentProduct.id)) { await removeFromWishlist(currentProduct.id); toast.success('Removed from wishlist'); }
      else { await addToWishlist(currentProduct.id); toast.success('Added to wishlist!', { icon: '\u2764\uFE0F' }); }
    } catch { toast.error('Failed to update wishlist'); }
  };

  const handleReviewSubmitted = () => { if (productId) fetchProductById(productId, true); };
  const scrollToReviews = () => { setActiveTab('reviews'); setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); };

  const sizeDisplay = (s: string) => { const r = SIZE_CHART.find(x => x.label === s); return r ? (sizeSystem === 'uk' ? `UK ${r.uk}` : `US ${r.us}`) : ''; };

  if (loading) return <ProductSkeleton/>;

  if (error || !currentProduct) return (
    <div className="min-h-screen flex flex-col">
      <Navbar/>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">{error || "We couldn't find this product."}</p>
          <button onClick={() => router.push(`/${locale}/products`)} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Browse Products</button>
        </div>
      </main>
      <Footer/>
    </div>
  );

  const discount = currentProduct.comparePrice ? Math.round(((currentProduct.comparePrice - currentProduct.price) / currentProduct.comparePrice) * 100) : 0;
  const avg = currentProduct.avgRating || 0;
  const count = currentProduct.reviewCount || 0;
  const catName = typeof currentProduct.category === 'object' ? currentProduct.category?.name : currentProduct.category;
  const colName = typeof currentProduct.collection === 'object' ? currentProduct.collection?.name : undefined;
  const outOfStock = currentProduct.stock <= 0;
  const tags = Array.isArray(currentProduct.tags) ? currentProduct.tags : [];
  const distribution = [5,4,3,2,1].map(s => ({ star: s, n: reviews.filter(r => r.rating === s).length, pct: reviews.length ? (reviews.filter(r => r.rating === s).length / reviews.length) * 100 : 0 }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar/>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

          {/*  Breadcrumbs  */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6 sm:mb-10">
            <Link href={`/${locale}`} className="hover:text-gray-700 transition-colors">Home</Link>
            <span>/</span>
            <Link href={`/${locale}/products`} className="hover:text-gray-700 transition-colors">Shop</Link>
            {catName && <><span>/</span><span className="text-gray-500">{catName}</span></>}
          </nav>

          {/*  Product Hero  */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

            {/* Gallery  7 cols */}
            <div className="lg:col-span-7 lg:sticky lg:top-8 lg:self-start">
              <Gallery images={productImages} onWishlistClick={handleWishlist} isWishlisted={isInWishlist(currentProduct.id)} wishlistLoading={wishlistLoading}/>
            </div>

            {/* Product Info  5 cols */}
            <div className="lg:col-span-5">

              {/*  Identity  */}
              <div className="space-y-3">
                {(colName || catName) && (
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-400">
                    {colName && <span>{colName}</span>}
                    {colName && catName && <span className="mx-2 text-gray-300">/</span>}
                    {catName && <span>{catName}</span>}
                  </p>
                )}

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">{currentProduct.name}</h1>

                {count > 0 && (
                  <button onClick={scrollToReviews} className="flex items-center gap-2 group">
                    <StarRating rating={avg} size="sm"/>
                    <span className="text-xs text-gray-400 group-hover:text-blue-600 transition-colors">{avg.toFixed(1)} ({count})</span>
                  </button>
                )}

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(currentProduct.price)}</span>
                  {currentProduct.comparePrice && <>
                    <span className="text-base text-gray-400 line-through">{formatCurrency(currentProduct.comparePrice)}</span>
                    <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">-{discount}%</span>
                  </>}
                </div>

                <p className={`text-xs font-medium flex items-center gap-1.5 ${outOfStock ? 'text-red-500' : currentProduct.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${outOfStock ? 'bg-red-500' : currentProduct.stock <= 5 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}/>
                  {outOfStock ? 'Out of stock' : currentProduct.stock <= 5 ? `Only ${currentProduct.stock} left` : 'In stock'}
                </p>

                {currentProduct.description && (
                  <div className="pt-1">
                    <p className={`text-sm text-gray-500 leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>{currentProduct.description}</p>
                    {currentProduct.description.length > 180 && (
                      <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-blue-600 font-medium mt-1 hover:underline">{showFullDesc ? 'Show less' : 'Read more'}</button>
                    )}
                  </div>
                )}
              </div>

              {/*  Options  */}
              <div className="mt-7 space-y-6 border-t border-gray-100 pt-6">
                {colors.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Colour <span className="font-normal text-gray-400 capitalize tracking-normal ml-1">{selectedColor}</span></span>
                    <div className="flex flex-wrap gap-2.5 mt-3">
                      {colors.map(c => {
                        const hex = COLOR_HEX[c.toLowerCase()] || c;
                        const isLight = ['white', 'cream', 'beige'].includes(c.toLowerCase());
                        return (
                          <button key={c} onClick={() => setSelectedColor(c)} title={c}
                            className={`w-9 h-9 rounded-full transition-all duration-200 relative ${selectedColor === c ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : `hover:scale-105 ${isLight ? 'ring-1 ring-gray-200' : ''}`}`}
                            style={{ backgroundColor: hex }}>
                            {selectedColor === c && <svg className={`absolute inset-0 m-auto w-3.5 h-3.5 ${isLight ? 'text-gray-800' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sizes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Size</span>
                      <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 rounded-md p-0.5 text-[10px] font-bold">
                          {(['uk', 'us'] as const).map(sys => (
                            <button key={sys} onClick={() => setSizeSystem(sys)}
                              className={`px-2 py-0.5 rounded transition-all ${sizeSystem === sys ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                              {sys.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setShowSizeGuide(true)} className="text-[10px] text-blue-600 font-medium hover:underline uppercase tracking-wider">Guide</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(s => (
                        <button key={s} onClick={() => setSelectedSize(s)}
                          className={`min-w-12 py-2.5 px-3 text-center rounded-lg text-sm font-medium transition-all duration-200 ${selectedSize === s ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>
                          {s}
                          {sizeDisplay(s) && <span className={`block text-[9px] mt-0.5 ${selectedSize === s ? 'text-gray-400' : 'text-gray-400'}`}>{sizeDisplay(s)}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/*  Action  */}
              <div className="mt-7 space-y-4 border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Quantity</span>
                  <div className="inline-flex items-center bg-gray-50 rounded-lg border border-gray-200">
                    <button onClick={() => setQuantity(p => Math.max(1, p - 1))} disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/></svg>
                    </button>
                    <span className="w-10 text-center font-semibold text-sm tabular-nums">{quantity}</span>
                    <button onClick={() => setQuantity(p => Math.min(currentProduct.stock, p + 1))} disabled={quantity >= currentProduct.stock}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    </button>
                  </div>
                </div>

                <button ref={ctaRef} onClick={handleAddToCart} disabled={outOfStock || (currentProduct && isProductLoading(currentProduct.id))}
                  className="w-full h-13 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-700/30">
                  {currentProduct && isProductLoading(currentProduct.id) ? <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Adding to Cart...
                  </> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                    {outOfStock ? 'Out of Stock' : t('addToCart')}
                  </>}
                </button>

                <div className="flex items-center justify-center gap-4 sm:gap-6 text-[10px] text-gray-400 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    Free Shipping
                  </span>
                  <span className="text-gray-200">|</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    Secure Checkout
                  </span>
                  <span className="text-gray-200">|</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    30-Day Returns
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/*  Details / Reviews / Shipping  */}
          <div ref={reviewsRef} className="mt-16 sm:mt-24">
            <div className="border-b border-gray-200">
              <div className="flex gap-8 overflow-x-auto">
                {[
                  { key: 'details' as const, label: 'Details' },
                  { key: 'reviews' as const, label: `Reviews (${count})` },
                  { key: 'shipping' as const, label: 'Shipping & Returns' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`pb-3 text-sm font-medium whitespace-nowrap transition-all relative ${activeTab === tab.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                    {tab.label}
                    {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full"/>}
                  </button>
                ))}
              </div>
            </div>

            <div className="py-8 sm:py-10 max-w-3xl">
              {activeTab === 'details' && (
                <div className="space-y-8">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{currentProduct.description || 'No description available.'}</p>
                  {(() => {
                    const details = [
                      currentProduct.material && { k: 'Material', v: currentProduct.material },
                      currentProduct.weight && { k: 'Weight', v: `${currentProduct.weight}g` },
                      currentProduct.dimensions && { k: 'Dimensions', v: currentProduct.dimensions },
                      currentProduct.sku && { k: 'SKU', v: currentProduct.sku },
                      catName && { k: 'Category', v: catName },
                      colName && { k: 'Collection', v: colName },
                    ].filter(Boolean) as { k: string; v: string }[];
                    if (!details.length) return null;
                    return (
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6 border-t border-gray-100">
                        {details.map(d => (
                          <div key={d.k}>
                            <dt className="text-[11px] text-gray-400 uppercase tracking-wider">{d.k}</dt>
                            <dd className="text-sm font-medium text-gray-900 mt-0.5">{d.v}</dd>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {tags.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wider block mb-2">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-md text-xs">{tag}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-8">
                  {count > 0 && (
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                      <div className="text-center sm:text-left shrink-0 sm:pr-8 sm:border-r sm:border-gray-100">
                        <div className="text-4xl font-bold text-gray-900">{avg.toFixed(1)}</div>
                        <StarRating rating={avg} size="md"/>
                        <p className="text-xs text-gray-400 mt-1.5">{count} {count === 1 ? 'review' : 'reviews'}</p>
                      </div>
                      <div className="flex-1 space-y-1.5 w-full">
                        {distribution.map(({ star, n, pct }) => (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-3 text-right">{star}</span>
                            <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }}/></div>
                            <span className="text-xs text-gray-400 w-5 text-right">{n}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {reviews.length > 0 ? (
                    <div>{reviews.map(r => <ReviewCard key={r.id} review={r}/>)}</div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-400 text-sm">No reviews yet</p>
                      <p className="text-gray-300 text-xs mt-1">Be the first to share your thoughts</p>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-8">
                    <ReviewForm productId={currentProduct.id} onSubmitted={handleReviewSubmitted}/>
                  </div>
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                      Shipping
                    </h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      {['Free standard shipping on orders over $50', 'Express shipping: 2-3 business days', 'Standard delivery: 5-7 business days', 'Tracking provided for all orders'].map(item => (
                        <li key={item} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      Returns
                    </h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      {['30-day hassle-free returns', 'Items must be unworn with original tags', 'Free return shipping on defective items', 'Refund within 5-7 business days'].map(item => (
                        <li key={item} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/*  Related Products  */}
          {(() => {
            const items = relatedProducts.length > 0
              ? relatedProducts.map(rp => ({ ...currentProduct, id: rp.id, name: rp.name, price: rp.price, comparePrice: rp.comparePrice, imageUrl: rp.imageUrl || '', stock: rp.stock, images: [] as string[], discountPercentage: rp.discountPercentage, isInStock: rp.isInStock } as Product))
              : featuredProducts.filter(p => p.id !== currentProduct.id).slice(0, 4);
            if (!items.length) return null;
            return (
              <div className="mt-16 sm:mt-24 border-t border-gray-100 pt-10 sm:pt-14">
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">You May Also Like</h2>
                    <p className="text-sm text-gray-400 mt-1">Curated picks based on this product</p>
                  </div>
                  <Link href={`/${locale}/products`} className="text-sm text-blue-600 font-medium hover:underline hidden sm:flex items-center gap-1">
                    View All
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {items.slice(0, 4).map(p => (
                    <ProductCard key={p.id} product={p} locale={locale} variant="small"
                      currentCategory={typeof p.category === 'string' ? p.category : (p.category as any)?.name || null}/>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/*  Sticky Mobile CTA  */}
      {showStickyBar && !outOfStock && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 z-40 lg:hidden">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{currentProduct.name}</p>
              <p className="text-sm font-semibold text-blue-600">{formatCurrency(currentProduct.price)}</p>
            </div>
            <button onClick={handleAddToCart} disabled={currentProduct && isProductLoading(currentProduct.id)}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 whitespace-nowrap">
              {currentProduct && isProductLoading(currentProduct.id) ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}

      <Footer/>
      <SizeGuideModal open={showSizeGuide} onClose={() => setShowSizeGuide(false)}/>
    </div>
  );
}
