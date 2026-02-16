'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useCartStore } from '@/app/store/useCartStore';
import { CreditCard, Lock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CheckoutFormProps {
  orderId: string;
  total: number;
  shippingInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  onSuccess?: () => void;
}

const PAYMENT_ELEMENT_TIMEOUT = 20000; // 20 seconds

export default function CheckoutForm({ orderId, total, shippingInfo, onSuccess }: CheckoutFormProps) {
    const params = useParams();
    const router = useRouter();
    const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';
  
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart } = useCartStore();
  
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [elementKey, setElementKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start a timeout when the component mounts — if PaymentElement
  // doesn't fire onReady within PAYMENT_ELEMENT_TIMEOUT, show retry UI.
  useEffect(() => {
    if (isElementsReady) {
      // Already ready — clear any pending timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      if (!isElementsReady) {
        setLoadTimedOut(true);
      }
    }, PAYMENT_ELEMENT_TIMEOUT);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isElementsReady, elementKey]);

  const handleRetryLoad = useCallback(() => {
    setLoadTimedOut(false);
    setIsElementsReady(false);
    setMessage(null);
    setElementKey(k => k + 1); // force PaymentElement remount
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setMessage('Payment system not ready. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${currentLocale}/payment/success?orderId=${orderId}`,
          payment_method_data: {
            billing_details: shippingInfo ? {
              name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
              email: shippingInfo.email,
              phone: shippingInfo.phone,
              address: {
                line1: shippingInfo.address,
                city: shippingInfo.city,
                state: shippingInfo.state,
                postal_code: shippingInfo.zipCode,
                country: 'US',
              },
            } : undefined,
          },
        },
      });

      // This point will only be reached if there is an immediate error when
      // confirming the payment. Otherwise, your customer will be redirected to
      // your `return_url`.
      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message || 'An error occurred with your payment method');
        } else {
          setMessage('An unexpected error occurred. Please try again.');
        }

      } else {
        // Payment succeeded, call onSuccess if provided
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      setMessage('Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const paymentElementOptions = useMemo(() => ({
    layout: 'tabs' as const,
  }), []);

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-600">Secure payment powered by Stripe</span>
        </div>
        {/* Accepted Payment Methods */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500">We accept:</span>
          <div className="flex items-center gap-2">
            {/* Visa */}
            <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
              <svg viewBox="0 0 24 24" className="w-6 h-4" fill="none"><rect width="24" height="16" rx="2" y="4" fill="#1A1F71"/><path d="M9.5 14.5l1.2-7h1.8l-1.2 7H9.5zm6.3-6.8c-.4-.1-.9-.2-1.6-.2-1.7 0-2.9.9-2.9 2.1 0 .9.9 1.5 1.5 1.8.7.3.9.5.9.8 0 .4-.5.6-1 .6-.7 0-1.1-.1-1.6-.3l-.2-.1-.2 1.4c.4.2 1.2.3 2 .3 1.8 0 3-.9 3-2.2 0-.7-.4-1.3-1.4-1.7-.6-.3-.9-.5-.9-.8 0-.3.3-.6 1-.6.5 0 1 .1 1.3.2l.2.1.1-1.4zM19.5 7.5h-1.4c-.4 0-.8.1-.9.6l-2.7 6.4h1.8l.4-1h2.2l.2 1H21l-1.5-7zm-2.1 4.5l.9-2.5.5 2.5h-1.4zM8.5 7.5L6.7 12.3l-.2-1c-.3-1.1-1.4-2.3-2.5-2.9l1.6 6.1h1.9l2.8-7h-1.8z" fill="white"/></svg>
              Visa
            </div>
            {/* Mastercard */}
            <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
              <svg viewBox="0 0 24 24" className="w-6 h-4" fill="none"><rect width="24" height="16" rx="2" y="4" fill="#252525"/><circle cx="9.5" cy="12" r="4" fill="#EB001B"/><circle cx="14.5" cy="12" r="4" fill="#F79E1B"/><path d="M12 9.2a4 4 0 010 5.6 4 4 0 010-5.6z" fill="#FF5F00"/></svg>
              Mastercard
            </div>
            {/* Apple Pay */}
            <div className="flex items-center gap-1 px-2 py-1 bg-black border border-gray-800 rounded text-xs font-medium text-white">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C4.24 16.7 4.89 10.93 8.7 10.7c1.25.07 2.12.7 2.86.75.96-.2 1.88-.85 2.9-.77 1.22.1 2.14.58 2.75 1.47-2.5 1.52-1.91 4.87.4 5.8-.48 1.27-.71 1.83-1.56 3.03zm-4-14.18c.1 2.1-1.5 3.8-3.54 3.7-.2-1.95 1.6-3.9 3.54-3.7z"/></svg>
              Pay
            </div>
            {/* Google Pay */}
            <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
              <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/></svg>
              Pay
            </div>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div className="bg-gray-50 p-4 rounded-lg min-h-50">
        {loadTimedOut && !isElementsReady ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-gray-700 text-center">
              The payment form is taking longer than expected to load.
            </p>
            <button
              type="button"
              onClick={handleRetryLoad}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading
            </button>
            <p className="text-xs text-gray-400">If the problem persists, try refreshing the page.</p>
          </div>
        ) : (
          <PaymentElement
            key={elementKey}
            id="payment-element"
            options={paymentElementOptions}
            onReady={() => {
              setIsElementsReady(true);
              setLoadTimedOut(false);
            }}
            onLoadError={(error) => {
              setMessage('Failed to load payment form. Please try again or refresh the page.');
              setLoadTimedOut(true);
            }}
          />
        )}
      </div>

      {/* Error/Success Message */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          message.includes('success') || message.includes('Success') 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
            message.includes('success') || message.includes('Success')
              ? 'text-green-600'
              : 'text-red-600'
          }`} />
          <p className={`text-sm ${
            message.includes('success') || message.includes('Success')
              ? 'text-green-800'
              : 'text-red-800'
          }`}>
            {message}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        disabled={isLoading || !stripe || !elements || !isElementsReady}
        id="submit"
        type="submit"
        className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
          isLoading || !stripe || !elements || !isElementsReady
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </>
        ) : !isElementsReady ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Loading payment form...</span>
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            <span>Pay {formatCurrency(total)}</span>
          </>
        )}
      </button>

      {/* Payment Info */}
      <div className="flex flex-col items-center gap-2 text-sm text-gray-500 pt-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p>Your payment is secured with industry-standard encryption</p>
        </div>
        <p className="text-xs text-gray-400">Visa, Mastercard, American Express, Apple Pay &amp; Google Pay accepted</p>
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">
          <p>Stripe ready: {stripe ? '✓' : '✗'}</p>
          <p>Elements ready: {elements ? '✓' : '✗'}</p>
          <p>Payment form ready: {isElementsReady ? '✓' : '✗'}</p>
          {loadTimedOut && <p className="text-amber-500">⚠ Load timed out — click Retry</p>}
        </div>
      )}
    </form>
  );
}