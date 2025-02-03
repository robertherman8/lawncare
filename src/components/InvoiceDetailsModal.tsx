import React from 'react';
import { X } from 'lucide-react';
import type { Database } from '../types/supabase';
import PayInvoiceButton from './PayInvoiceButton';

type Invoice = Database['public']['Tables']['invoices']['Row'];

interface InvoiceDetailsModalProps {
  invoice: Invoice;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function InvoiceDetailsModal({ invoice, onClose, onPaymentSuccess }: InvoiceDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Invoice Details</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Invoice ID</h3>
            <p className="mt-1 text-sm text-gray-900">{invoice.id}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Amount</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              ${(invoice.amount / 100).toFixed(2)}
            </p>
          </div>

          {invoice.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {invoice.description}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className={`mt-1 inline-flex rounded-full px-2 text-xs font-semibold ${
              invoice.status === 'paid'
                ? 'bg-green-100 text-green-800'
                : invoice.status === 'sent'
                ? 'bg-blue-100 text-blue-800'
                : invoice.status === 'draft'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {invoice.status}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>

          {invoice.status === 'sent' && (
            <div className="pt-4">
              <PayInvoiceButton
                invoiceId={invoice.id}
                amount={invoice.amount}
                onSuccess={() => {
                  onPaymentSuccess();
                  onClose();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}