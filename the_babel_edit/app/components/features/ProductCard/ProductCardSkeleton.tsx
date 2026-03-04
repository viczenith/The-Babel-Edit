'use client';

import React from 'react';
import Skeleton from '@/app/components/ui/Skeleton/Skeleton';

const ProductCardSkeleton = () => {
  return (
    <div className="border-0 rounded-xl overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] w-full h-full flex flex-col">
      <Skeleton className="relative w-full h-64 md:h-56" />
      <div className="px-3 pt-3 pb-3 md:px-4 md:pt-3.5 md:pb-4 flex flex-col gap-2 grow">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-100">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;