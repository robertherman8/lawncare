import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Building2, MapPin } from 'lucide-react';
import PropertyInfoForm from './PropertyInfoForm';

type PricingTier = Database['public']['Tables']['pricing_tiers']['Row'];

export default function PricingTab() {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPropertyForm, setShowPropertyForm] = useState(false);

  useEffect(() => {
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
      setError('Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex justify-center items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Our Pricing Plans</h2>
          <button
            onClick={() => setShowPropertyForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Add Property Details
          </button>
        </div>
        <p className="mt-2 text-gray-600">
          Choose a plan or provide your property details for custom pricing
        </p>
      </div>

      {showPropertyForm && (
        <PropertyInfoForm
          onClose={() => setShowPropertyForm(false)}
          onSuccess={() => {
            setShowPropertyForm(false);
            // You could add additional logic here if needed
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pricingTiers.map((tier) => (
          <div
            key={tier.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 hover:border-indigo-500 transition-colors"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{tier.name}</h3>
                <Building2 className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="mt-2 text-sm text-gray-500">{tier.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${(tier.base_price / 100).toFixed(2)}
                </span>
                <span className="text-gray-500"> base price</span>
              </div>
              {tier.price_per_sqm > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Additional ${((tier.price_per_sqm * 4046.86) / 100).toFixed(2)} per acre</p>
                  {tier.min_area > 0 && (
                    <p className="mt-1">
                      Minimum: {(tier.min_area / 4046.86).toFixed(2)} acres
                    </p>
                  )}
                  {tier.max_area && (
                    <p className="mt-1">
                      Maximum: {(tier.max_area / 4046.86).toFixed(2)} acres
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {pricingTiers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No pricing plans are currently available. Please check back later.
        </div>
      )}
    </div>
  );
}