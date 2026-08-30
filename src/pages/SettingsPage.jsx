import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Shield, User, Bell, Sparkles, Map, Lock, Info, Check, ShieldCheck, Code, AlertTriangle, ExternalLink, Key, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { request } from '../services/api';
import { userService } from '../services/userService';
import { developerService } from '../services/developerService';
import { BlockedUsersTab } from '../components/BlockedUsersTab';
import { ConnectedAppsTab } from '../components/ConnectedAppsTab';

export function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('privacy');

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

  // AI Keys states
  const [aiKeys, setAiKeys] = useState({ groq: { has_key: false, masked: null }, sarvam: { has_key: false, masked: null } });
  const [groqInput, setGroqInput] = useState('');
  const [sarvamInput, setSarvamInput] = useState('');
  const [savingGroq, setSavingGroq] = useState(false);
  const [savingSarvam, setSavingSarvam] = useState(false);
  const [groqError, setGroqError] = useState(null);
  const [sarvamError, setSarvamError] = useState(null);

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

  const fetchAiKeys = async () => {
    try {
      const res = await userService.getAiKeys();
      if (res.keys) {
        setAiKeys(res.keys);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchPrivacy();
    fetchDevStatus();
    fetchAiKeys();
  }, []);

  const handleSaveKey = async (provider) => {
    const keyVal = provider === 'groq' ? groqInput : sarvamInput;
    if (!keyVal.trim()) return;

    if (provider === 'groq') {
      setSavingGroq(true);
      setGroqError(null);
    } else {
      setSavingSarvam(true);
      setSarvamError(null);
    }

    try {
      const res = await userService.saveAiKey(provider, keyVal.trim());
      addToast(res.message, 'success');
      if (provider === 'groq') {
        setGroqInput('');
      } else {
        setSarvamInput('');
      }
      fetchAiKeys();
    } catch (err) {
      if (provider === 'groq') {
        setGroqError(err.message || 'Verification failed');
      } else {
        setSarvamError(err.message || 'Verification failed');
      }
    } finally {
      if (provider === 'groq') setSavingGroq(false);
      else setSavingSarvam(false);
    }
  };

  const handleDeleteKey = async (provider) => {
    try {
      const res = await userService.deleteAiKey(provider);
      addToast(res.message, 'info');
      fetchAiKeys();
    } catch (err) {
      addToast(err.message || 'Failed to remove key', 'error');
    }
  };

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
            onClick={() => setActiveTab('ai_keys')}
            className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition-all ${
              activeTab === 'ai_keys' ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>AI Keys (BYOK)</span>
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

        {/* Tab: Privacy Settings */}
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

        {/* Tab 6: AI Keys (BYOK) */}
        {activeTab === 'ai_keys' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-6">
            <div>
              <span className="text-xs font-extrabold uppercase text-amber-400 tracking-wider">Bring Your Own Key</span>
              <h2 className="text-xl font-black text-white mt-0.5">AI Provider Keys (optional)</h2>
              <p className="text-xs text-gray-400 mt-1">
                If the app's shared AI service is temporarily unavailable, your own key will be used automatically as a personal backup for your chats only.
              </p>
            </div>

            {/* Groq Key Card */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Groq API Key</span>
                  {aiKeys.groq?.has_key && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                      Saved ({aiKeys.groq.masked})
                    </span>
                  )}
                </div>
                {aiKeys.groq?.has_key && (
                  <button
                    onClick={() => handleDeleteKey('groq')}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-xs flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={aiKeys.groq?.has_key ? `Change key (${aiKeys.groq.masked})` : 'Paste gsk_... key'}
                  value={groqInput}
                  onChange={(e) => setGroqInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={() => handleSaveKey('groq')}
                  disabled={savingGroq || !groqInput.trim()}
                  className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 disabled:opacity-50"
                >
                  {savingGroq ? 'Verifying...' : 'Save Key'}
                </button>
              </div>

              {groqError && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 p-2.5 rounded-xl">
                  {groqError}
                </p>
              )}
            </div>

            {/* Sarvam Key Card */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Sarvam AI API Key</span>
                  {aiKeys.sarvam?.has_key && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                      Saved ({aiKeys.sarvam.masked})
                    </span>
                  )}
                </div>
                {aiKeys.sarvam?.has_key && (
                  <button
                    onClick={() => handleDeleteKey('sarvam')}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-xs flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={aiKeys.sarvam?.has_key ? `Change key (${aiKeys.sarvam.masked})` : 'Paste sk_... key'}
                  value={sarvamInput}
                  onChange={(e) => setSarvamInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={() => handleSaveKey('sarvam')}
                  disabled={savingSarvam || !sarvamInput.trim()}
                  className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 disabled:opacity-50"
                >
                  {savingSarvam ? 'Verifying...' : 'Save Key'}
                </button>
              </div>

              {sarvamError && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 p-2.5 rounded-xl">
                  {sarvamError}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
