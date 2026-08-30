import React, { useState } from 'react';
import { X, Send, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';

export function ImageSendConfirmModal({ isOpen, onClose, file, imagePreviewUrl, onConfirmSend }) {
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen || (!file && !imagePreviewUrl)) return null;

  const handleSend = async () => {
    setSending(true);
    try {
      await onConfirmSend(file, imagePreviewUrl, caption);
      onClose();
    } catch (e) {
    } finally {
      setSending(false);
    }
  };

  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Send Image Preview</h3>
              <p className="text-[11px] text-gray-400 font-mono">
                {file ? `${file.name} • ${fileSizeMB} MB` : 'Pasted Image'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="w-full bg-black/60 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center min-h-[220px] max-h-[350px]">
          <img
            src={imagePreviewUrl}
            alt="Staged Preview"
            className="max-w-full max-h-[340px] object-contain"
          />
        </div>

        {/* Caption Input */}
        <input
          type="text"
          placeholder="Add a caption... (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/50"
        />

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-red-500/30"
          >
            <Trash2 className="w-4 h-4" />
            <span>Discard</span>
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Uploading...' : 'Send Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
