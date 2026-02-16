'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { Product } from '@/app/store/types';
import { commonClasses, cn } from '@/app/utils/designSystem';
import Button from '@/app/components/ui/Button/Button';
import { formatCurrency } from '@/lib/utils';

interface EnhancedProductCardProps {
  product: Product;
  locale?: string;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  isInWishlist?: boolean;
  isInCart?: boolean;
  className?: string;
}

const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({
  product,
  locale = 'en',
  onAddToCart,
  onAddToWishlist,
  onQuickView,
  isInWishlist = false,
  isInCart = false,
  className,
}) => {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToWishlist?.(product.id);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product.id);
  };

  const discountPercentage = product.comparePrice 
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <div className={cn(
      commonClasses.cardHover,
      'group relative overflow-hidden p-0',
      className
    )}>
      {/* Product Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Link href={`/${locale}/products/${product.id}`}>
          <Image
            src={product.imageUrl || product.images?.[0] || '/placeholder-image.jpg'}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        </Link>

        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <span className={commonClasses.badgeError}>
              -{discountPercentage}%
            </span>
          </div>
        )}

        {/* Stock Status */}
        {/* {!product.isInStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-900">
              Out of Stock
            </span>
          </div>
        )} */}

        {/* Action Buttons - Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            {onQuickView && (
              <button
                onClick={handleQuickView}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                title="Quick View"
              >
                <Eye className="h-4 w-4 text-gray-600" />
              </button>
            )}
            {onAddToWishlist && (
              <button
                onClick={handleAddToWishlist}
                className={cn(
                  "p-2 rounded-full shadow-lg transition-colors",
                  isInWishlist 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
                title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart className={cn("h-4 w-4", isInWishlist && "fill-current")} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        {/* Collection Name */}
        {product.collection && (
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {product.collection.name}
          </div>
        )}

        {/* Product Name */}
        <Link href={`/${locale}/products/${product.id}`}>
          <h3 className="font-medium text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.avgRating > 0 && (
          <div className="flex items-center space-x-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < Math.floor(product.avgRating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  )}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500">
              ({product.reviewCount || 0})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        {/* {onAddToCart && product.isInStock && (
          <Button
            onClick={handleAddToCart}
            className="w-full"
            variant={isInCart ? "secondary" : "primary"}
            size="sm"
            leftIcon={<ShoppingCart className="h-4 w-4" />}
          >
            {isInCart ? "In Cart" : "Add to Cart"}
          </Button>
        )} */}

        {/* Out of Stock Button */}
        {/* {!product.isInStock && (
          <Button
            className="w-full"
            variant="secondary"
            size="sm"
            disabled
          >
            Out of Stock
          </Button>
        )} */}
      </div>
    </div>
  );
};

export default EnhancedProductCard;
