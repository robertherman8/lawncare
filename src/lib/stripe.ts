import { loadStripe } from '@stripe/stripe-js';

let stripePromiseInstance: Promise<any> | null = null;

export const stripePromise = () => {
  if (!stripePromiseInstance) {
    stripePromiseInstance = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromiseInstance;
};

// Helper function to format amount for display
export function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2);
}

// Helper function to handle Stripe errors
export function handleStripeError(error: any): string {
  if (typeof error === 'string') return error;
  
  if (error.type === 'card_error' || error.type === 'validation_error') {
    return error.message || 'Payment failed. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}