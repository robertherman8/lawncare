import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function DebugAuth() {
  const { user, profile } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg text-xs font-mono">
      <div>
        <strong>User ID:</strong> {user.id}
      </div>
      <div>
        <strong>Metadata Role:</strong> {user.user_metadata?.role || 'none'}
      </div>
      <div>
        <strong>Profile Role:</strong> {profile?.role || 'none'}
      </div>
    </div>
  );
}