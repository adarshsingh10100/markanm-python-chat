import React, { useState } from 'react';
import { Bot, CheckCircle2, Shield, X, Lock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function BotInstallModal({ isOpen, onClose, bot, onApprove }) {
  const { addToast } = useToast();
  const [installing, setInstalling] = useState(false);

  if (!isOpen || !bot) return null;

  const handleConfirm = async () => {
    setInstalling(true);
    try {
      if (onApprove) await onApprove(bot);
      addToast(`Bot @${bot.bot_username || 'bot'} installed to room!`, 'success');
      onClose();
    } catch (e) {
      addToast('Failed to install bot', 'error');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/15 p-6 shadow-2xl relative my-8 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 p-0.5 shrink-0 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Bot to Room</h3>
              <p className="text-xs text-purple-400 font-semibold">@{bot.bot_username || 'bot'}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2 text-xs">
          <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Requested Bot Permissions
          </span>
          <div className="flex flex-col gap-2 mt-1">
            <span className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Receive messages containing bot commands
            </span>
            <span className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Send messages and replies
            </span>
            <span className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> View usernames of room participants
            </span>
            <span className="flex items-center gap-2 text-gray-500 font-medium line-through">
              <Lock className="w-4 h-4 shrink-0" /> Read private conversations or old messages
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={installing}
            className="flex-1 btn-gradient py-3 rounded-2xl text-xs font-bold shadow-xl"
          >
            {installing ? 'Adding...' : 'Approve & Add Bot'}
          </button>
        </div>
      </div>
    </div>
  );
}
