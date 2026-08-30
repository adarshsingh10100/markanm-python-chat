import React, { useState } from 'react';
import { Eye, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';

export function ImpersonationBanner() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [ending, setEnding] = useState(false);

  const isImpersonation = Boolean(user && (user.is_impersonation === 1 || Number(user.is_impersonation) === 1 || user.impersonated_by));

  if (!isImpersonation) return null;

  const handleEndImpersonation = async () => {
    setEnding(true);
    try {
      const res = await adminService.endImpersonation();
      addToast('Impersonation session ended. Returning to admin panel.', 'info');
      if (res.token) {
        localStorage.setItem('markanm_token', res.token);
        window.location.href = '/admin/users';
      } else {
        localStorage.removeItem('markanm_token');
        window.location.href = '/login';
      }
    } catch (err) {
      addToast(err.message || 'Failed to end impersonation', 'error');
      localStorage.removeItem('markanm_token');
      window.location.href = '/login';
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-2 border-b border-amber-400/40 shadow-xl flex items-center justify-between text-xs font-bold z-50 shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-200 animate-pulse shrink-0" />
        <span>
          Viewing as <strong className="underline decoration-white/40">{user.display_name}</strong> (@{user.username}) — Impersonated by Admin
        </span>
      </div>

      <button
        onClick={handleEndImpersonation}
        disabled={ending}
        className="px-3.5 py-1 bg-black/40 hover:bg-black/60 text-white rounded-lg border border-white/20 flex items-center gap-1.5 transition-colors shrink-0 font-extrabold"
      >
        <LogOut className="w-3.5 h-3.5 text-amber-300" />
        <span>{ending ? 'Ending...' : 'End Impersonation'}</span>
      </button>
    </div>
  );
}
