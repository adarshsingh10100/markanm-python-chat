import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle2, XCircle, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import { developerService } from '../services/developerService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { decodeHTML } from '../utils/textUtils';

export function OAuthAuthorizePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope') || 'profile.read username.read avatar.read';
  const state = searchParams.get('state') || '';

  const [authInfo, setAuthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setErrorMsg('Missing client_id parameter.');
      setLoading(false);
      return;
    }

    developerService.getAuthorizeInfo(clientId, redirectUri || '', scope, state)
      .then(res => setAuthInfo(res))
      .catch(err => setErrorMsg(err.message || 'Invalid authorization request.'))
      .finally(() => setLoading(false));
  }, [clientId, redirectUri, scope, state]);

  const handleAllow = async () => {
    setAuthorizing(true);
    try {
      const res = await developerService.authorizeApp(clientId, authInfo.redirect_uri, scope, state);
      if (res.redirect_url) {
        window.location.href = res.redirect_url;
      }
    } catch (err) {
      addToast(err.message || 'Authorization failed.', 'error');
      setAuthorizing(false);
    }
  };

  const handleCancel = () => {
    if (authInfo?.redirect_uri) {
      const delimiter = authInfo.redirect_uri.includes('?') ? '&' : '?';
      window.location.href = `${authInfo.redirect_uri}${delimiter}error=access_denied&error_description=User+cancelled+authorization`;
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-gray-400 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading MarkanM Authorization...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full glass-panel rounded-3xl border border-red-500/30 p-8 text-center flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Authorization Error</h2>
          <p className="text-xs text-gray-300 bg-red-950/30 p-3 rounded-2xl border border-red-500/20 w-full">{errorMsg}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg mt-2"
          >
            Return to MarkanM
          </button>
        </div>
      </div>
    );
  }

  const app = authInfo?.app;
  const scopes = authInfo?.scopes || [];

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel rounded-3xl border border-white/15 p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
        {/* App Icon / Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-white/20 p-1 shadow-xl mb-4 flex items-center justify-center">
          {app.icon_url ? (
            <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Sparkles className="w-8 h-8 text-white" />
          )}
        </div>

        <h1 className="text-2xl font-black text-white">{app.name}</h1>
        <p className="text-xs text-gray-400 mt-1">
          by <span className="text-indigo-400 font-semibold">@{app.developer_username}</span>
        </p>

        {app.description && (
          <p className="text-xs text-gray-300 mt-3 px-2 line-clamp-2 bg-white/5 p-3 rounded-2xl border border-white/5">
            "{app.description}"
          </p>
        )}

        <div className="w-full my-6 py-3 border-y border-white/10 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <Avatar src={user?.avatar_url} name={user?.display_name} size="sm" />
            <span className="font-bold text-white">@{user?.username}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/20">
            ✓ Logged In
          </span>
        </div>

        {/* Requested Scopes */}
        <div className="w-full text-left mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Requested Permissions</span>
          </h3>

          <div className="flex flex-col gap-2.5">
            {scopes.map(sc => (
              <div key={sc.scope} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">{sc.name}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{sc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center gap-3">
          <button
            onClick={handleCancel}
            disabled={authorizing}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-2xl text-xs font-bold transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleAllow}
            disabled={authorizing}
            className="flex-1 btn-gradient py-3 rounded-2xl text-xs font-bold shadow-xl flex items-center justify-center gap-1.5 hover:scale-105 transition-transform"
          >
            <span>{authorizing ? 'Authorizing...' : 'Allow Access'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-gray-400" />
          <span>Secure authentication powered by MarkanM Connect</span>
        </p>
      </div>
    </div>
  );
}
