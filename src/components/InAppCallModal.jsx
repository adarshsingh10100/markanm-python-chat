import React, { useState } from 'react';
import { X, Video, ExternalLink, ShieldCheck, PhoneOff, Copy, Check, Sparkles, Monitor } from 'lucide-react';

export function InAppCallModal({ isOpen, onClose, meetUrl, onEndCall }) {
  const [copied, setCopied] = useState(false);
  const [callMode, setCallMode] = useState('google'); // 'google' | 'jitsi'

  if (!isOpen || !meetUrl) return null;

  // Extract or build room name for embedded Jitsi call fallback
  const isGoogleMeet = meetUrl.includes('meet.google.com');
  const roomName = 'MarkanM_Call_' + (meetUrl.split('/').pop() || 'Room').replace(/[^a-zA-Z0-9]/g, '');
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinGoogleMeet = () => {
    window.open(meetUrl, '_blank', 'width=1050,height=750,scrollbars=yes,resizable=yes');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[85vh] glass-panel rounded-3xl border border-emerald-500/30 p-4 sm:p-6 shadow-2xl relative flex flex-col gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-pulse">
              <Video className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{callMode === 'google' ? 'Google Meet Call Room' : 'In-App Live Video Call'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  LIVE
                </span>
              </h3>
              <span className="text-xs text-gray-400 truncate max-w-xs sm:max-w-md font-mono">
                {callMode === 'google' ? meetUrl : jitsiUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="hidden sm:flex items-center p-1 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCallMode('google')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  callMode === 'google' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Google Meet
              </button>
              <button
                type="button"
                onClick={() => setCallMode('jitsi')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  callMode === 'jitsi' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                In-App Video
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Copy Call Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

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

        {/* Content Area */}
        {callMode === 'google' ? (
          /* Google Meet Hub View */
          <div className="flex-1 w-full bg-[#0D121D] rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-center text-center gap-6 relative overflow-y-auto">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 p-0.5 shadow-2xl shadow-emerald-500/20 animate-pulse">
              <div className="w-full h-full bg-[#0D121D] rounded-[22px] flex items-center justify-center text-emerald-400">
                <Video className="w-10 h-10" />
              </div>
            </div>

            <div className="max-w-md space-y-2">
              <h2 className="text-xl font-black text-white">Google Meet Room Ready</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Google Meet requires launching in a dedicated browser window for camera & microphone permissions. Click below to launch your call.
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={handleJoinGoogleMeet}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Launch Google Meet Window</span>
              </button>

              <button
                type="button"
                onClick={() => setCallMode('jitsi')}
                className="w-full py-3.5 px-6 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                <Monitor className="w-4 h-4" />
                <span>Use In-App Video Call</span>
              </button>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-gray-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>HD Video & Audio • End-to-End Encrypted by Google</span>
            </div>
          </div>
        ) : (
          /* Jitsi Embedded In-App Call View */
          <div className="flex-1 w-full bg-black rounded-2xl border border-white/10 overflow-hidden relative">
            <iframe
              src={jitsiUrl}
              title="In-App Video Call"
              allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media; fullscreen"
              className="w-full h-full border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
