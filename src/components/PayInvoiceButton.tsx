import React, { useState } from 'react';
import { stripePromise } from '../lib/stripe';
import { supabase } from '../lib/supabase';

interface PayInvoiceButtonProps {
  invoiceId: string;
  amount: number;
  onSuccess: () => void;
}

export default function PayInvoiceButton({ invoiceId, amount, onSuccess }: PayInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePayment() {
    try {
      setLoading(true);
      setError('');

      // Initialize Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Payment system is not available');
      }

      // Create Stripe session
      const { data, error: sessionError } = await supabase.functions.invoke(
        'create-payment-session',
        {  
          body: { invoiceId, amount },
          // The Supabase client will automatically add the auth header
        }
      );

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw new Error(sessionError.message || 'Failed to create payment session');
      }

      if (!data?.sessionId) {
        console.error('Invalid session data:', data);
        throw new Error(data?.error || 'Payment session creation failed');
      }

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (stripeError) {
        console.error('Stripe redirect error:', stripeError);
        throw stripeError;
      }

      onSuccess();
    } catch (err) {
      console.error('Payment error:', err);
      let errorMessage = 'Payment service is temporarily unavailable';
      
      if (err instanceof Error) {
        // Clean up error message for display
        errorMessage = err.message.replace(/^Error: /, '');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          'Pay Now'
        )}
      </button>
      <p className="text-xs text-gray-500 text-center mt-2">
        Test Card: 4242 4242 4242 4242
      </p>
    </div>
  );
}