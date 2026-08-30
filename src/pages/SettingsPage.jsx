import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Shield, User, Bell, Sparkles, Map, Lock, Info, Check, ShieldCheck, Code, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { request } from '../services/api';
import { developerService } from '../services/developerService';
import { RoadmapModal } from '../components/RoadmapModal';
import { BlockedUsersTab } from '../components/BlockedUsersTab';
import { ConnectedAppsTab } from '../components/ConnectedAppsTab';

export function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('roadmap');
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  // Privacy states
  const [connectionRequests, setConnectionRequests] = useState('everyone');
  const [messaging, setMessaging] = useState('everyone');
  const [typingStatus, setTypingStatus] = useState('everyone');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Developer Mode states
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [appCount, setAppCount] = useState(0);
  const [togglingDev, setTogglingDev] = useState(false);

  const fetchPrivacy = async () => {
    try {
      const res = await request('/user/privacy', { method: 'GET' });
      if (res.settings) {
        setConnectionRequests(res.settings.connection_requests || 'everyone');
        setMessaging(res.settings.messaging || 'everyone');
        setTypingStatus(res.settings.typing_status || 'everyone');
        setShowOnlineStatus(res.settings.show_online_status ?? true);
        setShowLastSeen(res.settings.show_last_seen ?? true);
      }
    } catch (e) {}
  };

  const fetchDevStatus = async () => {
    try {
      const res = await developerService.getApps();
      setIsDeveloper(res.is_developer);
      setAppCount(res.apps?.length || 0);
    } catch (e) {}
  };

  useEffect(() => {
    fetchPrivacy();
    fetchDevStatus();
  }, []);

  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    setSavingPrivacy(true);
    try {
      await request('/user/privacy', {
        method: 'POST',
        body: {
          connection_requests: connectionRequests,
          messaging,
          typing_status: typingStatus,
          show_online_status: showOnlineStatus,
          show_last_seen: showLastSeen
        }
      });
      addToast('Privacy settings saved!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save privacy settings', 'error');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleToggleDeveloperMode = async (enable) => {
    if (!enable && appCount > 0) {
      addToast(`Cannot disable Developer Mode while you have ${appCount} active application(s). Delete your applications first.`, 'error');
      return;
    }

    setTogglingDev(true);
    try {
      const res = await developerService.toggleDeveloperStatus(enable);
      setIsDeveloper(res.is_developer);
      addToast(res.message, 'info');
      // Reload page to refresh sidebar
      window.location.reload();
    } catch (err) {
      addToast(err.message || 'Failed to update Developer Mode status', 'error');
    } finally {
      setTogglingDev(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-[#0B0E14] text-white">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Settings & Preferences</h1>
            <p className="text-xs text-gray-400">Manage privacy, developer mode, connected applications, and roadmap</p>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition-all ${
              activeTab === 'roadmap' ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Map className="w-4 h-4 text-purple-400" />
            <span>Product Progress & Roadmap</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition-all ${
              activeTab === 'privacy' ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Privacy & Safety</span>
          </button>

          <button
            onClick={() => setActiveTab('developer')}
            className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition-all ${
              activeTab === 'developer' ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Code className="w-4 h-4 text-purple-400" />
            <span>Developer Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('connected_apps')}
            className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition-all ${
              activeTab === 'connected_apps' ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Connected Apps</span>
          </button>

          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition-all ${
              activeTab === 'blocked' ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-red-400" />
            <span>Blocked Users</span>
          </button>
        </div>

        {/* Tab 1: Roadmap & Progress */}
        {activeTab === 'roadmap' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider">Product Roadmap Status</span>
                <h2 className="text-xl font-black text-white mt-0.5">Current: Update 4 of 5 (1 major update remaining)</h2>
                <p className="text-xs text-gray-400 mt-1">Update 4 — MarkanM Connect Developer Platform & OAuth</p>
              </div>

              <button
                onClick={() => setIsRoadmapOpen(true)}
                className="btn-gradient px-5 py-3 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Interactive Roadmap</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Update 1</span>
                <h4 className="text-xs font-bold text-white mt-1">Foundation</h4>
                <p className="text-[11px] text-gray-400 mt-1">✓ Completed</p>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Update 2</span>
                <h4 className="text-xs font-bold text-white mt-1">Discover</h4>
                <p className="text-[11px] text-gray-400 mt-1">✓ Completed</p>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Update 3</span>
                <h4 className="text-xs font-bold text-white mt-1">Experience</h4>
                <p className="text-[11px] text-gray-400 mt-1">✓ Completed</p>
              </div>

              <div className="p-4 bg-indigo-600/20 border border-indigo-500/50 rounded-2xl ring-2 ring-indigo-500/30">
                <span className="text-[10px] font-bold text-indigo-300 uppercase">Update 4</span>
                <h4 className="text-xs font-bold text-white mt-1">Connect</h4>
                <p className="text-[11px] text-indigo-400 font-semibold mt-1">● Current</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Privacy Settings */}
        {activeTab === 'privacy' && (
          <form onSubmit={handleSavePrivacy} className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-bold text-white">Privacy Controls</h2>
              <p className="text-xs text-gray-400">Configure who can send requests and view status</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Who can send connection requests?</label>
                <select
                  value={connectionRequests}
                  onChange={(e) => setConnectionRequests(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="everyone" className="bg-[#131822] text-white">Everyone</option>
                  <option value="shared_interests" className="bg-[#131822] text-white">People with shared interests</option>
                  <option value="nobody" className="bg-[#131822] text-white">Nobody</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Who can message me?</label>
                <select
                  value={messaging}
                  onChange={(e) => setMessaging(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="everyone" className="bg-[#131822] text-white">Everyone</option>
                  <option value="connections" className="bg-[#131822] text-white">Connections only</option>
                  <option value="nobody" className="bg-[#131822] text-white">Nobody</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Who can see when I am typing?</label>
                <select
                  value={typingStatus}
                  onChange={(e) => setTypingStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="everyone" className="bg-[#131822] text-white">Everyone (Show typing indicator)</option>
                  <option value="nobody" className="bg-[#131822] text-white">Nobody (Hide typing indicator)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
              <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={showOnlineStatus}
                  onChange={(e) => setShowOnlineStatus(e.target.checked)}
                  className="rounded bg-white/5 border-white/10 text-indigo-600 focus:ring-0"
                />
                <span>Show Online Status</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={showLastSeen}
                  onChange={(e) => setShowLastSeen(e.target.checked)}
                  className="rounded bg-white/5 border-white/10 text-indigo-600 focus:ring-0"
                />
                <span>Show Last Seen timestamp</span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPrivacy}
                className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
              >
                {savingPrivacy ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Developer Mode Controls */}
        {activeTab === 'developer' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">Developer Mode Settings</h2>
                <p className="text-xs text-gray-400">Enable Developer Portal access to build apps with Login with MarkanM & APIs</p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isDeveloper ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'
              }`}>
                {isDeveloper ? '✓ Developer Mode Active' : 'Disabled'}
              </span>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Developer Account Access</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isDeveloper
                    ? 'Developer Mode is currently active. You can manage OAuth apps and APIs in the Developer Portal.'
                    : 'Enable Developer Mode to access the Developer Portal, create OAuth apps, and obtain Client IDs.'}
                </p>
              </div>

              {isDeveloper ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/developers')}
                    className="btn-gradient px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
                  >
                    <span>Open Developer Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleDeveloperMode(false)}
                    disabled={togglingDev}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {togglingDev ? 'Updating...' : 'Disable Developer Mode'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleToggleDeveloperMode(true)}
                  disabled={togglingDev}
                  className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
                >
                  {togglingDev ? 'Enabling...' : 'Enable Developer Mode'}
                </button>
              )}
            </div>

            {isDeveloper && appCount > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>You currently have {appCount} active application(s). You cannot disable Developer Mode until all applications are deleted.</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Connected Apps */}
        {activeTab === 'connected_apps' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <ConnectedAppsTab />
          </div>
        )}

        {/* Tab 5: Blocked Users */}
        {activeTab === 'blocked' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <BlockedUsersTab />
          </div>
        )}

        {/* Interactive Roadmap Modal */}
        <RoadmapModal
          isOpen={isRoadmapOpen}
          onClose={() => setIsRoadmapOpen(false)}
        />
      </div>
    </div>
  );
}
