import React, { useState } from 'react';
import { X, Video, ExternalLink, Send, PhoneCall } from 'lucide-react';

export function GoogleMeetModal({ isOpen, onClose, onStartCall }) {
  const [meetUrl, setMeetUrl] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOpenMeetNew = () => {
    window.open('https://meet.new', '_blank');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let url = meetUrl.trim();
    if (!url) {
      setError('Please enter or generate a Google Meet link.');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (!url.includes('meet.google.com') && !url.includes('meet.new')) {
      setError('Please enter a valid Google Meet URL (e.g., https://meet.google.com/abc-defg-hij).');
      return;
    }

    setError('');
    onStartCall(url);
    setMeetUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-indigo-400">
            <Video className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Start Google Meet Call</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-300 leading-relaxed">
            Create a Google Meet link or paste an existing link below to invite members to a video call!
          </p>

          {/* Step 1: Generate Link via meet.new */}
          <button
            type="button"
            onClick={handleOpenMeetNew}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Generate New Google Meet Link (meet.new)</span>
          </button>

          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Or paste link</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Step 2: Paste Link Input Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <input
                type="text"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={meetUrl}
                onChange={(e) => {
                  setMeetUrl(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              {error && <span className="text-[11px] text-red-400 font-medium px-1">{error}</span>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Send Meeting Invitation to Chat</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
