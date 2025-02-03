import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, CreditCard } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">InvoiceFlow</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Sign up
              </button>
              <button
                onClick={() => navigate('/login')}
                className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Streamline Your</span>
            <span className="block text-indigo-600">Invoice Management</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Effortlessly create, send, and manage invoices. Get paid faster with our secure payment processing system.
          </p>
          <div className="mt-10">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="flex justify-center">
                <ShieldCheck className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-900">Secure Payments</h3>
              <p className="mt-2 text-gray-500">
                Industry-leading security with encrypted transactions and secure payment processing.
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center">
                <CreditCard className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-900">Easy Invoicing</h3>
              <p className="mt-2 text-gray-500">
                Create and send professional invoices in seconds with our intuitive interface.
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center">
                <Building2 className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-900">Business Management</h3>
              <p className="mt-2 text-gray-500">
                Comprehensive tools for managing your business finances and customer relationships.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}