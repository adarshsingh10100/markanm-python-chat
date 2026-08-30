import React, { useState } from 'react';
import { Reply, MoreVertical, Edit2, Trash2, Smile, CheckCheck, ExternalLink, Play } from 'lucide-react';
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

  // Parse metadata for rich link previews
  let metadata = message.metadata;
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch (e) { metadata = null; }
  }
  const linkPreview = metadata?.link_preview;

  // Extract YouTube ID if present in content or link preview
  const youtubeMatch = message.content ? message.content.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i) : null;
  const youtubeId = linkPreview?.youtube_id || (youtubeMatch ? youtubeMatch[1] : null);

  return (
    <div className={`flex items-end gap-2 group relative my-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sender Avatar for received messages */}
      {!isMine && (
        <Avatar src={message.sender_avatar} name={message.sender_name} size="sm" className="mb-1" />
      )}

      {/* Message Content Container */}
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
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

          {/* YouTube Video Embedded Iframe */}
          {youtubeId && !message.is_deleted && (
            <div className="mt-2.5 rounded-2xl overflow-hidden border border-white/20 bg-black/80 aspect-video shadow-xl w-full min-w-[240px] max-w-md">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={linkPreview?.title || "YouTube Video Player"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* WhatsApp-Style Web Link Preview Card (Non-YouTube) */}
          {linkPreview && !youtubeId && !message.is_deleted && (
            <a
              href={linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 block rounded-2xl overflow-hidden bg-black/40 border border-white/15 hover:border-indigo-400/50 transition-all shadow-lg text-left group/card"
            >
              {linkPreview.image && (
                <div className="aspect-video w-full overflow-hidden bg-black/60 relative">
                  <img
                    src={linkPreview.image}
                    alt={linkPreview.title || 'Link Preview'}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="p-3 space-y-1">
                <div className="flex items-center gap-2">
                  {linkPreview.favicon && (
                    <img
                      src={linkPreview.favicon}
                      alt=""
                      className="w-3.5 h-3.5 object-contain shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span className="text-[10px] font-mono font-semibold text-gray-400 truncate">
                    {linkPreview.site_name || linkPreview.url}
                  </span>
                </div>
                {linkPreview.title && (
                  <h4 className="font-bold text-xs text-white line-clamp-1 group-hover/card:text-indigo-300 transition-colors">
                    {linkPreview.title}
                  </h4>
                )}
                {linkPreview.description && (
                  <p className="text-[11px] text-gray-300 line-clamp-2 leading-snug">
                    {linkPreview.description}
                  </p>
                )}
              </div>
            </a>
          )}

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
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
              title="Add Reaction"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className={`absolute bottom-full mb-2 ${isMine ? 'right-0' : 'left-0'} bg-[#161D2B] border border-white/15 rounded-2xl p-2 shadow-2xl z-30 flex gap-1`}>
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onToggleReaction(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-base transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onReply(message)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>

          {isMine && (
            <>
              <button
                onClick={() => onEdit(message)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                title="Edit Message"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
                title="Delete Message"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
