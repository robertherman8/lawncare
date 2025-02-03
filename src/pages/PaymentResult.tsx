import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'success' | 'error' | 'processing'>('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    async function handlePaymentResult() {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setStatus('error');
        setError('Payment session not found');
        return;
      }

      try {
        const { data, error: verifyError } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (verifyError) throw verifyError;

        if (data.status === 'success') {
          setStatus('success');
        } else {
          setStatus('error');
          setError(data.message || 'Payment verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('error');
        setError('Failed to verify payment');
      }
    }

    handlePaymentResult();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        {status === 'processing' ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <h2 className="mt-4 text-xl font-medium text-gray-900">
              Verifying payment...
            </h2>
          </div>
        ) : status === 'success' ? (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="mt-4 text-xl font-medium text-gray-900">
              Payment Successful!
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Your payment has been processed successfully.
            </p>
            <button
              onClick={() => navigate('/customer')}
              className="mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-4 text-xl font-medium text-gray-900">
              Payment Failed
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error || 'Something went wrong with your payment.'}
            </p>
            <button
              onClick={() => navigate('/customer')}
              className="mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}