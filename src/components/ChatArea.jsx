import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, X, Link as LinkIcon, Info, Users, MessageSquare, Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useConversationPolling } from '../hooks/useConversationPolling';
import { chatService } from '../services/chatService';
import { MessageBubble } from './MessageBubble';
import { Avatar } from './Avatar';

const EMOJI_LIST = ['😀', '😂', '😍', '🔥', '👍', '🎉', '❤️', '🙌', '😎', '✨', '🚀', '💯', '🤔', '😊', '🤝', '⚡'];

export function ChatArea({ onOpenInviteModal, onOpenGroupInfo }) {
  const {
    activeConversationId,
    activeConversation,
    messages,
    loadingMessages,
    replyToMessage,
    setReplyToMessage,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    fetchConversations,
    setMessages,
    updateCounterpartStatus
  } = useChat();

  const [inputContent, setInputContent] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // WhatsApp-style Live Link Preview state
  const [activeLinkPreview, setActiveLinkPreview] = useState(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [dismissedUrl, setDismissedUrl] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Activate smart polling for this open conversation
  useConversationPolling({
    activeConvId: activeConversationId,
    messages,
    setMessages,
    fetchConversations,
    updateCounterpartStatus
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle auto-growing input height & live URL detection
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputContent(text);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Auto-detect link in pasted or typed text
    const match = text.match(/(https?:\/\/[^\s]+)/i);
    if (match) {
      const url = match[0];
      if (url !== dismissedUrl && (!activeLinkPreview || activeLinkPreview.url !== url)) {
        setFetchingPreview(true);
        chatService.getLinkPreview(url)
          .then(res => {
            if (res.preview) setActiveLinkPreview(res.preview);
          })
          .catch(() => {})
          .finally(() => setFetchingPreview(false));
      }
    } else {
      if (!editingMessage) setActiveLinkPreview(null);
    }
  };

  const handleSend = () => {
    if (!inputContent.trim()) return;

    if (editingMessage) {
      editMessage(editingMessage.id, inputContent.trim());
      setEditingMessage(null);
    } else {
      const metadata = activeLinkPreview ? { link_preview: activeLinkPreview } : null;
      sendMessage(inputContent.trim(), replyToMessage?.id || null, 'text', metadata);
    }

    setInputContent('');
    setActiveLinkPreview(null);
    setDismissedUrl(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setInputContent(msg.content);
    textareaRef.current?.focus();
  };

  if (!activeConversationId) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-[#0B0E14] text-gray-400 select-none">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to MarkanM Chat</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          Select a conversation from the sidebar or start a new connection to begin messaging.
        </p>
      </div>
    );
  }

  const isGroup = activeConversation?.type === 'group';

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0B0E14] relative overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 glass-panel border-b border-white/10 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={activeConversation?.avatar_url}
            name={activeConversation?.name}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white truncate">{activeConversation?.name}</h3>
            <p className="text-xs text-gray-400 truncate">
              {isGroup
                ? `${activeConversation?.members_count || 0} members`
                : activeConversation?.counterpart_status || 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGroup && (
            <button
              onClick={onOpenGroupInfo}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Group Details"
            >
              <Info className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-4">
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs font-semibold">
            Loading chat messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs text-center">
            <MessageSquare className="w-8 h-8 text-gray-600 mb-2 opacity-50" />
            <p>No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onReply={(m) => setReplyToMessage(m)}
              onEdit={handleStartEdit}
              onDelete={deleteMessage}
              onToggleReaction={toggleReaction}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Quote Banner */}
      {(replyToMessage || editingMessage) && (
        <div className="px-4 py-2 bg-[#131822] border-t border-white/10 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-indigo-400 shrink-0">
              {editingMessage ? 'Editing Message:' : `Replying to @${replyToMessage.sender_name}:`}
            </span>
            <span className="truncate text-gray-300">
              {editingMessage ? editingMessage.content : replyToMessage.content}
            </span>
          </div>
          <button
            onClick={() => {
              setReplyToMessage(null);
              setEditingMessage(null);
              setInputContent('');
            }}
            className="p-1 text-gray-400 hover:text-white rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp-Style Floating Live Link Preview Bar */}
      {(activeLinkPreview || fetchingPreview) && (
        <div className="px-4 pt-2">
          <div className="bg-[#131822] border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xl relative">
            {fetchingPreview ? (
              <div className="flex items-center gap-2 text-xs text-indigo-300 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                <span>Fetching link preview...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {activeLinkPreview.image ? (
                    <img
                      src={activeLinkPreview.image}
                      alt="Link Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                      {activeLinkPreview.favicon && (
                        <img src={activeLinkPreview.favicon} alt="" className="w-3 h-3 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                      )}
                      <span className="truncate">{activeLinkPreview.site_name || activeLinkPreview.url}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{activeLinkPreview.title}</h4>
                    {activeLinkPreview.description && (
                      <p className="text-[11px] text-gray-300 truncate mt-0.5">{activeLinkPreview.description}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDismissedUrl(activeLinkPreview.url);
                    setActiveLinkPreview(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0"
                  title="Remove link preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Input Composer Footer */}
      <div className="p-4 border-t border-white/10 glass-panel relative z-10">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-indigo-500/50 transition-all">
          {/* Emoji Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full mb-3 left-0 bg-[#161D2B] border border-white/15 rounded-2xl p-3 shadow-2xl z-30 grid grid-cols-4 gap-2 w-48">
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputContent(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 text-xl hover:bg-white/10 rounded-xl transition-transform hover:scale-125 text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputContent}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message or paste link... (Shift+Enter for newline)"
            className="flex-1 bg-transparent border-none text-sm text-white placeholder-gray-500 focus:outline-none resize-none max-h-32 py-2 px-1"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputContent.trim()}
            className={`p-2.5 rounded-xl text-white font-semibold transition-all flex items-center justify-center shrink-0 ${
              inputContent.trim()
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30 hover:opacity-90 cursor-pointer'
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
