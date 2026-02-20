import React, { useState } from 'react';
import Image from 'next/image';
import { isBackendImageUrl, resolveImageUrl as resolveImgUrl } from '@/app/utils/imageUrl';

interface ProductImageGalleryProps {
  images: { src: string; alt: string }[];
}

/** Resolve image URLs for display — handles /uploads/ paths and backend detection */
const resolveImageUrl = (url: string): string => {
  return resolveImgUrl(url, '/images/babel_logo_black.jpg');
};

const PLACEHOLDER = '/images/babel_logo_black.jpg';

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ images }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());

  const handleImageError = (src: string) => {
    setFailedSrcs(prev => new Set(prev).add(src));
  };

  const getSrc = (originalSrc: string) => {
    if (!originalSrc || failedSrcs.has(originalSrc)) return PLACEHOLDER;
    return resolveImageUrl(originalSrc);
  };

  // Handle case with no images gracefully
  if (!images || images.length === 0) {
    return (
      <div className="border-2 border-gray-200 rounded-lg bg-white w-full aspect-350/420 flex items-center justify-center">
        <p className="text-gray-500">No image available</p>
      </div>
    );
  }

  const mainSrc = getSrc(images[selectedIdx].src);
  const mainIsBackend = isBackendImageUrl(images[selectedIdx].src);

  return (
    <div className="flex flex-col-reverse md:flex-row gap-6">
      {/* Thumbnails */}
      <div className="flex flex-row md:flex-col gap-4 overflow-x-auto">
        {images.map((img, idx) => {
          const thumbSrc = getSrc(img.src);
          const thumbIsBackend = isBackendImageUrl(img.src);
          return (
            <div
              key={img.src + idx}
              className={`border-2 rounded-md overflow-hidden cursor-pointer transition-colors duration-200 w-15 h-20 bg-white shrink-0 ${
                idx === selectedIdx ? 'border-blue-600' : 'border-transparent'
              }`}
              onClick={() => setSelectedIdx(idx)}
            >
              {thumbIsBackend ? (
                <img
                  src={thumbSrc}
                  alt={img.alt}
                  onError={() => handleImageError(img.src)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={thumbSrc}
                  alt={img.alt}
                  width={60}
                  height={80}
                  onError={() => handleImageError(img.src)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Image */}
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white w-full aspect-350/420 relative">
        {mainIsBackend ? (
          <img
            src={mainSrc}
            alt={images[selectedIdx].alt}
            onError={() => handleImageError(images[selectedIdx].src)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <Image
            src={mainSrc}
            alt={images[selectedIdx].alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => handleImageError(images[selectedIdx].src)}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </div>
  );
};

export default ProductImageGallery;
 