import React, { useState } from 'react';
import { X, Calendar, ArrowUp, ArrowDown, Clock } from 'lucide-react';

export function JumpToDateModal({ isOpen, onClose, onJumpToTop, onJumpToDate, onJumpToBottom }) {
  const [selectedDate, setSelectedDate] = useState('');

  if (!isOpen) return null;

  const handleDateSubmit = (e) => {
    e.preventDefault();
    if (selectedDate) {
      onJumpToDate(selectedDate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm glass-panel rounded-3xl border border-white/15 p-6 shadow-2xl relative flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-indigo-400">
            <Calendar className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Navigate Chat Timeline</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Option 1: Jump to Top */}
          <button
            onClick={() => {
              onJumpToTop();
              onClose();
            }}
            className="w-full p-3 bg-white/5 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-white/10 rounded-2xl flex items-center gap-3 text-xs font-bold text-white transition-all text-left"
          >
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
              <ArrowUp className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span>Jump to Top of Chat</span>
              <span className="text-[10px] text-gray-400 font-normal">View earliest message ever sent</span>
            </div>
          </button>

          {/* Option 2: Jump to Date */}
          <form onSubmit={handleDateSubmit} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2.5">
            <label className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Jump to Specific Date</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white color-scheme-dark focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!selectedDate}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Go to Nearest Date Messages
            </button>
          </form>

          {/* Option 3: Jump to Bottom */}
          <button
            onClick={() => {
              onJumpToBottom();
              onClose();
            }}
            className="w-full p-3 bg-white/5 hover:bg-emerald-600/20 hover:border-emerald-500/50 border border-white/10 rounded-2xl flex items-center gap-3 text-xs font-bold text-white transition-all text-left"
          >
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span>Jump to Latest Messages</span>
              <span className="text-[10px] text-gray-400 font-normal">Return to bottom of chat</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
