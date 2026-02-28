'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Elements } from '@stripe/react-stripe-js';
import { useRouter, useParams } from 'next/navigation';
import stripePromise, { isStripeConfigured } from '../../lib/stripe';
import CheckoutForm from '@/app/components/checkout/CheckoutForm';
import NavbarWithSuspense from '@/app/components/features/Navbar/NavbarWithSuspense';
import Footer from '@/app/components/features/Footer/Footer';
import { useCartStore } from '@/app/store/useCartStore';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { CreditCard, Lock, Package, AlertCircle, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { useSiteSettingsStore } from '@/app/store/useSiteSettingsStore';

const PLACEHOLDER_IMAGE = '/images/babel_logo_black.jpg';

/** Proxy localhost backend images through /api/image to avoid Next.js Image optimization rejection */
const resolveCheckoutImage = (url?: string | null): string => {
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

export default function CheckoutPage() {

  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { items, totalAmount: storeTotalAmount, clearCart } = useCartStore();
  // Safety: if store totalAmount is 0 but items exist, compute from items directly
  const totalAmount = storeTotalAmount > 0
    ? storeTotalAmount
    : items.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity), 0);
  const { settings } = useSiteSettingsStore();
  
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(true); // For initial page load checks
  const [isInitializingPayment, setIsInitializingPayment] = useState(false); // For payment initialization step
  const [error, setError] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [activeStep, setActiveStep] = useState(1);
  
  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement>(null);
  
  const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';
  
  // Dynamic shipping & tax from admin settings
  const flatRate = parseFloat(settings.flat_rate_shipping) || 4.99;
  const freeThreshold = parseFloat(settings.free_shipping_threshold) || 50;
  const taxPercent = parseFloat(settings.tax_rate) || 0;

  const shippingCosts = {
    standard: totalAmount >= freeThreshold ? 0 : flatRate,
    express: totalAmount >= freeThreshold ? flatRate : flatRate * 2.5
  };
  
  const shipping = shippingCosts[shippingMethod];
  const tax = totalAmount * (taxPercent / 100);
  const total = totalAmount + shipping + tax;

  // Check authentication and cart status
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace(`/${currentLocale}/auth/login?from=${encodeURIComponent(window.location.pathname)}`);
      } else if (items.length === 0) {
        router.push(`/${currentLocale}/cart`);
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading, items, router, currentLocale]);

  // Pre-fill user email if available
  useEffect(() => {
    if (user?.email && !shippingInfo.email) {
      setShippingInfo(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);
  
  // Validate shipping form
  const validateShippingForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!shippingInfo.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (shippingInfo.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(shippingInfo.firstName.trim())) {
      errors.firstName = 'First name should only contain letters';
    }

    if (!shippingInfo.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (shippingInfo.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(shippingInfo.lastName.trim())) {
      errors.lastName = 'Last name should only contain letters';
    }

    if (!shippingInfo.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email)) {
      errors.email = 'Invalid email address';
    }

    if (!shippingInfo.address.trim()) {
      errors.address = 'Address is required';
    } else if (shippingInfo.address.trim().length < 5) {
      errors.address = 'Please enter a complete address';
    }

    if (!shippingInfo.city.trim()) {
      errors.city = 'City is required';
    } else if (!/^[a-zA-ZÀ-ÿ\s.'-]+$/.test(shippingInfo.city.trim())) {
      errors.city = 'City should only contain letters';
    }

    if (!shippingInfo.state.trim()) {
      errors.state = 'State is required';
    } else if (shippingInfo.state.trim().length !== 2) {
      errors.state = 'Enter a valid 2-letter state abbreviation (e.g. NY)';
    } else if (!/^[a-zA-Z]{2}$/.test(shippingInfo.state.trim())) {
      errors.state = 'State should only contain letters';
    }

    if (!shippingInfo.zipCode.trim()) {
      errors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(shippingInfo.zipCode.trim())) {
      errors.zipCode = 'Enter a valid US ZIP code (e.g. 75068 or 75068-1234)';
    }

    if (!shippingInfo.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-()]{7,20}$/.test(shippingInfo.phone.trim())) {
      errors.phone = 'Enter a valid phone number (7-20 digits)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = async () => {
    try {
      // Clear previous errors
      setError('');

      if (!validateShippingForm()) {
        // Scroll to the first error so user can see it
        setTimeout(() => {
          const firstError = formRef.current?.querySelector('.text-red-500');
          if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
        return;
      }
      
      setIsInitializingPayment(true);

      // Reuse existing order if we already created one (prevents duplicates on retry)
      let currentOrderId = orderId;

      if (!currentOrderId) {
        // Step 1: Create the pending order
        const orderData = await apiRequest<any>(API_ENDPOINTS.ORDERS.CREATE, {
          method: 'POST',
          requireAuth: true,
          body: {
            items: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              color: item.color,
            })),
            shippingCost: shipping,
            totalAmount: total,
            shippingMethod: shippingMethod,
            shippingDetails: shippingInfo,
          },
        });
        

        if (!orderData?.id) {
          throw new Error('Order was created but no order ID was returned. Please try again.');
        }

        currentOrderId = orderData.id;
        setOrderId(currentOrderId);
      }

      // Step 2: Create the payment intent for that order
      const paymentData = await apiRequest<{ clientSecret: string }>(
        '/payments/create-payment-intent',
        {
          method: 'POST',
          requireAuth: true,
          body: { orderId: currentOrderId },
        }
      );
      
      if (!paymentData?.clientSecret) {
        throw new Error('Payment could not be initialized. The payment gateway may be unavailable.');
      }

      setClientSecret(paymentData.clientSecret);

      // Step 3: Move to payment step
      setActiveStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      setError(err.message || 'Failed to initialize checkout. Please try again.');
      // Scroll to the error banner so user sees it
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsInitializingPayment(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const appearance = useMemo(() => ({
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  }), []);

  const options = useMemo(() => ({
    clientSecret,
    appearance,
  }), [clientSecret, appearance]);

  // Show loading while checking auth or cart
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-purple-50">
        <NavbarWithSuspense />
        <main className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">Verifying your cart...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Error is now shown inline, not as a full-page replacement

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-purple-50">
      <NavbarWithSuspense />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Secure Checkout
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="w-4 h-4 text-green-600" />
              <span>SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Shipping', icon: Truck },
              { num: 2, label: 'Payment', icon: CreditCard },
              { num: 3, label: 'Confirm', icon: CheckCircle2 }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                    activeStep >= step.num 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {activeStep > step.num ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`hidden sm:block font-medium ${
                    activeStep >= step.num ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${
                    activeStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Inline Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">Checkout Error</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 p-1">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Shipping Information */}
            {activeStep === 1 && (
              <div ref={formRef} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Shipping Address</h2>
                </div>

                {/* Validation errors summary */}
                {Object.keys(formErrors).length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Please fix the {Object.keys(formErrors).length} error{Object.keys(formErrors).length > 1 ? 's' : ''} below before continuing:
                    </p>
                    <ul className="list-disc list-inside text-red-600 text-sm ml-6">
                      {Object.values(formErrors).map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Form inputs are the same as before */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input type="text" autoComplete="given-name" value={shippingInfo.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.firstName ? 'border-red-500' : 'border-gray-300'}`} placeholder="Victor" />
                    {formErrors.firstName && <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input type="text" autoComplete="family-name" value={shippingInfo.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.lastName ? 'border-red-500' : 'border-gray-300'}`} placeholder="Godwin" />
                    {formErrors.lastName && <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input disabled type="email" autoComplete="email" value={shippingInfo.email} onChange={(e) => handleInputChange('email', e.target.value)} className={`w-full px-4 py-3 border rounded-lg bg-gray-50 cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.email ? 'border-red-500' : 'border-gray-300'}`} placeholder="victor@example.com" />
                    {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                    <input type="tel" autoComplete="tel" inputMode="tel" value={shippingInfo.phone} onChange={(e) => { const filtered = e.target.value.replace(/[^0-9+\-()\s]/g, ''); handleInputChange('phone', filtered); }} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.phone ? 'border-red-500' : 'border-gray-300'}`} placeholder="+1 (555) 123-4567" />
                    {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                    <input type="text" autoComplete="street-address" value={shippingInfo.address} onChange={(e) => handleInputChange('address', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.address ? 'border-red-500' : 'border-gray-300'}`} placeholder="1616 Whistler Drive" />
                    {formErrors.address && <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input type="text" autoComplete="address-level2" value={shippingInfo.city} onChange={(e) => handleInputChange('city', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.city ? 'border-red-500' : 'border-gray-300'}`} placeholder="Little Elm" />
                    {formErrors.city && <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                    <input type="text" autoComplete="address-level1" value={shippingInfo.state} onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.state ? 'border-red-500' : 'border-gray-300'}`} placeholder="TX" maxLength={2} />
                    {formErrors.state && <p className="text-red-500 text-sm mt-1">{formErrors.state}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
                    <input type="text" autoComplete="postal-code" inputMode="numeric" value={shippingInfo.zipCode} onChange={(e) => { const filtered = e.target.value.replace(/[^0-9-]/g, ''); handleInputChange('zipCode', filtered); }} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ formErrors.zipCode ? 'border-red-500' : 'border-gray-300'}`} placeholder="75068" maxLength={10} />
                    {formErrors.zipCode && <p className="text-red-500 text-sm mt-1">{formErrors.zipCode}</p>}
                  </div>
                </div>

                {/* Shipping Method */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Shipping Method</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'standard', label: 'Standard Shipping', time: '3-5 business days', price: shippingCosts.standard },
                      { id: 'express', label: 'Express Shipping', time: '1-2 business days', price: shippingCosts.express }
                    ].map((method) => (
                      <label key={method.id} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${ shippingMethod === method.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="shipping" value={method.id} checked={shippingMethod === method.id} onChange={(e) => setShippingMethod(e.target.value as 'standard' | 'express')} className="w-4 h-4 text-blue-600"/>
                          <div>
                            <div className="font-semibold text-gray-900">{method.label}</div>
                            <div className="text-sm text-gray-600">{method.time}</div>
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900">{formatCurrency(method.price)}</div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={isInitializingPayment}
                  className={`w-full mt-6 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    isInitializingPayment
                      ? 'bg-blue-400 cursor-not-allowed text-white/80'
                      : 'bg-linear-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30'
                  }`}
                >
                  {isInitializingPayment ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
              </div>
            )}

            {/* Payment Information */}
            {activeStep === 2 && clientSecret && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                </div>

                {isStripeConfigured() ? (
                  <Elements key={clientSecret} options={options} stripe={stripePromise}>
                    <CheckoutForm 
                      orderId={orderId} 
                      total={total}
                      shippingInfo={shippingInfo}
                      onSuccess={() => {
                        clearCart();
                        router.push(`/${currentLocale}/orders/${orderId}`);
                      }}
                    />
                  </Elements>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Stripe Not Configured</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Payment processing requires valid Stripe API keys. Set <code className="bg-gray-100 px-1 rounded">STRIPE_SECRET_KEY</code> in backend <code className="bg-gray-100 px-1 rounded">.env</code> and <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
                    </p>
                    <p className="text-gray-500 text-xs mb-4">Get your test keys from <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Stripe Dashboard</a></p>
                    <button
                      onClick={async () => {
                        // Dev-mode: simulate payment success — confirm the order first
                        try {
                          if (orderId) {
                            await apiRequest(`/orders/${orderId}/confirm-payment`, {
                              method: 'PATCH',
                              requireAuth: true,
                            });
                          }
                        } catch (e) {
                          console.warn('Could not confirm simulated payment:', e);
                        }
                        clearCart();
                        router.push(`/${currentLocale}/orders/${orderId}`);
                      }}
                      className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
                    >
                      Simulate Payment (Dev Mode)
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setActiveStep(1);
                    setClientSecret(''); // Clear secret to allow re-initialization if needed
                    // Keep orderId so we reuse the same order instead of creating a duplicate
                  }}
                  className="w-full mt-4 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back to Shipping
                </button>

                <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
                  <Lock className="w-4 h-4" />
                  <span>Your payment information is encrypted and secure</span>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 sticky top-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
              </div>

              {/* Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100">
                    <div className="w-16 h-16 relative rounded-lg shrink-0 overflow-hidden bg-gray-100 border border-gray-200">
                      {item.imageUrl && item.imageUrl.trim() ? (
                        <Image
                          src={resolveCheckoutImage(item.imageUrl)}
                          alt={item.name || 'Product image'}
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized={isLocalImage(item.imageUrl)}
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.color && `${item.color} • `}
                        {item.size && `${item.size} • `}
                        Qty: {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {formatCurrency(item.subtotal ?? 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping ({shippingMethod})</span>
                  <span className="font-semibold">{shipping === 0 ? <span className="text-green-600">FREE</span> : formatCurrency(shipping)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({taxPercent}%)</span>
                  <span className="font-semibold">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2">
                    <Lock className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <span className="text-xs text-gray-600">Secure</span>
                  </div>
                  <div className="p-2">
                    <Truck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <span className="text-xs text-gray-600">Fast Ship</span>
                  </div>
                  <div className="p-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <span className="text-xs text-gray-600">Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
