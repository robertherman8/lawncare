import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { MapPin, Mountain } from 'lucide-react';

interface PropertyInfoFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PropertyInfoForm({ onClose, onSuccess }: PropertyInfoFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState({
    acres: '',
    isSloped: false,
    yardType: 'both', // 'front', 'back', or 'both'
    notes: ''
  });

  useEffect(() => {
    fetchPropertyInfo();
  }, []);

  async function fetchPropertyInfo() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('property_info')
        .select('*')
        .eq('customer_id', user.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // No rows found
          throw error;
        }
        return;
      }

      if (data) {
        setPropertyInfo({
          acres: data.acres.toString(),
          isSloped: data.is_sloped,
          yardType: data.yard_type || 'both',
          notes: data.notes || ''
        });
      }
    } catch (err) {
      console.error('Error fetching property info:', err);
      showToast('Failed to load property information', 'error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('property_info')
        .upsert({
          customer_id: user.id,
          acres: parseFloat(propertyInfo.acres),
          is_sloped: propertyInfo.isSloped,
          yard_type: propertyInfo.yardType,
          notes: propertyInfo.notes,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Create a notification for managers
      const { error: notificationError } = await supabase
        .from('property_requests')
        .insert({
          customer_id: user.id,
          status: 'pending'
        });

      if (notificationError) throw notificationError;

      showToast('Property information saved successfully', 'success');
      showToast('A manager will review your information and provide pricing shortly', 'success');
      onSuccess();
    } catch (err) {
      console.error('Error saving property info:', err);
      showToast('Failed to save property information', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Property Information</h2>
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
              <MapPin className="w-5 h-5 mr-2" />
              Property Details
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="acres" className="block text-sm font-medium text-gray-700">
                  Property Size (acres)
                </label>
                <input
                  type="number"
                  id="acres"
                  value={propertyInfo.acres}
                  onChange={(e) => setPropertyInfo({ ...propertyInfo, acres: e.target.value })}
                  required
                  min="0.1"
                  step="0.1"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center">
                <Mountain className="w-5 h-5 text-gray-400 mr-2" />
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isSloped"
                      type="checkbox"
                      checked={propertyInfo.isSloped}
                      onChange={(e) => setPropertyInfo({ ...propertyInfo, isSloped: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="isSloped" className="font-medium text-gray-700">
                      Property is on a hill or slope
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Yard Location
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="front"
                      type="radio"
                      name="yardType"
                      value="front"
                      checked={propertyInfo.yardType === 'front'}
                      onChange={(e) => setPropertyInfo({ ...propertyInfo, yardType: e.target.value })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="front" className="ml-3 text-sm font-medium text-gray-700">
                      Front Yard Only
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="back"
                      type="radio"
                      name="yardType"
                      value="back"
                      checked={propertyInfo.yardType === 'back'}
                      onChange={(e) => setPropertyInfo({ ...propertyInfo, yardType: e.target.value })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="back" className="ml-3 text-sm font-medium text-gray-700">
                      Back Yard Only
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="both"
                      type="radio"
                      name="yardType"
                      value="both"
                      checked={propertyInfo.yardType === 'both'}
                      onChange={(e) => setPropertyInfo({ ...propertyInfo, yardType: e.target.value })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="both" className="ml-3 text-sm font-medium text-gray-700">
                      Both Front and Back Yard
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  value={propertyInfo.notes}
                  onChange={(e) => setPropertyInfo({ ...propertyInfo, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional details about your property..."
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
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
              {loading ? 'Saving...' : 'Save Property Info'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}