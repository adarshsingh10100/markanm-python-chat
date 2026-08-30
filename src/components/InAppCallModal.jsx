import React from 'react';
import { X, Video, ExternalLink, ShieldCheck, PhoneOff } from 'lucide-react';

export function InAppCallModal({ isOpen, onClose, meetUrl, onEndCall }) {
  if (!isOpen || !meetUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-4xl h-[85vh] glass-panel rounded-3xl border border-emerald-500/30 p-4 sm:p-6 shadow-2xl relative flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-pulse">
              <Video className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Google Meet Live Call</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  LIVE ROOM
                </span>
              </h3>
              <span className="text-xs text-gray-400 truncate max-w-xs font-mono">{meetUrl}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <span>Open in App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {onEndCall && (
              <button
                onClick={() => {
                  onEndCall();
                  onClose();
                }}
                className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-red-500/30"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End Call</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Call Iframe / Container */}
        <div className="flex-1 w-full bg-black/60 rounded-2xl border border-white/10 overflow-hidden relative flex flex-col items-center justify-center">
          <iframe
            src={meetUrl}
            title="Google Meet Video Call"
            allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media"
            className="w-full h-full border-0"
          />

          {/* Overlay Notice for direct browser join */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-md rounded-2xl border border-white/15 text-center flex items-center gap-3 text-xs text-gray-300 shadow-xl pointer-events-auto z-10">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Camera & Microphone enabled. If video freezes, click <strong>Open in App</strong>.</span>
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] shrink-0"
            >
              Join Google Meet
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
