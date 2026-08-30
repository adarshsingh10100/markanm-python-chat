import React, { useState } from 'react';
import { Eye, LogOut, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';

export function ImpersonationBanner() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [ending, setEnding] = useState(false);

  const isImpersonatingFlag = localStorage.getItem('markanm_impersonating') === 'true';
  const isImpersonation = Boolean(
    user && (
      user.is_impersonation === 1 || 
      Number(user.is_impersonation) === 1 || 
      Boolean(user.impersonated_by) ||
      isImpersonatingFlag
    )
  );

  if (!isImpersonation) return null;

  const handleEndAndNavigate = async (targetPath = '/admin/users') => {
    setEnding(true);
    try {
      localStorage.removeItem('markanm_impersonating');
      const res = await adminService.endImpersonation();
      addToast('Exited impersonation session. Welcome back, Admin!', 'info');
      if (res.token) {
        localStorage.setItem('markanm_token', res.token);
      }
      window.location.href = targetPath;
    } catch (err) {
      localStorage.removeItem('markanm_impersonating');
      addToast(err.message || 'Exited impersonation', 'info');
      window.location.href = targetPath;
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-2 border-b border-amber-400/40 shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold z-50 shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-200 animate-pulse shrink-0" />
        <span>
          Viewing as <strong className="underline decoration-white/40">{user?.display_name || 'User'}</strong> (@{user?.username || 'user'}) — Impersonated Session
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => handleEndAndNavigate('/admin/users')}
          disabled={ending}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg border border-white/30 flex items-center gap-1.5 transition-all text-xs font-extrabold shadow-sm"
        >
          <Shield className="w-3.5 h-3.5 text-amber-200" />
          <span>{ending ? 'Exiting...' : 'Go to Admin Panel'}</span>
          <ArrowRight className="w-3 h-3 opacity-80" />
        </button>

        <button
          onClick={() => handleEndAndNavigate('/admin/users')}
          disabled={ending}
          className="px-3 py-1 bg-black/40 hover:bg-black/60 text-white rounded-lg border border-white/20 flex items-center gap-1.5 transition-all text-xs font-extrabold"
        >
          <LogOut className="w-3.5 h-3.5 text-amber-300" />
          <span>{ending ? 'Exiting...' : 'Exit Impersonation'}</span>
        </button>
      </div>
    </div>
  );
}
