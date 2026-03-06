import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
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
      return '/placeholder-product.png';
    } catch (error) {
      return product.imageUrl || '/placeholder-product.png';
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, 1);
      toast.success(`${product.name} added to basket!`);
    } catch (error) {
      toast.error('Failed to add to basket');
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
  const displayImageUrl = resolveImageUrl(imageUrl, '/placeholder-product.png');

  // State for image load error fallback
  const [imageError, setImageError] = React.useState(false);

  const cardClasses = `
    group/card relative border-0 rounded-xl overflow-hidden bg-white
    shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]
    transition-all duration-400 ease-out hover:-translate-y-1.5
    w-full h-full flex flex-col
    ${variant === 'small' ? 'max-w-[180px] md:max-w-full' : ''}
    ${isOutOfStock ? 'grayscale opacity-60 pointer-events-none' : ''} 
    ${className}
  `;
  const imageContainerClasses = `
    relative w-full overflow-hidden bg-white
    aspect-3/4
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
          <div className="cursor-pointer relative w-full h-full flex items-center justify-center bg-white">
            {!imageError ? (
              <img
                src={displayImageUrl}
                alt={product.name}
                className={`absolute inset-0 w-full h-full ${imageClasses}`}
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 gap-1.5">
                <div className="text-2xl text-gray-300">📷</div>
                <p className="text-[10px] text-gray-400">No image</p>
              </div>
            )}
          </div>
        </Link>

        {/* Add to Basket — hover-only overlay at bottom of image */}
        <div className={`absolute bottom-0 left-0 right-0 translate-y-full group-hover/card:translate-y-0 transition-transform duration-300 ease-out z-20 ${isInCart ? 'translate-y-0' : ''}`}>
          <button
            className={`w-full border-none py-0.5 cursor-pointer transition-colors duration-200
                       flex items-center justify-center gap-1.5
                       disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                       text-[10px] md:text-[11px] font-semibold tracking-wider uppercase
                       ${isInCart
                         ? 'bg-[#0f172a] text-white'
                         : 'bg-[#0f172a] text-white hover:bg-[#ef4444]'
                       }`}
            onClick={handleAddToCart}
            disabled={isInCart || isOutOfStock || isAddingToCart}
            title={isInCart ? 'Already in basket' : 'Add to basket'}
          >
            {isAddingToCart ? (
              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isInCart ? (
              'In Basket'
            ) : (
              'Add to Basket'
            )}
          </button>
        </div>
      </div>
      
      <div className="px-2.5 pt-2 pb-2.5 md:px-3 md:pt-2.5 md:pb-3 flex flex-col gap-1 md:gap-1.5 grow">
        {/* Product Name */}
        <Link 
          href={`/${locale}/products/${product.id}`}
          className="no-underline"
          onMouseEnter={handlePrefetch}
        >
          {/* <h3 className="text-[11px] md:text-[13px] font-semibold text-[#0f172a] line-clamp-2 min-h-6 md:min-h-7 leading-snug tracking-tight
                       group-hover/card:text-[#ef4444] transition-colors duration-300 cursor-pointer">
              {product.name}
          </h3> */}
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-gray-700 transition-colors">
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
          <div className="flex items-center gap-1 text-[10px] md:text-[11px]">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-[9px] ${i < Math.round(product.avgRating) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>
            {product.reviewCount > 0 && <span className="text-[#94a3b8] ml-0.5">({product.reviewCount})</span>}
          </div>
        )}
        
        {/* Price */}
        <div className="mt-auto pt-1.5 border-t border-gray-100">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] md:text-sm font-bold text-[#0f172a] tracking-tight">
              ${Number(product.price).toFixed(2)}
            </span>
            {product.comparePrice && (
              <span className="text-[10px] md:text-[11px] text-[#94a3b8] line-through font-normal">
                ${Number(product.comparePrice).toFixed(2)}
              </span>
            )}
            
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProductCard;