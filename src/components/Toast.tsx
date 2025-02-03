import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 flex items-center p-4 rounded-lg shadow-lg space-x-3 ${
      type === 'success' ? 'bg-green-50' : 'bg-red-50'
    }`}>
      {type === 'success' ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-500" />
      )}
      <p className={`text-sm font-medium ${
        type === 'success' ? 'text-green-800' : 'text-red-800'
      }`}>
        {message}
      </p>
      <button
        onClick={onClose}
        className={`ml-4 text-sm font-medium ${
          type === 'success' ? 'text-green-600' : 'text-red-600'
        } hover:opacity-75`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}