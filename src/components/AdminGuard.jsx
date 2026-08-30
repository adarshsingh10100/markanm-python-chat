import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full bg-[#0B0E14] flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Verifying security permissions...</span>
        </div>
      </div>
    );
  }

  const role = strtolower(user?.role || 'user');
  const uname = strtolower(user?.username || '');
  const isAdmin = role === 'admin' || role === 'superadmin' || uname === 'gdr' || uname === 'admin' || Number(user?.id) === 1;

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function strtolower(str) {
  return (str || '').toLowerCase();
}
