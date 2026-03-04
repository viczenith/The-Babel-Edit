import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { useCartStore, useWishlistStore, useProductStore, Product } from '@/app/store';
import { toast } from 'react-hot-toast';
import { isBackendImageUrl, resolveImageUrl } from '@/app/utils/imageUrl';

interface ProductCardProps {
    product: Product;
    className?: string;
    imageContainerClassName?: string;
    variant?: 'default' | 'small';
    locale?: string;
    currentCategory?: string | null;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  className = '',
  imageContainerClassName = '',
  variant = 'default',
  locale = 'en',
  currentCategory = null,
}) => {
  const addToCart = useCartStore(state => state.addToCart);
  const addToWishlist = useWishlistStore(state => state.addToWishlist);
  const removeFromWishlist = useWishlistStore(state => state.removeFromWishlist);
  const prefetchProductById = useProductStore(state => state.prefetchProductById);
  const isInWishlist = useWishlistStore(state => state.isInWishlist(product.id));
  const isInCart = useCartStore(state => state.isInCart(product.id));
  
  const isAddingToCart = useCartStore(state => state.isProductLoading(product.id));
  const wishlistLoading = useWishlistStore(state => state.loading);

  // Helper function to get the first image URL with robust handling
  const getImageUrl = (): string => {
    try {
      // Handle images array (can be actual array or JSON string)
      if (product.images) {
        let imagesArray = product.images;
        
        // If images is a string (JSON), parse it
        if (typeof imagesArray === 'string') {
          imagesArray = JSON.parse(imagesArray);
        }
        
        // Return first image if available
        if (Array.isArray(imagesArray) && imagesArray.length > 0 && imagesArray[0]) {
          const imageUrl = imagesArray[0];
          return imageUrl;
        }
      }
      
      // Fallback to imageUrl if available
      if (product.imageUrl) {
        return product.imageUrl;
      }
      
      // Final fallback to placeholder
      return '/placeholder-product.jpg';
    } catch (error) {
      return product.imageUrl || '/placeholder-product.jpg';
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, 1);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async () => {
    try {
      if (isInWishlist) {
        await removeFromWishlist(product.id);
        toast.success(`${product.name} removed from wishlist`);
      } else {
        await addToWishlist(product.id);
        toast.success(`${product.name} added to wishlist!`);
      }
    } catch (error) {
      toast.error(`Failed to ${isInWishlist ? 'remove from' : 'add to'} wishlist`);
    }
  };

  const handlePrefetch = () => {
    prefetchProductById(product.id);
  };

  const isOutOfStock = product.stock === 0;

  // Resolve image URL for display (handles relative /uploads/ paths & backend detection)
  const imageUrl = getImageUrl();
  const isBackendImage = isBackendImageUrl(imageUrl);
  const displayImageUrl = resolveImageUrl(imageUrl, '/placeholder-product.jpg');

  // State for image load error fallback
  const [imageError, setImageError] = React.useState(false);

  const cardClasses = `
    group/card border-0 rounded-xl overflow-hidden bg-white
    shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]
    transition-all duration-400 ease-out hover:-translate-y-1.5
    w-full h-full flex flex-col
    ${variant === 'small' ? 'max-w-[180px] md:max-w-full' : ''}
    ${isOutOfStock ? 'grayscale opacity-60 pointer-events-none' : ''} 
    ${className}
  `;
  const imageContainerClasses = `
    relative w-full overflow-hidden bg-gray-50
    ${variant === 'small' ? 'h-40 md:h-32' : 'h-64 md:h-56'}
    ${imageContainerClassName}
  `;
  const imageClasses = "object-cover group-hover:scale-105 transition-transform duration-500 ease-out";

  return (
    <div className={cardClasses.trim()}>
      <div className={`${imageContainerClasses.trim()} group`}>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <span className="bg-[#0f172a] text-white text-xs font-semibold py-1.5 px-4 rounded-full tracking-wide">
              Out of Stock
            </span>
          </div>
        )}
        {/* Sale Badge */}
        {product.comparePrice && Number(product.comparePrice) > Number(product.price) && !isOutOfStock && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-[#ef4444] text-white text-[10px] font-bold py-1 px-2.5 rounded-full tracking-wide uppercase">
              {Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)}% Off
            </span>
          </div>
        )}
        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm"
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          disabled={wishlistLoading}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isInWishlist ? 'fill-[#ef4444] text-[#ef4444]' : 'text-gray-500 hover:text-[#ef4444]'
            }`}
          />
        </button>

        <Link 
          href={`/${locale}/products/${product.id}`}
          passHref
          onMouseEnter={handlePrefetch}
        >
          <div className="cursor-pointer relative w-full h-full flex items-center justify-center bg-gray-100">
            {!imageError ? (
              isBackendImage ? (
                // Backend images: use regular <img> to avoid Next.js Image domain restrictions
                <img
                  src={displayImageUrl}
                  alt={product.name}
                  className={`absolute inset-0 w-full h-full ${imageClasses}`}
                  onError={() => setImageError(true)}
                />
              ) : (
                <Image
                  src={displayImageUrl}
                  alt={product.name}
                  fill
                  className={imageClasses}
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  priority={false}
                  onError={() => setImageError(true)}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100 gap-2">
                <div className="text-3xl text-gray-400">📷</div>
                <p className="text-xs text-gray-500">Image unavailable</p>
              </div>
            )}
          </div>
        </Link>
      </div>
      
      <div className="px-3 pt-3 pb-3 md:px-4 md:pt-3.5 md:pb-4 flex flex-col gap-1.5 md:gap-2 grow">
        {/* Product Name */}
        <Link 
          href={`/${locale}/products/${product.id}`}
          className="no-underline"
          onMouseEnter={handlePrefetch}
        >
          <h3 className="text-[13px] md:text-[15px] font-semibold text-[#0f172a] line-clamp-2 min-h-8 md:min-h-9 leading-snug tracking-tight
                       group-hover/card:text-[#ef4444] transition-colors duration-300 cursor-pointer"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {product.name}
          </h3>
        </Link>
        
        {/* Description - hidden for cleaner card layout
        {product.description && (
          <p className="text-[11px] md:text-xs text-[#64748b] line-clamp-2 leading-relaxed font-normal">
            {product.description}
          </p>
        )}
        */}
        
        {/* Rating */}
        {product.avgRating > 0 && (
          <div className="flex items-center gap-1 text-[11px] md:text-xs">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-[10px] ${i < Math.round(product.avgRating) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>
            {product.reviewCount > 0 && <span className="text-[#94a3b8] ml-0.5">({product.reviewCount})</span>}
          </div>
        )}
        
        {/* Price & Cart — pushed to bottom */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-100">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] md:text-base font-bold text-[#0f172a] tracking-tight">
              ${Number(product.price).toFixed(2)}
            </span>
            {product.comparePrice && (
              <span className="text-[11px] md:text-xs text-[#94a3b8] line-through font-normal">
                ${Number(product.comparePrice).toFixed(2)}
              </span>
            )}
          </div>
          
          <button 
            className={`shrink-0 border-none rounded-full p-2 md:p-2.5 cursor-pointer transition-all duration-300 ease-out
                       flex items-center justify-center
                       hover:-translate-y-0.5 hover:shadow-md
                       disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                       ${isInCart 
                         ? 'bg-[#0f172a] text-white' 
                         : 'bg-[#0f172a] text-white hover:bg-[#ef4444]'
                       }`}
            onClick={handleAddToCart}
            disabled={isInCart || isOutOfStock || isAddingToCart}
            title={isInCart ? 'Already in cart' : 'Add to cart'}
          >
            {isAddingToCart ? (
              <div className="h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ShoppingCart className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isInCart ? 'fill-white' : ''}`} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;