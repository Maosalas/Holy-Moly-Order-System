// Stripe utilities for frontend
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn('⚠️ VITE_STRIPE_PUBLISHABLE_KEY is not set in .env file');
}

export interface CheckoutSessionData {
  planId: string;
  organizationId: string;
  billingInterval: 'monthly' | 'yearly';
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Initialize Stripe checkout
 * This function will be called when user clicks on "Subscribe" button
 */
export const initializeStripeCheckout = async (
  data: CheckoutSessionData
): Promise<CheckoutSessionResponse | null> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const authToken = getAuthToken();
  
  console.log('🔄 Initiating Stripe checkout...', {
    apiUrl,
    planId: data.planId,
    organizationId: data.organizationId,
    billingInterval: data.billingInterval,
    hasAuthToken: !!authToken
  });
  
  try {
    const response = await fetch(`${apiUrl}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    console.log('📡 Stripe API response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Stripe checkout error:', error);
      throw new Error(error.message || 'Error creating checkout session');
    }

    const session: CheckoutSessionResponse = await response.json();
    console.log('✅ Checkout session created:', { sessionId: session.sessionId, hasUrl: !!session.url });
    
    if (!session.url) {
      console.error('❌ No URL in checkout session response');
      throw new Error('No checkout URL returned from server');
    }
    
    // Redirect to Stripe Checkout
    console.log('🔗 Redirecting to Stripe checkout URL...');
    window.location.href = session.url;
    
    return session;
  } catch (error) {
    console.error('❌ Error initializing Stripe checkout:', error);
    return null;
  }
};

/**
 * Create Stripe Customer Portal session
 * This allows users to manage their subscription, payment methods, etc.
 */
export const createCustomerPortalSession = async (
  organizationId: string
): Promise<string | null> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/stripe/create-billing-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ organizationId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error creating portal session');
    }

    const data = await response.json();
    console.log('Portal session response:', data);

    // Handle both response formats: { url } or { data: { url } }
    const url = data.url || data.data?.url;

    if (!url) {
      console.error('No URL found in response:', data);
      throw new Error('No portal URL returned from server');
    }

    // Redirect to Stripe Customer Portal
    window.location.href = url;

    return url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return null;
  }
};

// Helper function to get auth token
function getAuthToken(): string | null {
  const auth = localStorage.getItem("holy-moly-auth");
  if (!auth) return null;
  const parsed = JSON.parse(auth);
  return parsed.token || null;
}
