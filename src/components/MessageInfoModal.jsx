import React from 'react';
import { X, Info, Calendar, Clock, User, Hash, MessageSquare } from 'lucide-react';
import { Avatar } from './Avatar';
import { formatTime } from '../utils/textUtils';

export function MessageInfoModal({ isOpen, onClose, message, userTimezone }) {
  if (!isOpen || !message) return null;

  const rawDate = message.created_at ? new Date(message.created_at) : new Date();
  const fullDateStr = rawDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const exactTimeStr = formatTime(message.created_at, userTimezone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm glass-panel rounded-3xl border border-white/15 p-6 shadow-2xl relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-indigo-400">
            <Info className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Message Information</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sender Details */}
        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
          <Avatar
            src={message.sender?.avatar_url || message.sender_avatar}
            name={message.sender_name || message.sender?.display_name}
            size="md"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">
              {message.sender_name || message.sender?.display_name || 'Sender'}
            </span>
            <span className="text-[11px] text-indigo-400 font-mono">
              @{message.sender_username || message.sender?.username || 'user'}
            </span>
          </div>
        </div>

        {/* Info Rows */}
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
            <span className="text-gray-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Date Sent</span>
            </span>
            <span className="font-semibold text-white">{fullDateStr}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
            <span className="text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Exact Time</span>
            </span>
            <span className="font-mono font-bold text-emerald-300">{exactTimeStr}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
            <span className="text-gray-400 flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-400" />
              <span>Message ID</span>
            </span>
            <span className="font-mono text-purple-300">#{message.id}</span>
          </div>

          {/* Content snippet */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Content</span>
            </span>
            <p className="text-xs text-gray-200 leading-relaxed max-h-24 overflow-y-auto font-sans">
              {message.content || 'Attachment / Media'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
