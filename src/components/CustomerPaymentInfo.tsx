import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Building2, CreditCard } from 'lucide-react';

interface CustomerPaymentInfoProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CustomerPaymentInfo({ onClose, onSuccess }: CustomerPaymentInfoProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [bankInfo, setBankInfo] = useState({
    accountHolder: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking'
  });

  useEffect(() => {
    fetchCustomerInfo();
  }, []);

  async function fetchCustomerInfo() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_payment_info')
        .select('*')
        .eq('customer_id', user.id);

      if (error) {
        console.error('Error fetching customer info:', error);
        showToast('Failed to load customer information', 'error');
        return;
      }

      if (data && data.length > 0) {
        setAddress({
          street: data[0].street || '',
          city: data[0].city || '',
          state: data[0].state || '',
          zipCode: data[0].zip_code || '',
          country: data[0].country || 'US'
        });
      } else {
        // No existing payment info - use defaults
        setAddress({
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        });
      }
    } catch (err) {
      console.error('Error fetching customer info:', err);
      showToast('Failed to load customer information', 'error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Save address information
      const { error: addressError } = await supabase
        .from('customer_payment_info')
        .upsert({
          customer_id: user.id,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zipCode,
          country: address.country,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id'
        });

      if (addressError) {
        console.error('Error saving address:', addressError);
        throw new Error('Failed to save address information');
      }

      // Create or update ACH payment method through Stripe
      const { data: setupData, error: setupError } = await supabase.functions.invoke(
        'setup-ach-payment',
        {
          body: {
            bankAccount: {
              country: 'US',
              currency: 'usd',
              account_holder_name: bankInfo.accountHolder,
              routing_number: bankInfo.routingNumber,
              account_number: bankInfo.accountNumber,
              account_holder_type: 'individual',
              account_type: bankInfo.accountType
            }
          }
        }
      );

      if (setupError) throw setupError;

      showToast('Payment information updated successfully', 'success');
      onSuccess();
    } catch (err) {
      console.error('Error saving payment info:', err);
      showToast('Failed to update payment information', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Billing Address
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  type="text"
                  id="street"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  value={address.zipCode}
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  required
                  pattern="[0-9]{5}"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              ACH Payment Information
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  id="accountHolder"
                  value={bankInfo.accountHolder}
                  onChange={(e) => setBankInfo({ ...bankInfo, accountHolder: e.target.value })}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700">
                  Routing Number
                </label>
                <input
                  type="text"
                  id="routingNumber"
                  value={bankInfo.routingNumber}
                  onChange={(e) => setBankInfo({ ...bankInfo, routingNumber: e.target.value })}
                  required
                  pattern="[0-9]{9}"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                  Account Number
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  value={bankInfo.accountNumber}
                  onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="accountType" className="block text-sm font-medium text-gray-700">
                  Account Type
                </label>
                <select
                  id="accountType"
                  value={bankInfo.accountType}
                  onChange={(e) => setBankInfo({ ...bankInfo, accountType: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Payment Info'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}