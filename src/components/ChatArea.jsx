import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, X, Link as LinkIcon, Info, Users, MessageSquare } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useConversationPolling } from '../hooks/useConversationPolling';
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
    setMessages
  } = useChat();

  const [inputContent, setInputContent] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Activate smart polling for this open conversation
  useConversationPolling({
    activeConvId: activeConversationId,
    messages,
    setMessages,
    fetchConversations
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle auto-growing input height
  const handleInputChange = (e) => {
    setInputContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = () => {
    if (!inputContent.trim()) return;

    if (editingMessage) {
      editMessage(editingMessage.id, inputContent.trim());
      setEditingMessage(null);
    } else {
      sendMessage(inputContent.trim(), replyToMessage?.id || null);
    }

    setInputContent('');
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
            presence={!isGroup ? activeConversation?.counterpart?.presence : null}
          />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate flex items-center gap-2">
              <span className="truncate">{activeConversation?.name}</span>
            </h2>
            <p className="text-xs text-gray-400 truncate">
              {isGroup ? (
                `${activeConversation?.members?.length || 0} members`
              ) : (
                activeConversation?.counterpart?.presence === 'online' ? (
                  <span className="text-emerald-400 font-medium">Online</span>
                ) : (
                  'Offline'
                )
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isGroup && (
            <button
              onClick={() => onOpenInviteModal(activeConversation)}
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Share Group Invite Link"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Invite Link</span>
            </button>
          )}

          <button
            onClick={() => onOpenGroupInfo(activeConversation)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Conversation Details"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Message List Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-between">
        {loadingMessages ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-500 gap-2">
            <MessageSquare className="w-10 h-10 text-gray-600" />
            <p className="text-sm font-medium">No messages in this conversation yet.</p>
            <p className="text-xs text-gray-600">Send a greeting to start the conversation!</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onReply={(m) => setReplyToMessage(m)}
                onEdit={handleStartEdit}
                onDelete={deleteMessage}
                onToggleReaction={toggleReaction}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing Indicator Bar */}
      {activeConversation?.counterpart?.is_typing && (
        <div className="px-6 py-1 text-xs text-indigo-400 italic flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 bg-indigo-400 rounded-full" />
          <span>{activeConversation?.counterpart?.display_name} is typing...</span>
        </div>
      )}

      {/* Input Area Header (Reply / Edit Context) */}
      {(replyToMessage || editingMessage) && (
        <div className="px-6 py-2 bg-indigo-950/60 border-t border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2 truncate">
            {editingMessage ? (
              <span className="font-semibold text-indigo-400">Editing Message:</span>
            ) : (
              <span className="font-semibold text-indigo-400">Replying to {replyToMessage.sender_name}:</span>
            )}
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
            placeholder="Write a message... (Shift+Enter for newline)"
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
