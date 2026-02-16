'use client';
import { Suspense } from 'react';
import Navbar from './Navbar';

// Loading component for Navbar fallback
const NavbarSkeleton = () => (
  <nav className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        {/* Logo skeleton */}
        <div className="flex-shrink-0">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Navigation skeleton */}
        <div className="hidden md:flex space-x-8">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        
        {/* Icons skeleton */}
        <div className="flex items-center space-x-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse hidden md:block"></div>
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </nav>
);

// Wrapper component with Suspense boundary
const NavbarWithSuspense = () => {
  return (
    <Suspense fallback={<NavbarSkeleton />}>
      <Navbar />
    </Suspense>
  );
};

export default NavbarWithSuspense;
