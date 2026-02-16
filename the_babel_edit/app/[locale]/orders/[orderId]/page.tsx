'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import NavbarWithSuspense from '@/app/components/features/Navbar/NavbarWithSuspense';
import Footer from '@/app/components/features/Footer/Footer';
import { useAuth } from '@/app/context/AuthContext';
import { Loader2, AlertCircle, Package, ArrowLeft } from 'lucide-react';
import { API_ENDPOINTS } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

const PLACEHOLDER_IMAGE = '/images/babel_logo_black.jpg';

const resolveOrderImage = (url?: string | null): string => {
  if (!url || !url.trim()) return PLACEHOLDER_IMAGE;
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return `/api/image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

const isLocalImage = (url?: string | null): boolean => {
  if (!url) return false;
  return url.includes('localhost') || url.includes('127.0.0.1');
};

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'CONFIRMED' | 'PROCESSING' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  paymentMethod: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    street?: string;
    city: string;
    state: string;
    postalCode?: string;
    zipCode?: string;
    country: string;
    phone?: string;
  } | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      id:string;
      name: string;
      imageUrl: string;
    };
  }[];
}

const OrderDetailPage = () => {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const orderId = params?.orderId as string;
  const { user, loading: authLoading, authenticatedFetch } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!order) return;

    setIsCancelling(true);
    try {
      await authenticatedFetch(API_ENDPOINTS.ORDERS.CANCEL(order.id), {
        method: 'PATCH',
      });
      toast.success('Order cancelled successfully!');
      // Refetch order details to show updated status
      const data = await authenticatedFetch(API_ENDPOINTS.ORDERS.BY_ID(order.id));
      setOrder(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };
  
  useEffect(() => {
    if (authLoading) {
      return; // Wait for authentication to resolve
    }

    const fetchOrder = async () => {
      if (!user || !orderId) {
        setLoading(false);
        setError('Invalid request. You must be logged in to view an order.');
        return;
      }

      try {
        const data = await authenticatedFetch(API_ENDPOINTS.ORDERS.BY_ID(orderId));
        setOrder(data);
      } catch (err: any) {
        if (err.status === 404) {
            setError('Order not found.');
        } else {
            setError(err.message || 'An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [user, authLoading, authenticatedFetch, orderId]);
  
  const totalLoading = loading || authLoading;
  
  const getStatusChipClass = (status: Order['status']) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-(--color-success) text-white';
      case 'SHIPPED':
        return 'bg-(--color-primary-light) text-white';
      case 'PENDING':
        return 'bg-(--color-warning) text-amber-800';
      case 'CANCELLED':
        return 'bg-(--color-accent) text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="mx-auto w-12 h-12 text-(--color-primary-light) animate-spin" />
                <p className="mt-4 text-lg text-gray-600">Loading Order Details...</p>
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center p-8 bg-white shadow-md rounded-lg">
                <AlertCircle className="mx-auto w-12 h-12 text-(--color-accent)" />
                <p className="mt-4 text-xl text-(--color-accent) font-semibold">{error}</p>
                <p className='mt-2 text-gray-600'>We couldn't retrieve the details for this order.</p>
                <Link href={`/${locale}/orders`} className="mt-6 inline-flex items-center gap-2 bg-(--color-primary-light) text-white py-2 px-4 rounded-lg font-semibold hover:bg-(--color-primary) transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    Back to My Orders
                </Link>
            </div>
        </div>
    );
  }

  if (!order) {
    return null; // Should be handled by error state
  }
  
  const { shippingAddress } = order;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarWithSuspense />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href={`/${locale}/orders`} className="inline-flex items-center gap-2 text-(--color-primary-light) hover:text-(--color-primary) mb-6 font-semibold">
          <ArrowLeft className="w-5 h-5" />
          Back to My Orders
        </Link>
        
        <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <span className={`px-4 py-2 text-base font-medium rounded-full ${getStatusChipClass(order.status)}`}>
                        {order.status}
                    </span>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Shipping Address</h2>
                    <address className="not-italic text-gray-600 space-y-1">
                        {shippingAddress ? (
                            <>
                                {(shippingAddress.firstName || shippingAddress.lastName) && (
                                  <p className="font-medium">{`${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim()}</p>
                                )}
                                <p>{shippingAddress.address1 || shippingAddress.street || ''}</p>
                                {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                                <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode || shippingAddress.zipCode || ''}</p>
                                <p>{shippingAddress.country}</p>
                                {shippingAddress.phone && <p>Phone: {shippingAddress.phone}</p>}
                            </>
                        ) : (
                            <p>No shipping address provided.</p>
                        )}
                    </address>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Order Status & Tracking</h2>
                    <div className="space-y-3 text-gray-600">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Payment:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {order.paymentStatus}
                            </span>
                        </div>
                        {order.trackingNumber && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Tracking #:</span>
                                <a href={`https://www.google.com/search?q=${order.trackingNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{order.trackingNumber}</a>
                            </div>
                        )}
                        {order.estimatedDelivery && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Est. Delivery:</span>
                                <span>{new Date(order.estimatedDelivery).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        )}
                        {order.status === 'PENDING' && (
                            <button 
                                onClick={handleCancelOrder}
                                disabled={isCancelling}
                                className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 disabled:bg-red-400 transition-colors"
                            >
                                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Payment Summary</h2>
                    <div className="space-y-2 text-gray-600">
                        <div className="flex justify-between"><span>Subtotal</span> <span>{formatCurrency(order.subtotal)}</span></div>
                        <div className="flex justify-between"><span>Shipping</span> <span>{order.shipping > 0 ? formatCurrency(order.shipping) : <span className='text-(--color-success)'>FREE</span>}</span></div>
                        <div className="flex justify-between"><span>Tax</span> <span>{formatCurrency(order.tax)}</span></div>
                        {order.discount > 0 && <div className="flex justify-between text-(--color-success)"><span>Discount</span> <span>-{formatCurrency(order.discount)}</span></div>}
                        <div className="flex justify-between font-bold text-gray-900 text-lg border-t pt-2 mt-2"><span>Total</span> <span>{formatCurrency(order.total)}</span></div>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Items in this Order</h2>
                <div className="space-y-4">
                    {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                            <div className="w-20 h-20 relative rounded-lg border shrink-0 overflow-hidden bg-gray-100">
                              <Image
                                src={resolveOrderImage(item.product?.imageUrl)}
                                alt={item.product?.name || 'Product image'}
                                fill
                                sizes="80px"
                                className="object-cover"
                                unoptimized={isLocalImage(item.product?.imageUrl)}
                                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                              />
                            </div>
                            <div className='grow'>
                                <p className="font-semibold text-gray-900">{item.product?.name || 'Product no longer available'}</p>
                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <div className='text-right'>
                                <p className="font-semibold text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
                                <p className="text-sm text-gray-500">{formatCurrency(item.price)} each</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderDetailPage;
