import Stripe from 'stripe';

let stripeClient = null;
let isStubClient = false;
let initialized = false;

function getStripe() {
  if (initialized) return stripeClient;
  initialized = true;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  // Detect placeholder/invalid keys
  const isPlaceholderKey = stripeSecretKey && (
    stripeSecretKey.includes('placeholder') ||
    stripeSecretKey === 'sk_test_xxx' ||
    stripeSecretKey.length < 20
  );

  if (!stripeSecretKey || isPlaceholderKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ STRIPE_SECRET_KEY is not set or is a placeholder — using a stub Stripe client for development.');
      console.warn('   To enable real payments, set a valid Stripe secret key in your .env file.');
      isStubClient = true;
      stripeClient = {
        balance: { retrieve: async () => ({ available: [], pending: [] }) },
        charges: { create: async () => ({ id: 'stub_charge', client_secret: null }) },
        paymentIntents: {
          create: async (params) => ({
            id: `pi_stub_${Date.now()}`,
            client_secret: `pi_stub_${Date.now()}_secret_dev`,
            amount: params?.amount || 0,
            currency: params?.currency || 'usd',
            status: 'requires_payment_method',
            metadata: params?.metadata || {},
          }),
          retrieve: async (id) => ({
            id,
            status: 'succeeded',
            client_secret: `${id}_secret_dev`,
          }),
        },
      };
    } else {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
  } else {
    stripeClient = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
  }

  return stripeClient;
}

const stripeProxy = new Proxy({}, {
  get(_, prop) {
    const client = getStripe();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export function getIsStubClient() { getStripe(); return isStubClient; }
export { getStripe };
export default stripeProxy;