import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { PlusCircle, MinusCircle } from 'lucide-react';

type Customer = Database['public']['Tables']['profiles']['Row'] & {
  email: string;
};

type PricingTier = Database['public']['Tables']['pricing_tiers']['Row'];

interface CreateInvoiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateInvoiceForm({ onSuccess, onCancel }: CreateInvoiceFormProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [adjustments, setAdjustments] = useState<{ description: string; amount: number }[]>([]);
  const [landArea, setLandArea] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCustomers();
    fetchPricingTiers();
  }, []);

  async function fetchPricingTiers() {
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('is_active', true)
        .order('base_price');

      if (error) throw error;
      setPricingTiers(data || []);
    } catch (err) {
      console.error('Error fetching pricing tiers:', err);
      setError('Failed to load pricing tiers');
    }
  }

  function handleTierSelect(tierId: string) {
    setSelectedTierId(tierId);
    const tier = pricingTiers.find(t => t.id === tierId);
    if (tier) {
      setCustomPrice((tier.base_price / 100).toString());
    }
  }

  function addAdjustment() {
    setAdjustments([...adjustments, { description: '', amount: 0 }]);
  }

  function removeAdjustment(index: number) {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  }

  function updateAdjustment(index: number, field: 'description' | 'amount', value: string) {
    const newAdjustments = [...adjustments];
    if (field === 'amount') {
      newAdjustments[index].amount = parseFloat(value) * 100;
    } else {
      newAdjustments[index].description = value;
    }
    setAdjustments(newAdjustments);
  }

  function calculateTotalAmount(): number {
    let baseAmount = 0;
    
    if (selectedTierId) {
      const selectedTier = pricingTiers.find(t => t.id === selectedTierId);
      if (selectedTier) {
        baseAmount = selectedTier.base_price;
      }
    } else if (customPrice) {
      baseAmount = Math.round(parseFloat(customPrice) * 100);
    }

    // Add area-based pricing if applicable
    const selectedTier = pricingTiers.find(t => t.id === selectedTierId);
    const area = parseFloat(landArea || '0');
    const areaPricing = selectedTier?.price_per_sqm && area > 0
      ? Math.round(selectedTier.price_per_sqm * (area * 4046.86)) // Convert acres to square meters
      : 0;
    
    const adjustmentsTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
    return baseAmount + areaPricing + adjustmentsTotal;
  }

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .rpc('get_customers_with_email')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setLoadingCustomers(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
      setLoadingCustomers(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!selectedCustomerId || selectedCustomerId.trim() === '') {
        throw new Error('Please select a customer');
      }

      const totalAmount = calculateTotalAmount();
      if (!totalAmount || totalAmount <= 0) {
        throw new Error('Invalid amount. Please enter a valid price or select a pricing tier');
      }

      if (!description.trim()) {
        throw new Error('Please add some notes or description');
      }

      // Validate pricing selection
      if (!selectedTierId && !customPrice) {
        throw new Error('Please select a pricing tier or enter a custom price');
      }

      // If a tier is selected, validate land area if required
      const selectedTier = pricingTiers.find(t => t.id === selectedTierId);
      if (selectedTier?.price_per_sqm > 0) {
        const area = parseFloat(landArea || '0');
        if (!area || area <= 0) {
          throw new Error('Please enter a valid land area');
        }
        if (selectedTier.min_area && area * 4046.86 < selectedTier.min_area) {
          throw new Error(`Minimum area required is ${(selectedTier.min_area / 4046.86).toFixed(2)} acres`);
        }
        if (selectedTier.max_area && area * 4046.86 > selectedTier.max_area) {
          throw new Error(`Maximum area allowed is ${(selectedTier.max_area / 4046.86).toFixed(2)} acres`);
        }
      }

      // Create invoice in Supabase
      const { data: invoice, error: dbError } = await supabase
        .from('invoices')
        .insert({
          customer_id: selectedCustomerId.trim(),
          manager_id: user?.id,
          amount: totalAmount,
          status: 'draft',
          description: `${description}\n\n${
            selectedTierId 
              ? `Base Package: ${pricingTiers.find(t => t.id === selectedTierId)?.name}`
              : 'Custom Price'
          }\n\nBreakdown:${
            selectedTierId
              ? `\n- Base Price: $${(pricingTiers.find(t => t.id === selectedTierId)?.base_price / 100).toFixed(2)}`
              : `\n- Custom Price: $${customPrice}`
          }${
            selectedTier?.price_per_sqm && landArea
              ? `\n- Land Area: ${parseFloat(landArea).toFixed(2)} acres @ $${((selectedTier.price_per_sqm * 4046.86) / 100).toFixed(2)}/acre = $${((selectedTier.price_per_sqm * parseFloat(landArea) * 4046.86) / 100).toFixed(2)}`
              : ''
          }${
            adjustments.length > 0 
              ? '\n\nAdjustments:' + adjustments.map(adj => 
                  `\n- ${adj.description}: $${(adj.amount / 100).toFixed(2)}`
                ).join('\n')
              : ''
          }\n\nTotal Amount: $${(calculateTotalAmount() / 100).toFixed(2)}`,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error creating invoice:', dbError);
        throw new Error(
          dbError.code === '23503' ? 'Invalid customer selected. Please try again.' :
          dbError.code === '23514' ? 'Invalid amount or data. Please check your inputs.' :
          'Failed to create invoice. Please try again.'
        );
      }

      if (!invoice) {
        throw new Error('Failed to create invoice. Please try again.');
      }

      onSuccess();
      showToast('Invoice created successfully', 'success');
    } catch (err) {
      console.error('Error creating invoice:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invoice. Please try again.';
      setError(errorMessage);
      showToast('Failed to create invoice', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="customerId" className="block text-sm font-medium text-gray-700">
          Select Customer
        </label>
        <div className="mt-1">
          <select
            id="customerId"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            required
            disabled={loadingCustomers}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.email}
              </option>
            ))}
          </select>
          {loadingCustomers && (
            <p className="mt-1 text-sm text-gray-500">Loading customers...</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pricing
        </label>
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            {pricingTiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleTierSelect(tier.id)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedTierId === tier.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{tier.name}</div>
                <div className="text-sm text-gray-500">{tier.description}</div>
                <div className="mt-2 text-lg font-semibold text-indigo-600">
                  ${(tier.base_price / 100).toFixed(2)}
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedTierId('');
                setCustomPrice('');
              }}
              className={`p-4 border rounded-lg text-left transition-colors ${
                !selectedTierId
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">Custom Price</div>
              <div className="text-sm text-gray-500">Set a custom amount</div>
              {!selectedTierId && (
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter amount"
                  min="0.01"
                  step="0.01"
                />
              )}
            </button>
          </div>
        </div>

        {selectedTierId && pricingTiers.find(t => t.id === selectedTierId)?.price_per_sqm > 0 && (
          <div>
            <label htmlFor="landArea" className="block text-sm font-medium text-gray-700 mb-1">
              Land Area (acres)
            </label>
            <div className="mt-1">
              <input
                type="number"
                id="landArea"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                min={pricingTiers.find(t => t.id === selectedTierId)?.min_area ? pricingTiers.find(t => t.id === selectedTierId)?.min_area / 4046.86 : 0}
                max={pricingTiers.find(t => t.id === selectedTierId)?.max_area ? pricingTiers.find(t => t.id === selectedTierId)?.max_area / 4046.86 : undefined}
                step="0.01"
                required={pricingTiers.find(t => t.id === selectedTierId)?.price_per_sqm > 0}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              {pricingTiers.find(t => t.id === selectedTierId)?.min_area > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  Minimum area: {((pricingTiers.find(t => t.id === selectedTierId)?.min_area || 0) / 4046.86).toFixed(2)} acres
                </p>
              )}
              {pricingTiers.find(t => t.id === selectedTierId)?.max_area && (
                <p className="mt-1 text-sm text-gray-500">
                  Maximum area: {((pricingTiers.find(t => t.id === selectedTierId)?.max_area || 0) / 4046.86).toFixed(2)} acres
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Price Adjustments
            </label>
            <button
              type="button"
              onClick={addAdjustment}
              className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
            >
              <PlusCircle className="w-4 h-4 mr-1" />
              Add Adjustment
            </button>
          </div>
          <div className="space-y-3">
            {adjustments.map((adjustment, index) => (
              <div key={index} className="flex items-start space-x-3">
                <input
                  type="text"
                  value={adjustment.description}
                  onChange={(e) => updateAdjustment(index, 'description', e.target.value)}
                  placeholder="Adjustment description"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="number"
                  value={adjustment.amount / 100}
                  onChange={(e) => updateAdjustment(index, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  step="0.01"
                />
                <button
                  type="button"
                  onClick={() => removeAdjustment(index)}
                  className="text-red-600 hover:text-red-500"
                >
                  <MinusCircle className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(calculateTotalAmount() / 100).toFixed(2)}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Additional Notes
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}