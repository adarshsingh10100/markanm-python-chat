import React, { useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { experienceService } from '../services/experienceService';

export function ExperienceSandboxModal({ isOpen, onClose, experience, sessionCode, conversationId, onSendMessage }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !experience) return;

    const handleMessage = async (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'MARKANM_INIT') {
        // Send initial user profile & session state to iframe
        let sessionData = null;
        if (sessionCode) {
          try {
            const res = await experienceService.getSessionState(sessionCode);
            sessionData = res.session;
          } catch (e) {}
        }

        iframeRef.current?.contentWindow?.postMessage({
          type: 'MARKANM_INIT_RESPONSE',
          user: {
            id: user?.id,
            display_name: user?.display_name,
            username: user?.username,
            avatar_url: user?.avatar_url
          },
          session: sessionData
        }, '*');
      } else if (data.type === 'MARKANM_UPDATE_STATE') {
        if (sessionCode && data.state) {
          try {
            await experienceService.updateSessionState(sessionCode, data.state, data.score);
          } catch (e) {}
        }
      } else if (data.type === 'MARKANM_SEND_MESSAGE') {
        if (data.content && onSendMessage) {
          onSendMessage(data.content);
          addToast('Activity update sent to chat!', 'info');
        }
      } else if (data.type === 'MARKANM_CLOSE') {
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, experience, sessionCode, user, onSendMessage, onClose, addToast]);

  if (!isOpen || !experience) return null;

  // Build embed URL with parameters
  let embedUrl = experience.embed_url;
  if (!embedUrl || embedUrl.startsWith('/')) {
    embedUrl = window.location.origin + (experience.embed_url || `/experiences/embed/${experience.slug}`);
  }
  const delimiter = embedUrl.includes('?') ? '&' : '?';
  const fullEmbedUrl = `${embedUrl}${delimiter}session_code=${sessionCode || ''}&user=${encodeURIComponent(user?.username || '')}&user_id=${user?.id || ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-4xl h-[100dvh] sm:h-[90vh] glass-panel sm:rounded-3xl border-0 sm:border border-white/15 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Container Header Bar */}
        <div className="p-3.5 bg-[#0E121B] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 p-0.5 shrink-0 flex items-center justify-center">
              {experience.icon_url ? (
                <img src={experience.icon_url} alt={experience.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{experience.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/20 text-[9px] font-extrabold uppercase shrink-0">
                  {experience.category || 'Mini App'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 truncate">by @{experience.developer_username || 'markanm'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
              <ShieldCheck className="w-3 h-3" />
              <span>Secure Sandboxed Environment</span>
            </span>

            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sandboxed Secure Iframe */}
        <div className="flex-1 w-full h-full bg-[#05070B] relative">
          <iframe
            ref={iframeRef}
            src={fullEmbedUrl}
            title={experience.name}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
}
