import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Search, Filter, Shield, AlertTriangle, Eye, Lock, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Bot, UserCheck } from 'lucide-react';
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
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'human' | 'bot'
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
        type: typeFilter,
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
  }, [search, statusFilter, roleFilter, typeFilter, page]);

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
          localStorage.setItem('markanm_token', res.token);
          localStorage.setItem('markanm_impersonating', 'true');
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
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-80">
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

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Type Filter (Human vs Bot vs All) */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131822] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-300 focus:outline-none cursor-pointer"
          >
            <option value="all">🌐 All Accounts (Humans & Bots)</option>
            <option value="human">👤 Real Users Only</option>
            <option value="bot">🤖 AI Characters Only</option>
          </select>

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
                <th className="p-4">Account Type</th>
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
                  <td colSpan="7" className="p-8 text-center text-gray-500">Loading user directory...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No users found matching search criteria.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const isBot = Boolean(u.is_bot || u.is_ai || (u.email && u.email.includes('@ai.markanm.com')));
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
                            <Link to={`/admin/users/${u.id}`} className="font-bold text-white hover:text-indigo-400 transition-colors">
                              {u.display_name}
                            </Link>
                            <div className="text-[11px] text-gray-400 flex items-center gap-2">
                              <span>@{u.username}</span>
                              <span>•</span>
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {isBot ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            <Bot className="w-3 h-3" /> AI Bot
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <UserCheck className="w-3 h-3" /> Human User
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.account_status === 'banned' ? (
                          <span className="inline-flex items-center gap-1 text-red-400 font-bold uppercase text-[10px]">
                            <XCircle className="w-3 h-3" /> Banned
                          </span>
                        ) : u.account_status === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold uppercase text-[10px]">
                            <Clock className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold uppercase text-[10px]">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-gray-400">
                        {u.last_ip || 'N/A'}
                      </td>
                      <td className="p-4 text-gray-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.account_status === 'active' ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setActionType('impersonate');
                                }}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> Impersonate
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setActionType('suspend');
                                }}
                                className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition-colors"
                              >
                                Suspend
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setActionType('ban');
                                }}
                                className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-[11px] font-semibold transition-colors"
                              >
                                Ban
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(u.id)}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Restore Account
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
        {pagination.total_pages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span>Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total users)</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage(prev => prev + 1)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Dialog Modal */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full bg-[#131822] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              {actionType === 'impersonate' ? (
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
              ) : actionType === 'suspend' ? (
                <div className="w-10 h-10 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-sm text-white capitalize">{actionType} User</h3>
                <p className="text-xs text-gray-400">{selectedUser.display_name} (@{selectedUser.username})</p>
              </div>
            </div>

            <form onSubmit={handleAction} className="space-y-4">
              {actionType === 'impersonate' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Confirm Admin Password (Step-Up Security)</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your current password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {actionType === 'suspend' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Suspension Expiry Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Reason / Internal Note</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain the reason for this administrative action (logged to audit trail)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg ${
                    actionType === 'impersonate'
                      ? 'bg-indigo-600 hover:bg-indigo-500'
                      : actionType === 'suspend'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {submitting ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
