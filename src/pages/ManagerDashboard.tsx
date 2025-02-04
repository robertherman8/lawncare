import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import ScheduleManager from '../components/ScheduleManager';
import { Settings, Bell, Clock } from 'lucide-react';
import CreateInvoiceForm from '../components/CreateInvoiceForm';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type PricingTier = Database['public']['Tables']['pricing_tiers']['Row'];
type PropertyRequest = {
  id: string;
  customer_id: string;
  status: 'pending' | 'reviewed';
  created_at: string;
  customer_email?: string;
  property_info?: {
    acres: number;
    is_sloped: boolean;
    yard_type: string;
    notes: string;
  };
};

interface PricingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function PricingModal({ onClose, onSuccess }: PricingModalProps) {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pricing' | 'schedules'>('pricing');
  const [newTier, setNewTier] = useState({
    name: '',
    base_price: '',
    price_per_sqm: '',
    min_area: '',
    max_area: '',
    description: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    fetchPricingTiers();
  }, []);

  async function fetchPricingTiers() {
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('base_price');

      if (error) throw error;
      setPricingTiers(data || []);
    } catch (err) {
      console.error('Error fetching pricing tiers:', err);
      setError('Failed to load pricing tiers');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .insert({
          name: newTier.name,
          base_price: Math.round(parseFloat(newTier.base_price) * 100),
          price_per_sqm: Math.round(parseFloat(newTier.price_per_sqm || '0') * 100),
          min_area: parseInt(newTier.min_area || '0'),
          max_area: newTier.max_area ? parseInt(newTier.max_area) : null,
          description: newTier.description,
        });

      if (error) throw error;

      setNewTier({
        name: '',
        base_price: '',
        price_per_sqm: '',
        min_area: '',
        max_area: '',
        description: ''
      });
      await fetchPricingTiers();
      showToast('Pricing tier created successfully', 'success');
    } catch (err) {
      console.error('Error creating pricing tier:', err);
      setError('Failed to create pricing tier');
      showToast('Failed to create pricing tier', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleTierStatus(tierId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .update({ is_active: !currentStatus })
        .eq('id', tierId);

      if (error) throw error;

      await fetchPricingTiers();
      showToast('Pricing tier updated successfully', 'success');
    } catch (err) {
      console.error('Error updating pricing tier:', err);
      showToast('Failed to update pricing tier', 'error');
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Manage Pricing Tiers</h2>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'pricing' ? 'schedules' : 'pricing')}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            {activeTab === 'pricing' ? 'View Schedules' : 'View Pricing'}
          </button>
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

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Pricing Tiers</h3>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : pricingTiers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No pricing tiers found</div>
            ) : (
              pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`p-4 border rounded-lg ${
                    tier.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{tier.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                      <p className="text-lg font-semibold text-indigo-600 mt-2">
                        ${(tier.base_price / 100).toFixed(2)}
                      </p>
                      {tier.price_per_sqm > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          +${((tier.price_per_sqm * 4046.86) / 100).toFixed(2)}/acre
                          {tier.min_area > 0 && ` (min ${(tier.min_area / 4046.86).toFixed(2)} acres)`}
                          {tier.max_area && ` (max ${(tier.max_area / 4046.86).toFixed(2)} acres)`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleTierStatus(tier.id, tier.is_active)}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        tier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Pricing Tier</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={newTier.name}
                onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="base_price" className="block text-sm font-medium text-gray-700">
                Base Price (USD)
              </label>
              <input
                type="number"
                id="base_price"
                value={newTier.base_price}
                onChange={(e) => setNewTier({ ...newTier, base_price: e.target.value })}
                required
                min="0.01"
                step="0.01"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="price_per_sqm" className="block text-sm font-medium text-gray-700 mb-1">
                  Price per acre (USD)
                </label>
                <input
                  type="number"
                  id="price_per_sqm"
                  value={newTier.price_per_sqm}
                  onChange={(e) => setNewTier({ ...newTier, price_per_sqm: (parseFloat(e.target.value) / 4046.86).toString() })}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="min_area" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Area (acres)
                </label>
                <input
                  type="number"
                  id="min_area"
                  value={newTier.min_area}
                  onChange={(e) => setNewTier({ ...newTier, min_area: (parseFloat(e.target.value) * 4046.86).toString() })}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="max_area" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Area (acres)
                </label>
                <input
                  type="number"
                  id="max_area"
                  value={newTier.max_area}
                  onChange={(e) => setNewTier({ ...newTier, max_area: (parseFloat(e.target.value) * 4046.86).toString() })}
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={newTier.description}
                onChange={(e) => setNewTier({ ...newTier, description: e.target.value })}
                required
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Pricing Tier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [propertyRequests, setPropertyRequests] = useState<PropertyRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PropertyRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'schedules' | 'appointments'>('invoices');
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPropertyRequests();
    fetchPendingAppointments();
  }, []);

  async function fetchPendingAppointments() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!customer_id (
            id,
            email:auth_users!id (
              email
            )
          )
        `)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      console.log('Fetched appointments:', data);
      setPendingAppointments(data || []);
    } catch (err) {
      console.error('Error fetching pending appointments:', err);
      showToast('Failed to load pending appointments', 'error');
    }
  }

  async function handleAppointmentAction(appointmentId: string, action: 'confirm' | 'reject') {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: action === 'confirm' ? 'confirmed' : 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      showToast(`Appointment ${action === 'confirm' ? 'confirmed' : 'rejected'} successfully`, 'success');
      fetchPendingAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      showToast(`Failed to ${action} appointment`, 'error');
    }
  }

  async function fetchPropertyRequests() {
    try {
      const { data, error } = await supabase
        .rpc('get_property_requests_with_details')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPropertyRequests(data || []);
    } catch (err) {
      console.error('Error fetching property requests:', err);
      showToast('Failed to load property requests', 'error');
    }
  }

  async function handleSendInvoice(invoiceId: string) {
    try {
      // First verify the invoice exists and is in draft status
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('manager_id', user?.id)
        .eq('status', 'draft')
        .single();

      if (fetchError || !invoice) {
        throw new Error('Invoice not found or not in draft status');
      }

      // Update invoice status to sent
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (updateError || !updatedInvoice) {
        throw new Error('Failed to update invoice status. Invoice may not exist or is not in draft status.');
      }
      
      // Update local state
      setInvoices(prevInvoices =>
        prevInvoices.map(inv =>
          inv.id === invoiceId ? { ...inv, status: 'sent' } : inv
        )
      );

      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === invoiceId ? updatedInvoice : invoice
        )
      );
      setError('');
      showToast('Invoice sent successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invoice';
      console.error('Error sending invoice:', errorMessage);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  }

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('manager_id', user?.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [user?.id]);

  async function handleInvoiceCreated() {
    setShowCreateForm(false);
    // Refresh invoices list
    const { data, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('manager_id', user?.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching invoices:', fetchError);
      return;
    }

    setInvoices(data || []);
    showToast('Invoice created successfully', 'success');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Manager Dashboard</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage property requests, invoices and payments
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab(prev => {
                if (prev === 'schedules') return 'invoices';
                if (prev === 'invoices') return 'appointments';
                return 'schedules';
              })}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <Clock className="w-4 h-4 mr-2" />
              {activeTab === 'schedules' ? 'View Invoices' : 
               activeTab === 'invoices' ? 'View Appointments' : 
               'Manage Schedules'}
            </button>
            <button
              type="button"
              onClick={() => setShowPricingModal(true)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Pricing
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Create Invoice
            </button>
          </div>
        </div>

        {/* Property Requests Section */}
        <div className="mt-8">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">New Property Requests</h2>
          </div>
          
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {propertyRequests.map((request) => (
                <li key={request.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {request.customer_email}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="truncate">
                            {request.property_info?.acres} acres
                            {request.property_info?.is_sloped && ' • On slope'}
                            {' • '}{request.property_info?.yard_type} yard
                          </span>
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {propertyRequests.length === 0 && (
                <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">
                  No new property requests
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Pending Appointments Section */}
        {activeTab === 'appointments' && (
          <div className="mt-8">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Pending Appointments</h2>
            </div>
            
            <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {pendingAppointments.map((appointment) => (
                  <li key={appointment.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {appointment.customer?.email[0]?.email || 'No email available'}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500">
                            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            {new Date(appointment.scheduled_date).toLocaleDateString()} at {appointment.start_time}
                          </p>
                          {appointment.notes && (
                            <p className="mt-2 text-sm text-gray-500">
                              Notes: {appointment.notes}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0 space-x-2">
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {pendingAppointments.length === 0 && (
                  <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">
                    No pending appointments
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {showPricingModal && (
          <PricingModal
            onClose={() => setShowPricingModal(false)}
            onSuccess={() => {
              setShowPricingModal(false);
              showToast('Pricing updated successfully', 'success');
            }}
          />
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Invoice</h3>
              <CreateInvoiceForm
                onSuccess={handleInvoiceCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {activeTab === 'schedules' ? (
          <div className="mt-8 bg-white rounded-lg shadow">
            <ScheduleManager />
          </div>
        ) : (
          <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Invoice ID
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Customer
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                          Loading...
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                          No invoices found
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {invoice.id}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {invoice.customer_id}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            ${invoice.amount / 100}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : invoice.status === 'draft'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex justify-end space-x-3">
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => handleSendInvoice(invoice.id)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Send Invoice
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Property Request Review Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Review Property Request</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Customer</h4>
                  <p className="mt-1">{selectedRequest.customer_email}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Property Details</h4>
                  <div className="mt-1 space-y-2">
                    <p>Size: {selectedRequest.property_info?.acres} acres</p>
                    <p>Terrain: {selectedRequest.property_info?.is_sloped ? 'Sloped' : 'Flat'}</p>
                    <p>Yard Type: {selectedRequest.property_info?.yard_type}</p>
                    {selectedRequest.property_info?.notes && (
                      <p>Notes: {selectedRequest.property_info.notes}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setShowCreateForm(true);
                      setSelectedRequest(null);
                    }}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}