import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Check, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { discoverService } from '../services/discoverService';
import { useToast } from '../context/ToastContext';

export function AdminModerationModal({ isOpen, onClose }) {
  const { addToast } = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await discoverService.listReports();
      setReports(res.reports || []);
    } catch (err) {
      addToast(err.message || 'Failed to load moderation reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async (reportId, action) => {
    try {
      await discoverService.actionReport(reportId, action);
      addToast(`Report marked as ${action}`, 'success');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      addToast(err.message || 'Failed to process report action', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Admin Moderation Dashboard</h3>
              <p className="text-[11px] text-gray-400">Review reported users, rooms, and content</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-xs">Loading moderation reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-emerald-400 text-xs font-semibold">
              ✓ No pending reports. All clear!
            </div>
          ) : (
            reports.map(rep => (
              <div key={rep.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-500/20">
                    {rep.target_type}: ID #{rep.target_id}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Reported by @{rep.reporter?.username} • {new Date(rep.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs font-bold text-white mt-1">Reason: <span className="text-amber-300">{rep.reason}</span></p>
                {rep.description && (
                  <p className="text-xs text-gray-300 bg-black/30 p-2.5 rounded-xl border border-white/5">
                    "{rep.description}"
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleAction(rep.id, 'dismiss')}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-semibold"
                  >
                    Dismiss
                  </button>

                  {rep.target_type === 'room' && (
                    <button
                      onClick={() => handleAction(rep.id, 'close_room')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold"
                    >
                      Close Live Room
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
