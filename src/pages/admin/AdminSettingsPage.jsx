import React, { useState } from 'react';
import { Key, Shield, CheckCircle, AlertTriangle, RefreshCw, Zap, Server } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function AdminSettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const role = (user?.role || '').toLowerCase();
  const uname = (user?.username || '').toLowerCase();
  const isSuperAdmin = role === 'superadmin' || role === 'admin' || uname === 'gdr' || uname === 'admin' || Number(user?.id) === 1;

  const handleRotateKey = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await adminService.rotateAiKey({ provider, api_key: apiKey.trim() });
      addToast(res.message, 'success');
      setStatusMessage({ type: 'success', text: res.message });
      setApiKey('');
    } catch (err) {
      addToast(err.message || 'Key rotation verification failed', 'error');
      setStatusMessage({ type: 'error', text: err.message || 'Key verification failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="h-full bg-[#0B0E14] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Platform Settings & API Key Rotation</h1>
            <p className="text-xs text-gray-400">Hot-swap system AI provider credentials without server restarts or deploys</p>
          </div>
        </div>
      </div>

      {!isSuperAdmin ? (
        <div className="p-6 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-400 shrink-0" />
          <span>Superadmin role required to access platform API key rotation settings.</span>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Key Rotation Card */}
          <div className="bg-[#131822] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Server className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">System AI Credentials Override</h3>
                <p className="text-xs text-gray-400">Updates stored in database `app_settings` (encrypted via AES-256-GCM)</p>
              </div>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-950/40 text-red-300 border-red-500/30'
              }`}>
                {statusMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleRotateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Select AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="groq">Groq AI (Primary Fallback)</option>
                  <option value="sarvam">Sarvam AI (Indic Language Engine)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">New API Key Value</label>
                <input
                  type="password"
                  required
                  placeholder={provider === 'groq' ? 'gsk_...' : 'sarvam_...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Submitting will execute a 1-token test call to verify key validity before saving.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={testing || !apiKey.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Testing Key Validity...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Verify & Save Key Override</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
