import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Users, Activity, MessageSquare, AlertTriangle, Zap, Database, Key, FileText, ArrowRight } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminService.getStats();
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load admin stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full bg-[#0B0E14] flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading Admin Dashboard...</span>
        </div>
      </div>
    );
  }

  const fallbackPct = stats?.provider_fallback_rate_pct || 0;
  const isHighFallback = fallbackPct > 15;

  return (
    <div className="h-full bg-[#0B0E14] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">System Admin Console</h1>
            <p className="text-xs text-gray-400">Platform metrics, user governance, security logs, and AI provider key rotation</p>
          </div>
        </div>
      </div>

      {/* Early Warning Signal Banner */}
      {isHighFallback && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-300 flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
          <div className="flex-1 text-xs">
            <strong className="block text-white text-sm">High AI Provider Fallback Rate Detected ({fallbackPct}%)</strong>
            <span>{stats.fallbacks_24h} of {stats.total_ai_logs_24h} requests in the last 24h triggered secondary provider fallback. Shared primary keys may be exhausted or failing.</span>
          </div>
          <Link
            to="/admin/settings"
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
          >
            Rotate Keys
          </Link>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 bg-[#131822] border border-white/10 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Total Accounts</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-3xl font-black text-white">{stats?.total_users || 0}</h3>
          <p className="text-[11px] text-gray-400">Registered platform users</p>
        </div>

        {/* DAU / MAU */}
        <div className="p-5 bg-[#131822] border border-white/10 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active Users</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-black text-white">{stats?.dau || 0}</h3>
            <span className="text-xs text-gray-400 font-semibold">DAU / {stats?.mau || 0} MAU</span>
          </div>
          <p className="text-[11px] text-gray-400">Unique active sessions in last 24h / 30d</p>
        </div>

        {/* Messages Today */}
        <div className="p-5 bg-[#131822] border border-white/10 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Messages Today</span>
            <MessageSquare className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-3xl font-black text-white">{stats?.messages_today || 0}</h3>
          <p className="text-[11px] text-gray-400">{stats?.ai_replies_today || 0} AI character responses generated</p>
        </div>

        {/* Fallback Rate Signal */}
        <div className="p-5 bg-[#131822] border border-white/10 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Provider Fallback Rate</span>
            <Zap className={`w-5 h-5 ${isHighFallback ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <h3 className={`text-3xl font-black ${isHighFallback ? 'text-red-400' : 'text-emerald-400'}`}>
            {fallbackPct}%
          </h3>
          <p className="text-[11px] text-gray-400">Early warning for primary API key failures</p>
        </div>
      </div>

      {/* Navigation Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <Link
          to="/admin/users"
          className="p-5 bg-[#131822] hover:bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-indigo-300">User Directory</h4>
              <p className="text-[11px] text-gray-400">Suspend, Ban & Impersonate</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/admin/logs"
          className="p-5 bg-[#131822] hover:bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-emerald-300">Security Audit Logs</h4>
              <p className="text-[11px] text-gray-400">Activity & Admin Audit Trail</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/admin/database"
          className="p-5 bg-[#131822] hover:bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-purple-300">Database Browser</h4>
              <p className="text-[11px] text-gray-400">Read-Only Server Redacted</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/admin/settings"
          className="p-5 bg-[#131822] hover:bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-amber-300">Platform Keys</h4>
              <p className="text-[11px] text-gray-400">Rotate Groq & Sarvam Keys</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
