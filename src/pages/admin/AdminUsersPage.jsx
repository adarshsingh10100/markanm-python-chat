import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Search, Filter, Shield, AlertTriangle, Eye, Lock, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

  // Action Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'suspend' | 'ban' | 'impersonate'
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        search,
        status: statusFilter,
        role: roleFilter,
        page
      });
      if (res.users) {
        setUsers(res.users);
        setPagination(res.pagination);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load user directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, roleFilter, page]);

  const handleAction = async (e) => {
    e.preventDefault();
    if (!selectedUser || !actionType) return;

    setSubmitting(true);
    try {
      if (actionType === 'suspend') {
        const res = await adminService.suspendUser(selectedUser.id, { reason, until });
        addToast(res.message, 'success');
      } else if (actionType === 'ban') {
        const res = await adminService.banUser(selectedUser.id, { reason });
        addToast(res.message, 'success');
      } else if (actionType === 'impersonate') {
        const res = await adminService.impersonateUser(selectedUser.id, {
          admin_password: adminPassword,
          reason
        });
        addToast(res.message, 'success');
        if (res.token) {
          localStorage.setItem('auth_token', res.token);
          sessionStorage.setItem('auth_token', res.token);
          window.location.href = '/chat';
          return;
        }
      }
      setSelectedUser(null);
      setActionType(null);
      setReason('');
      setUntil('');
      setAdminPassword('');
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (userId) => {
    try {
      const res = await adminService.restoreUser(userId);
      addToast(res.message, 'success');
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Failed to restore user', 'error');
    }
  };

  const isSuperAdmin = (currentUser?.role || '').toLowerCase() === 'superadmin';

  return (
    <div className="h-full bg-[#0B0E14] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">User Directory & Governance</h1>
            <p className="text-xs text-gray-400">Search accounts, manage status (suspend/ban/restore), and impersonate users</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, username, email, IP..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#131822] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131822] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="">All Account Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131822] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#131822] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-bold text-gray-400">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Known IP</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">Loading user directory...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No users found matching search criteria.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const isTargetAdmin = ['admin', 'superadmin'].includes((u.role || '').toLowerCase());
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url || 'https://via.placeholder.com/150'}
                            alt={u.display_name}
                            className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">{u.display_name}</span>
                            <span className="text-[11px] text-gray-400">@{u.username} • {u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          u.role === 'superadmin'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : u.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          u.account_status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : u.account_status === 'suspended'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {u.account_status || 'active'}
                        </span>
                      </td>

                      <td className="p-4 text-gray-400 font-mono text-[11px]">
                        {u.last_ip || 'N/A'} {u.country_code ? `(${u.country_code})` : ''}
                      </td>

                      <td className="p-4 text-gray-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate (Superadmin only & non-admin targets) */}
                          {isSuperAdmin && !isTargetAdmin && u.account_status === 'active' && (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setActionType('impersonate');
                              }}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors"
                              title="Impersonate User"
                            >
                              <Eye className="w-3.5 h-3.5 inline mr-1" />
                              Impersonate
                            </button>
                          )}

                          {/* Suspend / Ban / Restore */}
                          {u.account_status === 'active' && !isTargetAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setActionType('suspend');
                                }}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setActionType('ban');
                                }}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Ban
                              </button>
                            </>
                          )}

                          {(u.account_status === 'suspended' || u.account_status === 'banned') && (
                            <button
                              onClick={() => handleRestore(u.id)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total users)</span>
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

      {/* Action Modal (Suspend / Ban / Impersonate) */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#131822] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white capitalize">
              {actionType === 'impersonate' ? 'Step-Up Verification: Impersonate User' : `${actionType} User: ${selectedUser.display_name}`}
            </h3>

            <form onSubmit={handleAction} className="space-y-4">
              {actionType === 'impersonate' && (
                <>
                  <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                    🔒 Impersonating <strong>{selectedUser.display_name}</strong> (@{selectedUser.username}). Re-enter your admin password to confirm.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Your Admin Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm your password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {actionType === 'suspend' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Suspension Reason</label>
                    <textarea
                      rows="2"
                      required
                      placeholder="Specify reason for suspension..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Suspend Until (Optional)</label>
                    <input
                      type="datetime-local"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              {actionType === 'ban' && (
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Ban Reason</label>
                  <textarea
                    rows="2"
                    required
                    placeholder="Specify reason for permanent ban..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg ${
                    actionType === 'ban' ? 'bg-red-600 hover:bg-red-500 text-white' : 'btn-gradient'
                  }`}
                >
                  {submitting ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
