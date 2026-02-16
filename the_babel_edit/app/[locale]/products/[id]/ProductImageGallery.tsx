import React, { useState } from 'react';
import Image from 'next/image';

interface ProductImageGalleryProps {
  images: { src: string; alt: string }[];
}

const isBackendImage = (url: string): boolean => {
  try {
    const u = new URL(url);
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '::1'
    );
  } catch {
    return false;
  }
};

/** Proxy local backend images through the /api/image route to avoid CORS / optimisation issues */
const resolveImageUrl = (url: string): string => {
  if (!url) return '/images/babel_logo_black.jpg';
  if (isBackendImage(url)) {
    return `/api/image?url=${encodeURIComponent(url)}`;
  }
  return url;
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
  const useUnoptimized = isBackendImage(images[selectedIdx].src);

  return (
    <div className="flex flex-col-reverse md:flex-row gap-6">
      {/* Thumbnails */}
      <div className="flex flex-row md:flex-col gap-4 overflow-x-auto">
        {images.map((img, idx) => {
          const thumbSrc = getSrc(img.src);
          const thumbUnoptimized = isBackendImage(img.src);
          return (
            <div
              key={img.src + idx}
              className={`border-2 rounded-md overflow-hidden cursor-pointer transition-colors duration-200 w-15 h-20 bg-white shrink-0 ${
                idx === selectedIdx ? 'border-blue-600' : 'border-transparent'
              }`}
              onClick={() => setSelectedIdx(idx)}
            >
              <Image
                src={thumbSrc}
                alt={img.alt}
                width={60}
                height={80}
                unoptimized={thumbUnoptimized}
                onError={() => handleImageError(img.src)}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Main Image */}
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white w-full aspect-350/420 relative">
        <Image
          src={mainSrc}
          alt={images[selectedIdx].alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={useUnoptimized}
          onError={() => handleImageError(images[selectedIdx].src)}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default ProductImageGallery;
 