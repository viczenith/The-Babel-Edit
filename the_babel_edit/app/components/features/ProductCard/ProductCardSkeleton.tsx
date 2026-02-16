'use client';

import React from 'react';
import Skeleton from '@/app/components/ui/Skeleton/Skeleton';

const ProductCardSkeleton = () => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm w-full h-full flex flex-col">
      <Skeleton className="relative w-full h-60 md:h-52" />
      <div className="p-3 md:p-4 flex flex-col gap-2 md:gap-3 flex-grow">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between gap-2 mt-auto">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;