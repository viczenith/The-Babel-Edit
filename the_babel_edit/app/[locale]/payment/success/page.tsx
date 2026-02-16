'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Elements, useStripe } from '@stripe/react-stripe-js';
import stripePromise from '../../../lib/stripe';
import { useCartStore } from '@/app/store/useCartStore';
import { useAuth } from '@/app/context/AuthContext';
import { API_ENDPOINTS } from '@/app/lib/api';
import NavbarWithSuspense from '@/app/components/features/Navbar/NavbarWithSuspense';
import Footer from '@/app/components/features/Footer/Footer';
import { CheckCircle2, XCircle, Package, ShoppingBag, Loader2 } from 'lucide-react';

function PaymentSuccessContent() {
  const stripe = useStripe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  
  const { clearCart } = useCartStore();
  const { authenticatedFetch } = useAuth();
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'succeeded' | 'processing' | 'failed' | 'unknown'>('unknown');

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = searchParams.get('payment_intent_client_secret');
    
    if (!clientSecret) {
      setMessage('Invalid payment session');
      setPaymentStatus('failed');
      setLoading(false);
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(async ({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage('Payment Successful. Finalizing order...');
          setPaymentStatus('succeeded');
          
          // New logic to confirm order on our backend
          const orderId = searchParams.get('orderId');
          if (orderId) {
            try {
              await authenticatedFetch(API_ENDPOINTS.ORDERS.CONFIRM_PAYMENT(orderId), {
                method: 'PATCH',
              });
              setMessage('Payment Successful!');
              clearCart();
            } catch (apiError) {
              console.error("Error confirming order:", apiError);
              setMessage('Payment succeeded but failed to update order. Please contact support.');
              // Still clear cart as payment was taken
              clearCart();
            }
          } else {
            setMessage('Payment succeeded but order ID was missing. Please contact support.');
          }
          break;
        case 'processing':
          setMessage('Payment Processing');
          setPaymentStatus('processing');
          break;
        case 'requires_payment_method':
          setMessage('Payment Failed');
          setPaymentStatus('failed');
          break;
        default:
          setMessage('Payment Failed');
          setPaymentStatus('failed');
          break;
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Error retrieving payment intent:', error);
      setMessage('Payment Failed');
      setPaymentStatus('failed');
      setLoading(false);
    });
  }, [stripe, searchParams, clearCart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Success State
  if (paymentStatus === 'succeeded') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          {/* Large Check Animation */}
          <div className="mb-8 relative inline-block">
            <svg className="w-48 h-48" viewBox="0 0 200 200">
              {/* Circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="8"
                strokeLinecap="round"
                className="animate-[draw-circle_0.6s_ease-out_forwards]"
                style={{
                  strokeDasharray: 565,
                  strokeDashoffset: 565,
                }}
              />
              {/* Checkmark */}
              <path
                d="M60 100 L85 125 L140 70"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-[draw-check_0.4s_0.6s_ease-out_forwards]"
                style={{
                  strokeDasharray: 120,
                  strokeDashoffset: 120,
                }}
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{message}</h1>
          <p className="text-gray-600 mb-12">Order confirmation sent to your email</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push(`/${locale}/orders`)}
              className="flex-1 bg-[var(--color-primary-light)] text-white py-4 px-8 rounded-xl font-semibold hover:bg-[var(--color-primary)] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              View Orders
            </button>
            <button
              onClick={() => router.push(`/${locale}/products`)}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-4 px-8 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Processing State
  if (paymentStatus === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mb-8 inline-block">
            <div className="w-48 h-48 relative flex items-center justify-center">
              <div className="absolute inset-0 border-8 border-[var(--color-warning)] opacity-20 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-[var(--color-warning)] rounded-full border-t-transparent animate-spin"></div>
              <Loader2 className="w-20 h-20 text-[var(--color-warning)]" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{message}</h1>
          <p className="text-gray-600 mb-12">Please wait while we confirm your payment</p>

          <button
            onClick={() => router.push(`/${locale}/orders`)}
            className="bg-blue-600 text-white py-4 px-8 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200"
          >
            Check Order Status
          </button>
        </div>
      </div>
    );
  }

  // Failed State
  if (paymentStatus === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mb-8 inline-block">
            <XCircle className="w-48 h-48 text-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Failed</h1>
          <p className="text-gray-600 mb-12">{message}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 bg-[var(--color-accent)] text-white py-4 px-8 rounded-xl font-semibold hover:bg-[var(--color-accent-hover)] transition-all duration-200"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push(`/${locale}/cart`)}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-4 px-8 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
            >
              Return to Cart
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default function PaymentSuccessPage() {
  return (
    <Elements stripe={stripePromise}>
      <style jsx global>{`
        @keyframes draw-circle {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      <div className="min-h-screen bg-white">
        <NavbarWithSuspense />
        <main className="max-w-7xl mx-auto px-4">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            </div>
          }>
            <PaymentSuccessContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </Elements>
  );
}
