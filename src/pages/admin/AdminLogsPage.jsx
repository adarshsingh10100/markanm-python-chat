import React, { useState, useEffect } from 'react';
import { FileText, Shield, Eye, AlertTriangle, ChevronLeft, ChevronRight, Activity, Terminal } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export function AdminLogsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'activity'

  const [auditLogs, setAuditLogs] = useState([]);
  const [activeImpersonations, setActiveImpersonations] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        const res = await adminService.getSecurityLogs();
        if (res.audit_logs) setAuditLogs(res.audit_logs);
        if (res.active_impersonations) setActiveImpersonations(res.active_impersonations);
      } else {
        const res = await adminService.getActivityLogs(page);
        if (res.logs) {
          setActivityLogs(res.logs);
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  return (
    <div className="h-full bg-[#0B0E14] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Security Audit & Activity Logs</h1>
            <p className="text-xs text-gray-400">Track admin governance actions, impersonation sessions, and user events</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#131822] border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Admin Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            User Activity Logs
          </button>
        </div>
      </div>

      {activeTab === 'audit' ? (
        <div className="space-y-6">
          {/* Active Impersonations Banner */}
          {activeImpersonations.length > 0 && (
            <div className="p-5 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Eye className="w-4 h-4" />
                <span>Active Impersonation Sessions ({activeImpersonations.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeImpersonations.map((imp, idx) => (
                  <div key={idx} className="p-3 bg-black/40 border border-amber-500/20 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Target: {imp.target_name}</span>
                      <span className="text-[11px] text-amber-300">Impersonated by {imp.admin_name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Expires: {new Date(imp.expires_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Audit Log Table */}
          <div className="bg-[#131822] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-gray-300">Audit Trail (Last 50 Governance Actions)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-bold text-gray-400">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Admin</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Target User</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">Loading audit trail...</td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">No admin audit logs recorded yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-gray-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>

                        <td className="p-4 font-bold text-white">
                          {log.admin_name || `Admin #${log.admin_user_id}`}
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono font-bold">
                            {log.action}
                          </span>
                        </td>

                        <td className="p-4 text-gray-300">
                          {log.target_name ? log.target_name : log.target_user_id ? `User #${log.target_user_id}` : '-'}
                        </td>

                        <td className="p-4 font-mono text-gray-400 text-[11px]">
                          {log.ip_address || 'N/A'}
                        </td>

                        <td className="p-4 font-mono text-[11px] text-gray-400 max-w-xs truncate">
                          {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* User Activity Logs Tab */
        <div className="bg-[#131822] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-300">User Activity Stream</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-bold text-gray-400">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">Loading user activity stream...</td>
                  </tr>
                ) : activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">No activity logs found.</td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="p-4 font-bold text-white">
                        {log.display_name ? `${log.display_name} (@${log.username})` : `User #${log.user_id}`}
                      </td>

                      <td className="p-4 font-semibold text-indigo-300">
                        {log.action}
                      </td>

                      <td className="p-4 font-mono text-gray-400 text-[11px]">
                        {log.ip_address || 'N/A'}
                      </td>

                      <td className="p-4 font-mono text-[11px] text-gray-400 max-w-xs truncate">
                        {log.metadata || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span>Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} logs)</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages}
                className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
