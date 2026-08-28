import React, { useState } from 'react';
import { X, Mail, ShieldCheck, Send, Sparkles, AlertCircle } from 'lucide-react';
import { userService } from '../services/userService';
import { useToast } from '../context/ToastContext';

export function EmailInviteModal({ isOpen, onClose }) {
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      addToast('Please enter a valid recipient email address.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await userService.inviteByEmail(email.trim());
      addToast(res.message || 'Stylish email invitation sent successfully!', 'success');
      setEmail('');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to send invitation', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-indigo-500/30 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Invite by Email</h3>
              <p className="text-[11px] text-gray-400">Send a stylish & private platform invitation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Recipient Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Privacy & Anti-Spam Guarantee Box */}
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/25 rounded-2xl flex flex-col gap-1.5 text-xs text-indigo-200">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Strict Anti-Spam Quotas & Privacy</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              • Maximum <strong className="text-white">2 lifetime email invites</strong> per recipient address.<br />
              • Rate-limited to <strong className="text-white">1 invitation per 24 hours</strong> to prevent spam.<br />
              • Your identity will be clearly shown as the inviter.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
