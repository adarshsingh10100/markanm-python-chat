import React, { useState } from 'react';
import { Search, Plus, Users, MessageSquare, Check, CheckCheck } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { Avatar } from './Avatar';

export function ConversationList({ onOpenCreateGroup }) {
  const { conversations, activeConversationId, selectConversation, loadingConversations } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // all, direct, group, unread

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = (conv.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterTab === 'direct') return conv.type === 'direct';
    if (filterTab === 'group') return conv.type === 'group';
    if (filterTab === 'unread') return (conv.unread_count || 0) > 0;
    return true;
  });

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 h-full border-r border-white/10 flex flex-col bg-[#131822] shrink-0">
      {/* Search Header */}
      <div className="p-4 border-b border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-wide">Chats</h2>
          <button
            onClick={onOpenCreateGroup}
            className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Create New Group"
          >
            <Plus className="w-4 h-4" />
            <span>Group</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs font-medium pt-1">
          {['all', 'direct', 'group', 'unread'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all shrink-0 ${
                filterTab === tab
                  ? 'bg-indigo-600 text-white font-semibold shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {loadingConversations ? (
          <div className="p-4 flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-white/10 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                  <div className="h-2.5 bg-white/5 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
            <MessageSquare className="w-8 h-8 text-gray-600" />
            <p className="text-sm">No conversations found.</p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isActive = activeConversationId === conv.id;
            const isTyping = conv.counterpart?.is_typing;

            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left p-3.5 flex items-center gap-3 transition-all duration-150 relative ${
                  isActive
                    ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                    : 'hover:bg-white/5 border-l-4 border-transparent'
                }`}
              >
                <Avatar
                  src={conv.avatar_url}
                  name={conv.name}
                  size="md"
                  presence={conv.type === 'direct' ? conv.counterpart?.presence : null}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                      {conv.type === 'group' && <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      <span className="truncate">{conv.name}</span>
                    </h3>
                    <span className="text-[11px] text-gray-500 shrink-0">
                      {formatTimestamp(conv.last_message_at || conv.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {isTyping ? (
                      <span className="text-indigo-400 italic flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                        typing...
                      </span>
                    ) : (
                      <p className="text-gray-400 truncate pr-2">
                        {conv.last_message ? (
                          <>
                            {conv.last_message.sender_name && conv.type === 'group' && (
                              <span className="font-medium text-gray-300 mr-1">{conv.last_message.sender_name}:</span>
                            )}
                            {conv.last_message.content}
                          </>
                        ) : (
                          <span className="italic text-gray-500">No messages yet</span>
                        )}
                      </p>
                    )}

                    {conv.unread_count > 0 && (
                      <span className="min-w-[18px] h-4 text-[10px] font-bold bg-indigo-500 text-white rounded-full flex items-center justify-center px-1 shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
