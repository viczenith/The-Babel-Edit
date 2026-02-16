'use client';
import React, { useState, useEffect, useCallback } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useCartStore } from '@/app/store/useCartStore';
import NavbarWithSuspense from '@/app/components/features/Navbar/NavbarWithSuspense';
import Footer from '@/app/components/features/Footer/Footer';
import { formatCurrency } from '@/lib/utils';

const PLACEHOLDER_IMAGE = '/images/babel_logo_black.jpg';

/** Proxy localhost backend images through /api/image to avoid cross-origin / optimisation issues */
const resolveCartImage = (url: string | undefined | null): string => {
  if (!url) return PLACEHOLDER_IMAGE;
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1') {
      return `/api/image?url=${encodeURIComponent(url)}`;
    }
  } catch { /* not a valid URL, use as-is */ }
  return url;
};

const isLocalImage = (url: string | undefined | null): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1';
  } catch { return false; }
};

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';
  
  const { user, loading: authLoading } = useAuth();
  const { 
    items, 
    loading, 
    error, 
    totalAmount, 
    updateQuantity, 
    removeFromCart, 
    fetchCart 
  } = useCartStore();
  
  const [promo, setPromo] = useState("");
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to login with return URL
      router.replace(`/${currentLocale}/auth/login?from=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, authLoading, router, currentLocale]);

  // Memoize fetchCart to avoid unnecessary re-renders
  const loadCart = useCallback(async () => {
    if (!user) return; // Don't fetch if not authenticated
    
    try {
      await fetchCart();
    } finally {
      setIsInitialLoad(false);
    }
  }, [fetchCart, user]);

  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [loadCart, user]);

  const shipping = 9.0;
  const total = totalAmount + shipping;

  const handleQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev).add(itemId));
    
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRemove = async (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId));
    
    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setRemovingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      router.push(`/${currentLocale}/checkout`);
    } catch (error) {
      console.error('Checkout navigation error:', error);
      setIsCheckingOut(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen">
        <NavbarWithSuspense />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
          <div className="flex gap-8 items-start">
            <div className="flex-1">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Checking authentication...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect is happening)
  if (!user) {
    return (
      <div className="min-h-screen">
        <NavbarWithSuspense />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading only on initial cart load
  if (isInitialLoad && loading) {
    return (
      <div className="min-h-screen">
        <NavbarWithSuspense />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
          <div className="flex gap-8 items-start">
            <div className="flex-1">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading cart...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="min-h-screen">
        <NavbarWithSuspense />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
          <div className="flex gap-8 items-start">
            <div className="flex-1">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</p>
                <button 
                  onClick={loadCart}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavbarWithSuspense />
      <main className="py-8 px-4 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
        
        {items.length === 0 ? (
          <div className="flex gap-8 items-start">
            <div className="flex-1">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-gray-600 mb-4">Your cart is empty.</p>
                <Link 
                  href={`/${currentLocale}/products`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Start Shopping
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {items.map((item) => {
                const isUpdating = updatingItems.has(item.id);
                const isRemoving = removingItems.has(item.id);
                const isItemLoading = isUpdating || isRemoving;
                const isOutOfStock = item.stock === 0;

                return (
                  <div
                    className={`flex flex-col md:flex-row w-full gap-4 bg-white rounded-xl shadow-md p-6 items-start border border-gray-200 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                    key={item.id}
                    style={{ opacity: isRemoving ? 0.5 : 1, transition: 'opacity 0.3s' }}
                  >
                    <div className="w-full md:w-32 h-40 md:h-32 shrink-0 relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                          <span className="bg-black text-white font-bold py-2 px-4 rounded-lg">
                            Out of Stock
                          </span>
                        </div>
                      )}
                      <Image
                        src={resolveCartImage(item.imageUrl)}
                        alt={item.name || 'Product'}
                        fill
                        sizes="(max-width: 768px) 100vw, 128px"
                        className="object-cover"
                        unoptimized={isLocalImage(item.imageUrl)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                        <button
                          className="text-red-500 hover:text-red-600"
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={isItemLoading}
                          title="Remove item"
                        >
                          {isRemoving ? (
                            <span className="animate-spin">⟳</span>
                          ) : (
                            <span className="text-xl">✕</span>
                          )}
                        </button>
                      </div>

                      {(item.size || item.color) && (
                        <div className="text-sm text-gray-500">
                          {item.size && <span className="mr-4">Size: {item.size}</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-2">
                        <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                          <span>Price:</span>
                          <span>{formatCurrency(item.price ?? 0)}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-4 md:mt-0">
                          <button
                            className="w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                            onClick={() => handleQuantity(item.id, item.quantity - 1)}
                            disabled={isItemLoading || item.quantity <= 1 || isOutOfStock}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="px-4 py-1 h-8 text-center font-semibold bg-gray-100 border-t border-b border-gray-300">
                            {isUpdating ? (
                              <span className="animate-pulse">...</span>
                            ) : (
                              item.quantity
                            )}
                          </span>
                          <button
                            className="w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                            onClick={() => handleQuantity(item.id, item.quantity + 1)}
                            disabled={isItemLoading || isOutOfStock}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-lg font-bold text-gray-800 mt-4 md:mt-0">
                          <span>Subtotal:</span>
                          <span className="text-red-500">{formatCurrency(item.subtotal ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4 lg:sticky lg:top-24">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="flex justify-between font-bold text-gray-800 mb-2">
                <span>Subtotal ({items.filter(item => item.stock > 0).length} {items.filter(item => item.stock > 0).length === 1 ? 'item' : 'items'})</span>
                <span className="text-gray-800">{formatCurrency(totalAmount)}</span>
              </div>
              
              <hr className="my-2" />
              
              <div className="flex justify-between font-bold text-gray-800 mb-2">
                <span>Estimated Shipping</span>
                <span className="text-gray-800">{formatCurrency(shipping)}</span>
              </div>
              
              <hr className="my-2" />
              
              <div className="flex justify-between text-xl font-bold text-gray-800 my-4">
                <span className="font-bold">Total</span>
                <span className="text-2xl font-extrabold text-red-500">{formatCurrency(total)}</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  className="w-full bg-red-500 text-white rounded-lg py-3 text-lg font-semibold cursor-pointer transition-all duration-200 hover:bg-red-600 hover:-translate-y-px hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                  type="button" 
                  disabled={loading || items.length === 0 || updatingItems.size > 0 || removingItems.size > 0 || isCheckingOut || items.some(item => item.stock === 0)}
                  onClick={handleCheckout}
                >
                  {isCheckingOut ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : loading ? (
                    'Processing...'
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>
                
                <Link href={`/${currentLocale}/products`} className="w-full text-center text-gray-600 border border-gray-300 rounded-lg py-2 mt-2 font-medium transition-all duration-200 hover:bg-gray-100">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
