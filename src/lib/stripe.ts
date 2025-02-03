import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe('pk_test_51QoSHiG4X4rQBoW6HrlTZXMUEcnzEUvRo63trYOcXAc0W8NODWRCyFbyOhdco1fY1p7zoqw7JFSbm8tEklH8A68J00PhhXIgY0');

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