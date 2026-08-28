import React, { useState } from 'react';
import { X, ShieldAlert, Send } from 'lucide-react';
import { discoverService } from '../services/discoverService';
import { useToast } from '../context/ToastContext';

export function ReportModal({ isOpen, onClose, targetType, targetId, targetName }) {
  const { addToast } = useToast();

  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await discoverService.createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim()
      });

      addToast('Report submitted successfully to moderation.', 'success');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-red-500/30 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Report Content</h3>
              <p className="text-[11px] text-gray-400">Reporting {targetType}: {targetName || `#${targetId}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Reason for Report</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500/50"
            >
              <option value="spam" className="bg-[#131822] text-white">Spam / Unsolicited Promotion</option>
              <option value="harassment" className="bg-[#131822] text-white">Harassment or Bullying</option>
              <option value="hate" className="bg-[#131822] text-white">Hate Speech or Discrimination</option>
              <option value="sexual_content" className="bg-[#131822] text-white">Explicit / Sexual Content</option>
              <option value="violence" className="bg-[#131822] text-white">Violence or Dangerous Content</option>
              <option value="scam" className="bg-[#131822] text-white">Scam or Fraud</option>
              <option value="illegal" className="bg-[#131822] text-white">Illegal Activity</option>
              <option value="other" className="bg-[#131822] text-white">Other Reason</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Additional Details (Optional)</label>
            <textarea
              rows={3}
              placeholder="Provide context for our moderators..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500/50 resize-none"
            />
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
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
