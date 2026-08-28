import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { request } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';

export function SavedMessagesPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [savedMessages, setSavedMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const res = await request('/saved-messages', { method: 'GET' });
      setSavedMessages(res.messages || []);
    } catch (err) {
      addToast(err.message || 'Failed to load saved messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleUnsave = async (messageId) => {
    try {
      await request(`/messages/${messageId}/save`, { method: 'POST' });
      setSavedMessages(prev => prev.filter(m => m.message_id !== messageId));
      addToast('Message removed from bookmarks', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to unsave message', 'error');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-[#0B0E14] text-white">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Bookmark className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">Saved Messages</h1>
            <p className="text-xs text-gray-400">Your private collection of bookmarked messages</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading saved messages...</div>
        ) : savedMessages.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 glass-panel rounded-3xl border border-white/10">
            No saved messages yet. Hover over any message in a chat and click "Save".
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {savedMessages.map(item => (
              <div key={item.saved_id} className="p-4 glass-card rounded-2xl border border-white/10 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar src={item.sender?.avatar_url} name={item.sender?.display_name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">
                      {item.sender?.display_name} <span className="text-[10px] text-gray-400 font-normal">@{item.sender?.username} • {new Date(item.sent_at).toLocaleDateString()}</span>
                    </p>
                    <p className="text-xs text-gray-200 mt-1 leading-relaxed">{item.content}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleUnsave(item.message_id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
