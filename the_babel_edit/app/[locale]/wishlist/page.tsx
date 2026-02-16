'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useWishlistStore } from '@/app/store/useWishlistStore';
import { useCartStore } from '@/app/store/useCartStore';
import styles from './wishlist.module.css';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';
import { formatCurrency } from '@/lib/utils';

export default function WishlistPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';
  
  const { user, loading: authLoading } = useAuth();
  const {
    items,
    loading,
    error,
    removeFromWishlist,
    fetchWishlist
  } = useWishlistStore();
  
  const { addToCart } = useCartStore();
  
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [movingItems, setMovingItems] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${currentLocale}/auth/login?from=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, authLoading, router, currentLocale]);

  // Load wishlist
  const loadWishlist = useCallback(async () => {
    if (!user) return;
    
    try {
      await fetchWishlist();
    } finally {
      setIsInitialLoad(false);
    }
  }, [fetchWishlist, user]);

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [loadWishlist, user]);

  const handleRemove = async (productId: string) => {
    setRemovingItems(prev => new Set(prev).add(productId));
    
    try {
      await removeFromWishlist(productId);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    } finally {
      setRemovingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleMoveToCart = async (productId: string) => {
    setMovingItems(prev => new Set(prev).add(productId));
    
    try {
      await addToCart(productId, 1);
      await removeFromWishlist(productId);
    } catch (error) {
      console.error('Failed to move item to cart:', error);
    } finally {
      setMovingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div>
        <Navbar />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <h1 className={styles.header}>My Wish List</h1>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return (
      <div>
        <Navbar />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading for initial wishlist load
  if (isInitialLoad && loading) {
    return (
      <div>
        <Navbar />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <h1 className={styles.header}>My Wish List</h1>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading wishlist...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div>
        <Navbar />
        <main className="py-8 px-4 max-w-7xl mx-auto">
          <h1 className={styles.header}>My Wish List</h1>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</p>
            <button 
              onClick={loadWishlist}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="py-8 px-4 max-w-7xl mx-auto">
        <h1 className={styles.header}>My Wish List</h1>
        
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-gray-600 mb-4">Your wish list is empty.</p>
            <p className="text-gray-500">Start adding your favorite items!</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map(item => {
              const isRemoving = removingItems.has(item.productId);
              const isMoving = movingItems.has(item.productId);
              const isItemLoading = isRemoving || isMoving;
              
              return (
                <div 
                  className={styles.card} 
                  key={item.id}
                  style={{ opacity: isRemoving ? 0.5 : 1, transition: 'opacity 0.3s' }}
                >
                  <img
                    className={styles.productImage}
                    src={item.product?.images?.[0] || item.product?.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'}
                    alt={item.product?.name || 'Product'}
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
                    }}
                  />
                  <div className={styles.productTitle}>{item.product?.name}</div>
                  <div className={styles.productBrand}>{item.product?.collection?.name || 'Product'}</div>
                  <div className={styles.priceRow}>
                    <span className={styles.currentPrice}>{formatCurrency(item.product?.price)}</span>
                    {item.product?.comparePrice && item.product?.comparePrice > item.product?.price && (
                      <span className={styles.originalPrice}>{formatCurrency(item.product?.comparePrice)}</span>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleMoveToCart(item.productId)}
                      disabled={isItemLoading}
                    >
                      {isMoving ? 'Moving...' : 'Move to Cart'}
                    </button>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemove(item.productId)}
                      disabled={isItemLoading}
                    >
                      {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}