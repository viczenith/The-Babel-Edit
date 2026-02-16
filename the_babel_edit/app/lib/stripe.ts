import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

// Detect placeholder/invalid keys
const isPlaceholderKey = (key?: string) => {
  if (!key) return true;
  return key.includes('placeholder') || key === 'pk_test_xxx' || key.length < 20;
};

export const isStripeConfigured = () => {
  return !isPlaceholderKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
};

const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key || isPlaceholderKey(key)) {
      console.warn(
        '\u26a0\ufe0f NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set or is a placeholder. ' +
        'Stripe payments will run in dev/stub mode. ' +
        'Add a real key to your .env.local file for live payments.'
      );
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(key);
    }
  }
  return stripePromise;
};

export default getStripe();