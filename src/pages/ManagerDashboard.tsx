import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import CreateInvoiceForm from '../components/CreateInvoiceForm';

type Invoice = Database['public']['Tables']['invoices']['Row'];

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { showToast } = useToast();

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
              Manage invoices and customer payments
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Create Invoice
            </button>
          </div>
        </div>

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
      </div>
    </div>
  );
}