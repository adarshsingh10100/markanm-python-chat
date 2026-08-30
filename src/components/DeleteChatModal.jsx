import React, { useState } from 'react';
import { X, Trash2, Users, User, Loader2, AlertTriangle } from 'lucide-react';
import { chatService } from '../services/chatService';
import { useToast } from '../context/ToastContext';

export function DeleteChatModal({ isOpen, onClose, conversationId, onDeleted }) {
  const { addToast } = useToast();
  const [deletingForMe, setDeletingForMe] = useState(false);
  const [deletingForEveryone, setDeletingForEveryone] = useState(false);

  if (!isOpen || !conversationId) return null;

  const handleClearForMe = async () => {
    setDeletingForMe(true);
    try {
      const res = await chatService.clearForUser(conversationId);
      if (res?.success) {
        addToast('Chat history deleted for you.', 'success');
        onDeleted && onDeleted('for_me');
        onClose();
      } else {
        addToast(res?.error || 'Failed to clear chat.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error clearing chat.', 'error');
    } finally {
      setDeletingForMe(false);
    }
  };

  const handleDeleteForEveryone = async () => {
    setDeletingForEveryone(true);
    try {
      const res = await chatService.deleteForEveryone(conversationId);
      if (res?.success) {
        addToast('Chat deleted for everyone.', 'success');
        onDeleted && onDeleted('for_everyone');
        onClose();
      } else {
        addToast(res?.error || 'Failed to delete chat.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error deleting chat.', 'error');
    } finally {
      setDeletingForEveryone(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0E131F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Delete Chat</h2>
              <p className="text-xs text-gray-400">Choose how you want to delete this chat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <button
            onClick={handleClearForMe}
            disabled={deletingForMe || deletingForEveryone}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 text-left transition-all group flex items-start gap-3.5"
          >
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white flex items-center justify-between">
                Delete for Me
                {deletingForMe && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Clears chat history from your view. The other person can still see their messages.
              </p>
            </div>
          </button>

          <button
            onClick={handleDeleteForEveryone}
            disabled={deletingForMe || deletingForEveryone}
            className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-left transition-all group flex items-start gap-3.5"
          >
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-rose-300 flex items-center justify-between">
                Delete for Everyone
                {deletingForEveryone && <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />}
              </div>
              <p className="text-xs text-rose-300/70 mt-0.5">
                Permanently deletes messages for all members in this conversation.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
