import React, { useState } from 'react';
import { X, Link as LinkIcon, Copy, Check, ShieldAlert } from 'lucide-react';
import { inviteService } from '../services/inviteService';
import { useToast } from '../context/ToastContext';

export function InviteModal({ isOpen, onClose, conversation }) {
  const { addToast } = useToast();

  const [inviteUrl, setInviteUrl] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !conversation) return null;

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const uses = maxUses ? parseInt(maxUses, 10) : null;
      const days = expiresInDays ? parseInt(expiresInDays, 10) : null;

      const res = await inviteService.createInvite(conversation.id, uses, days);
      if (res.invite?.invite_url) {
        setInviteUrl(res.invite.invite_url);
        addToast('Group invite link created!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to generate invite link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    addToast('Invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Shareable Invite Link</h3>
              <p className="text-xs text-gray-400">{conversation.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {/* Controls to configure link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Expiration</label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="1" className="bg-[#161D2B]">1 Day</option>
                <option value="7" className="bg-[#161D2B]">7 Days</option>
                <option value="30" className="bg-[#161D2B]">30 Days</option>
                <option value="0" className="bg-[#161D2B]">Never</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Max Uses (Optional)</label>
              <input
                type="number"
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateLink}
            disabled={loading}
            className="w-full btn-gradient py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            {loading ? 'Generating...' : 'Generate New Link'}
          </button>

          {/* Generated Link Result */}
          {inviteUrl && (
            <div className="mt-2 p-3 bg-white/5 border border-indigo-500/30 rounded-2xl flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-indigo-300">Invite URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shrink-0 flex items-center gap-1 text-xs font-semibold"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400">
                Anyone with this link can view group details and request to join.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
