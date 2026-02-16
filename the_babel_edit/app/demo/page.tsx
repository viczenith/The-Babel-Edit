'use client';

import React, { useEffect, Suspense } from 'react';
import { useProductStore, useCartStore, useWishlistStore, Product } from '@/app/store';
import ProductCard from '@/app/components/features/ProductCard/ProductCard';
import Navbar from '@/app/components/features/Navbar/Navbar';
import { formatCurrency } from '@/lib/utils';

// No more mock data - fetching from backend

export default function DemoPage() {
  const fetchProducts = useProductStore(state => state.fetchProducts);
  const products = useProductStore(state => state.products);
  const loading = useProductStore(state => state.loading);
  const error = useProductStore(state => state.error);
  const cartItems = useCartStore(state => state.items);
  const wishlistItems = useWishlistStore(state => state.items);
  const totalItems = useCartStore(state => state.totalItems);
  const totalAmount = useCartStore(state => state.totalAmount);

  useEffect(() => {
    // Fetch products from backend
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="h-16 bg-white shadow-sm border-b"></div>}>
        <Navbar />
      </Suspense>
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Store Demo</h1>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Current State</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">Products Loaded</h3>
                <p className="text-2xl font-bold text-blue-600">{products.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900">Cart Items</h3>
                <p className="text-2xl font-bold text-green-600">{totalItems}</p>
                <p className="text-sm text-green-700">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="font-medium text-pink-900">Wishlist Items</h3>
                <p className="text-2xl font-bold text-pink-600">{wishlistItems.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Product Showcase</h2>
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Loading products from backend...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-medium">Error loading products</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <p className="text-red-600 text-sm mt-2">Make sure your backend is running at: {process.env.NEXT_PUBLIC_API_URL}</p>
            </div>
          )}
          
          {!loading && !error && products.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No products found. Check your backend connection.</p>
            </div>
          )}
          
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  variant="default"
                />
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cart Contents</h2>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {cartItems.map(item => (
                <div key={item.id} className="border-b last:border-b-0 p-4 flex items-center gap-4">
                  <img 
                    src={item.imageUrl || '/placeholder-product.jpg'} 
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-gray-600">Quantity: {item.quantity}</p>
                    <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-gray-50">
                <p className="text-lg font-bold">Total: {formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        )}

        {wishlistItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Wishlist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map(item => (
                <ProductCard 
                  key={item.id} 
                  product={item.product}
                  variant="small"
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          <div className="space-y-2 text-gray-700">
            <p>• Click the heart icons on products to add/remove from wishlist</p>
            <p>• Click "Add" buttons to add products to cart</p>
            <p>• Check the navbar for updated cart and wishlist counts</p>
            <p>• Try the mobile menu on smaller screens</p>
            <p>• Refresh the page - your cart and wishlist should persist</p>
            <p>• Open browser dev tools and check localStorage for cached data</p>
          </div>
        </div>
      </main>
    </div>
  );
}
