import React, { useState, useEffect } from 'react';
import { WifiOff, SignalLow, Wifi, RefreshCw, X, Clock, BellOff, Check } from 'lucide-react';

const SNOOZE_OPTIONS = [
  { label: '5 Minutes', durationMs: 5 * 60 * 1000 },
  { label: '15 Minutes', durationMs: 15 * 60 * 1000 },
  { label: '1 Hour', durationMs: 60 * 60 * 1000 },
  { label: '24 Hours', durationMs: 24 * 60 * 60 * 1000 }
];

export function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isWeakConnection, setIsWeakConnection] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(() => {
    return localStorage.getItem('net_snoozed_until') || 0;
  });

  useEffect(() => {
    // 1. Browser Online/Offline Handlers
    const handleOnline = () => {
      setIsOffline(false);
      setIsWeakConnection(false);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3500);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsWeakConnection(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Network Information API (Detect 2G / Slow 2G / High RTT)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const checkConnectionQuality = () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }
      if (conn) {
        const isSlow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || (conn.rtt && conn.rtt > 1800);
        setIsWeakConnection(Boolean(isSlow));
      }
    };

    checkConnectionQuality();
    if (conn) {
      conn.addEventListener('change', checkConnectionQuality);
    }

    // 3. Custom Event Listener from API service when fetch fails due to network drop
    const handleCustomNetworkEvent = (e) => {
      if (e.detail) {
        if (e.detail.isOffline) {
          setIsOffline(true);
          setIsWeakConnection(false);
        } else if (e.detail.isWeak) {
          setIsWeakConnection(true);
          setTimeout(() => setIsWeakConnection(false), 6000);
        }
      }
    };

    window.addEventListener('network-status-change', handleCustomNetworkEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', checkConnectionQuality);
      }
      window.removeEventListener('network-status-change', handleCustomNetworkEvent);
    };
  }, []);

  const handleSnooze = (durationMs) => {
    const until = Date.now() + durationMs;
    localStorage.setItem('net_snoozed_until', String(until));
    setSnoozedUntil(until);
    setShowSnoozeMenu(false);
  };

  // Check if warning banner is currently snoozed
  const isSnoozed = Date.now() < Number(snoozedUntil);

  // If snoozed and not completely offline, hide banner
  if (isSnoozed && !isOffline) {
    return null;
  }

  if (!isOffline && !isWeakConnection && !showRestored) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-lg pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className="pointer-events-auto shadow-2xl rounded-2xl border border-white/15 bg-[#131822]/95 backdrop-blur-xl p-3 flex items-center justify-between gap-3 text-xs font-semibold relative">
        {/* Offline Banner */}
        {isOffline ? (
          <div className="flex items-center gap-3 text-rose-300 w-full">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400 animate-pulse">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-xs">You are currently offline</p>
              <p className="text-[11px] text-rose-300/80 truncate">Please check your Wi-Fi or mobile network.</p>
            </div>
            <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase shrink-0">
              Offline
            </span>
          </div>
        ) : isWeakConnection ? (
          /* Weak Connection Banner */
          <div className="flex items-center gap-3 text-amber-300 w-full">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <SignalLow className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-xs">Weak Internet Connection</p>
              <p className="text-[11px] text-amber-300/80 truncate">Network speed is slow. Retrying in background...</p>
            </div>
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />

            {/* Snooze / Mute Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                className="p-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold"
                title="Mute warning for a selected time"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mute</span>
              </button>

              {/* Snooze Popover Dropdown */}
              {showSnoozeMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1B2232] border border-white/20 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 flex items-center gap-1.5 mb-0.5">
                    <BellOff className="w-3 h-3 text-amber-400" />
                    <span>Mute Warning For:</span>
                  </div>
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSnooze(opt.durationMs)}
                      className="w-full px-2.5 py-1.5 hover:bg-white/10 rounded-xl text-left text-white flex items-center justify-between transition-colors font-medium text-xs"
                    >
                      <span>⏱️ {opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Connection Restored Banner */
          <div className="flex items-center gap-3 text-emerald-300 w-full">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-xs">Connection Restored</p>
              <p className="text-[11px] text-emerald-300/80 truncate">Back online and synchronized.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
