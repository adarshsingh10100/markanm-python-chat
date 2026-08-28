import React, { useState, useEffect } from 'react';
import { ShieldCheck, Trash2, ExternalLink, Sparkles } from 'lucide-react';
import { developerService } from '../services/developerService';
import { useToast } from '../context/ToastContext';

export function ConnectedAppsTab() {
  const { addToast } = useToast();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConnectedApps = async () => {
    setLoading(true);
    try {
      const res = await developerService.getConnectedApps();
      setApps(res.connected_apps || []);
    } catch (e) {
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectedApps();
  }, []);

  const handleRevoke = async (appId, appName) => {
    if (!window.confirm(`Revoke access for "${appName}"? This app will no longer be able to access your profile.`)) return;
    try {
      await developerService.revokeAppAccess(appId);
      setApps(prev => prev.filter(a => a.app_id !== appId));
      addToast(`Revoked access for ${appName}`, 'info');
    } catch (err) {
      addToast(err.message || 'Failed to revoke app access', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <ShieldCheck className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-base font-bold text-white">Connected Applications</h3>
          <p className="text-xs text-gray-400">Third-party applications authorized to use your MarkanM account</p>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-gray-400">Loading connected apps...</div>
      ) : apps.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500 glass-card rounded-2xl border border-white/10">
          You haven't connected any third-party applications yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {apps.map(app => (
            <div key={app.app_id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-white/20 p-1 shrink-0 flex items-center justify-center">
                  {app.icon_url ? (
                    <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{app.name}</h4>
                    <span className="text-[10px] text-indigo-400 font-semibold">by @{app.developer_name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{app.description || 'MarkanM Connect Partner'}</p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {app.scopes?.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/20 text-[10px] text-indigo-300 font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="text-[10px] text-gray-500 mt-2">
                    Connected: {new Date(app.granted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(app.app_id, app.name)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-start sm:self-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke Access</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
