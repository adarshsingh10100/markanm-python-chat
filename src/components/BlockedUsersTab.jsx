import React, { useState, useEffect } from 'react';
import { ShieldOff, Trash2 } from 'lucide-react';
import { request } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';

export function BlockedUsersTab() {
  const { addToast } = useToast();

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocked = async () => {
    setLoading(true);
    try {
      const res = await request('/connections', { method: 'GET' });
      setBlockedUsers(res.blocked || []);
    } catch (e) {
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const handleUnblock = async (userId) => {
    try {
      await request('/users/unblock', { method: 'POST', body: { target_user_id: userId } });
      setBlockedUsers(prev => prev.filter(u => u.user_id !== userId));
      addToast('User unblocked', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to unblock user', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <ShieldOff className="w-5 h-5 text-red-400" />
        <h3 className="text-base font-bold text-white">Blocked Users</h3>
      </div>

      {loading ? (
        <div className="p-4 text-xs text-gray-400">Loading blocked users...</div>
      ) : blockedUsers.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-500 glass-card rounded-2xl border border-white/10">
          You haven't blocked any users.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {blockedUsers.map(u => (
            <div key={u.user_id} className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                <div>
                  <p className="text-xs font-bold text-white">{u.display_name}</p>
                  <p className="text-[10px] text-gray-400">@{u.username}</p>
                </div>
              </div>

              <button
                onClick={() => handleUnblock(u.user_id)}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
