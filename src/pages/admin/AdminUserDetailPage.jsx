import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Shield, Activity, Calendar, MapPin, Eye, ChevronLeft, Bot, MessageSquare, Sparkles } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUserDetail(id);
      if (res.user) {
        setUser(res.user);
      }
    } catch (err) {
      addToast(err.message || 'User not found', 'error');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="h-full bg-[#0B0E14] flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading user detail profile...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-full bg-[#0B0E14] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
      {/* Back Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">{user.display_name}</h1>
          <p className="text-xs text-gray-400">@{user.username} • User ID #{user.id}</p>
        </div>
      </div>

      {/* Main Profile Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#131822] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url || 'https://via.placeholder.com/150'}
              alt={user.display_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shrink-0"
            />
            <div>
              <h3 className="font-bold text-base text-white">{user.display_name}</h3>
              <p className="text-xs text-indigo-300">@{user.username}</p>
              <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                user.role === 'superadmin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                'bg-white/5 text-gray-400 border-white/10'
              }`}>
                Role: {user.role}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Account Status</span>
              <strong className="text-white capitalize">{user.account_status}</strong>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Email Verified</span>
              <strong className={user.is_verified ? 'text-emerald-400' : 'text-amber-400'}>
                {user.is_verified ? 'Yes' : 'No'}
              </strong>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Active Sessions</span>
              <strong className="text-white">{user.active_sessions_count}</strong>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Created AI Characters</span>
              <strong className="text-white">{user.characters_created_count}</strong>
            </div>
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="bg-[#131822] border border-white/10 rounded-3xl p-6 space-y-3 shadow-2xl md:col-span-2">
          <h3 className="font-bold text-sm text-gray-300 uppercase tracking-wider">Security & Geolocation Metadata</h3>

          <div className="grid grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-gray-400 block text-[11px]">Last IP Address</span>
              <strong className="text-white font-mono">{user.last_ip || 'N/A'}</strong>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-gray-400 block text-[11px]">Location</span>
              <strong className="text-white">{user.city ? `${user.city}, ${user.country_name}` : 'Unknown'}</strong>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-gray-400 block text-[11px]">Timezone</span>
              <strong className="text-white">{user.timezone || 'UTC'}</strong>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-gray-400 block text-[11px]">Registration Date</span>
              <strong className="text-white">{new Date(user.created_at).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
