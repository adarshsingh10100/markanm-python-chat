import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, FileText, Link as LinkIcon, Users, ExternalLink } from 'lucide-react';
import { request } from '../services/api';

export function MediaPanel({ conversation, isOpen, onClose, onOpenProfile }) {
  const [activeTab, setActiveTab] = useState('media');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && conversation?.id) {
      setLoading(true);
      request(`/conversations/${conversation.id}/media`, { method: 'GET' })
        .then(res => setItems(res.media || []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, conversation?.id]);

  if (!isOpen || !conversation) return null;

  const mediaItems = items.filter(i => ['image', 'video', 'gif'].includes(i.type));
  const fileItems = items.filter(i => i.type === 'file');

  return (
    <aside className="w-80 h-full glass-panel border-l border-white/10 flex flex-col shrink-0 select-none z-10 bg-[#0E121B]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Conversation Details</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'media' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Media ({mediaItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'files' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Files ({fileItems.length})</span>
        </button>

        {conversation.type === 'group' && (
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'members' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="text-center text-xs text-gray-400 my-8">Loading shared items...</div>
        ) : activeTab === 'media' ? (
          mediaItems.length === 0 ? (
            <div className="text-center text-xs text-gray-500 my-8">No shared photos or GIFs yet</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {mediaItems.map(m => (
                <a
                  key={m.id}
                  href={m.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl overflow-hidden aspect-square border border-white/10 hover:border-indigo-500 transition-all hover:scale-105 block"
                >
                  <img src={m.media_url} alt="Media" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )
        ) : activeTab === 'files' ? (
          fileItems.length === 0 ? (
            <div className="text-center text-xs text-gray-500 my-8">No shared files yet</div>
          ) : (
            <div className="flex flex-col gap-2">
              {fileItems.map(f => (
                <a
                  key={f.id}
                  href={f.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-white truncate font-medium">{f.content || 'Attached File'}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </a>
              ))}
            </div>
          )
        ) : (
          /* Members Tab */
          <div className="flex flex-col gap-2">
            {conversation.members?.map(m => (
              <button
                key={m.user_id}
                onClick={() => onOpenProfile(m)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-white truncate">{m.display_name}</span>
                  <span className="text-[10px] text-gray-400">@{m.username}</span>
                </div>
                {m.role && (
                  <span className="text-[10px] font-bold uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {m.role}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
