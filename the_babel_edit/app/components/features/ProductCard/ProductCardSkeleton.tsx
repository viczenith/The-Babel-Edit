'use client';

import React from 'react';
import Skeleton from '@/app/components/ui/Skeleton/Skeleton';

const ProductCardSkeleton = () => {
  return (
    <div className="border-0 rounded-xl overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] w-full h-full flex flex-col">
      <Skeleton className="relative w-full aspect-3/4" />
      <div className="px-2.5 pt-2 pb-2.5 md:px-3 md:pt-2.5 md:pb-3 flex flex-col gap-1.5 grow">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="flex items-baseline gap-1.5 mt-auto pt-1.5 border-t border-gray-100">
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;