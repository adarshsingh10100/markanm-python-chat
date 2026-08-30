import React, { useState } from 'react';
import { Reply, MoreVertical, Edit2, Trash2, Smile, CheckCheck } from 'lucide-react';
import { Avatar } from './Avatar';
import { useAuth } from '../context/AuthContext';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '🎉'];

export function MessageBubble({
  message,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { userTimezone } = useAuth();

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { timeZone: userTimezone || 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const isMine = message.is_mine;

  return (
    <div className={`flex items-end gap-2 group relative my-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sender Avatar for received messages */}
      {!isMine && (
        <Avatar src={message.sender_avatar} name={message.sender_name} size="sm" className="mb-1" />
      )}

      {/* Message Content Container */}
      <div className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender Name in Group Chat */}
        {!isMine && message.sender_name && (
          <span className="text-[11px] font-semibold text-gray-400 mb-1 ml-1">
            {message.sender_name}
          </span>
        )}

        {/* Reply Quote preview if this is a reply */}
        {message.reply_to && (
          <div className={`text-xs p-2 rounded-t-xl mb-0.5 border-l-2 bg-white/5 border-indigo-400 text-gray-300 max-w-full truncate ${isMine ? 'rounded-bl-xl' : 'rounded-br-xl'}`}>
            <span className="font-semibold text-indigo-300 block text-[10px]">{message.reply_to.sender_name}</span>
            <span className="truncate block">{message.reply_to.content}</span>
          </div>
        )}

        {/* Main Bubble */}
        <div
          className={`p-3.5 rounded-2xl relative shadow-md transition-all text-sm leading-relaxed ${
            isMine
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none'
              : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
          } ${message.is_deleted ? 'italic opacity-60' : ''}`}
        >
          {/* Text Content */}
          <p className="break-words whitespace-pre-wrap">{message.content}</p>

          {/* Message Meta Info */}
          <div className={`flex items-center gap-1.5 mt-1 text-[10px] ${isMine ? 'text-indigo-200 justify-end' : 'text-gray-400 justify-start'}`}>
            {message.is_edited && !message.is_deleted && (
              <span className="italic">edited</span>
            )}
            <span>{formatTime(message.created_at)}</span>
            {isMine && <CheckCheck className="w-3.5 h-3.5 text-indigo-300 inline" />}
          </div>

          {/* Reactions Badges */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-2 pt-1 border-t ${isMine ? 'border-indigo-500/30' : 'border-white/10'}`}>
              {Object.entries(
                message.reactions.reduce((acc, rx) => {
                  acc[rx.emoji] = (acc[rx.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className="px-2 py-0.5 rounded-full text-xs bg-black/20 hover:bg-black/40 border border-white/10 flex items-center gap-1 transition-all"
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-bold text-gray-300">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover Action Menu */}
      {!message.is_deleted && (
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-gray-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Reaction Button */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
              title="Add reaction"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Quick Emoji Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900 p-1.5 rounded-xl border border-white/15 shadow-xl z-30">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onToggleReaction(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 hover:bg-white/10 rounded text-base transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply Button */}
          <button
            onClick={() => onReply(message)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>

          {/* Edit/Delete for own messages */}
          {isMine && (
            <>
              <button
                onClick={() => onEdit(message)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
