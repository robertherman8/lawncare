import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import AppointmentBooking from '../components/AppointmentBooking';
import AppointmentList from '../components/AppointmentList';
import InvoiceDetailsModal from '../components/InvoiceDetailsModal';
import CustomerPaymentInfo from '../components/CustomerPaymentInfo';
import PropertyInfoForm from '../components/PropertyInfoForm';
import { CreditCard, MapPin, Calendar } from 'lucide-react';

type Invoice = Database['public']['Tables']['invoices']['Row'];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'appointments'>('invoices');

  async function handleInvoiceView(invoice: Invoice) {
    if (invoice.status === 'sent') {
      try {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'opened' })
          .eq('id', invoice.id)
          .eq('status', 'sent');

        if (error) throw error;
      } catch (err) {
        console.error('Error updating invoice status:', err);
      }
    }
    setSelectedInvoice(invoice);
  }

  async function fetchInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', user?.id)
        .in('status', ['sent', 'opened', 'paid'])
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

  useEffect(() => {
    fetchInvoices();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Customer Dashboard</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage your invoices, payments, and view pricing
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'invoices' ? 'appointments' : 'invoices')}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto mr-2"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {activeTab === 'invoices' ? 'View Appointments' : 'View Invoices'}
            </button>
            <button
              type="button"
              onClick={() => setShowPropertyForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto mr-2"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Property Details
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentInfo(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Payment Info
            </button>
          </div>
        </div>

        {activeTab === 'appointments' ? (
          <div className="mt-6 space-y-8">
            <AppointmentBooking />
            <AppointmentList />
          </div>
        ) : (
          <>
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
                            <td colSpan={4} className="px-3 py-4 text-sm text-gray-500 text-center">
                              Loading...
                            </td>
                          </tr>
                        ) : invoices.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-sm text-gray-500 text-center">
                              No invoices found
                            </td>
                          </tr>
                        ) : (
                          invoices.map((invoice) => (
                            <tr
                              key={invoice.id}
                              onClick={() => handleInvoiceView(invoice)}
                              className="cursor-pointer hover:bg-gray-50"
                            >
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {invoice.id}
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
                                    : invoice.status === 'opened'
                                    ? 'bg-blue-100 text-blue-800'
                                    : invoice.status === 'draft'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {invoice.status === 'sent' ? 'unopened' : 
                                   invoice.status === 'opened' ? 'opened' :
                                   invoice.status}
                                </span>
                              </td>
                              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-6">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInvoiceView(invoice);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  View Details
                                </button>
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
          </>
        )}

        {showPaymentInfo && (
          <CustomerPaymentInfo
            onClose={() => setShowPaymentInfo(false)}
            onSuccess={() => {
              setShowPaymentInfo(false);
              fetchInvoices();
            }}
          />
        )}

        {showPropertyForm && (
          <PropertyInfoForm
            onClose={() => setShowPropertyForm(false)}
            onSuccess={() => {
              setShowPropertyForm(false);
            }}
          />
        )}
      </div>
      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPaymentSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}