import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Plus, Paperclip, Smile, Image as ImageIcon,
  BarChart2, Flame, Bookmark, ShieldAlert, MoreVertical, Search,
  ChevronRight, Reply, Trash2, Edit2, PanelRight, ArrowLeft, Palette,
  Gamepad2, Sparkles, Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import { chatService } from '../services/chatService';
import { request } from '../services/api';
import { Avatar } from '../components/Avatar';
import { MediaPanel } from '../components/MediaPanel';
import { ProfilePreviewModal } from '../components/ProfilePreviewModal';
import { GifPickerModal } from '../components/GifPickerModal';
import { StickerPickerModal } from '../components/StickerPickerModal';
import { CreatePollModal } from '../components/CreatePollModal';
import { PollWidget } from '../components/PollWidget';
import { ThemeSelectorModal, CHAT_THEMES } from '../components/ThemeSelectorModal';
import { ExperienceLauncherModal } from '../components/ExperienceLauncherModal';
import { ExperienceSandboxModal } from '../components/ExperienceSandboxModal';
import { formatMessagePreview } from '../utils/textUtils';
import { encodeId, decodeId } from '../utils/hashUtils';

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, activeConversation, selectConversation, fetchConversations } = useChat();
  const { addToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // Attachment & Theme state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isGifOpen, setIsGifOpen] = useState(false);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isExperienceLauncherOpen, setIsExperienceLauncherOpen] = useState(false);

  // Sandbox state
  const [activeSandboxExp, setActiveSandboxExp] = useState(null);
  const [activeSandboxSessionCode, setActiveSandboxSessionCode] = useState(null);

  const [themeId, setThemeId] = useState(localStorage.getItem('markanm_chat_theme') || 'indigo');

  // Side panels & Modals
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isUserNearBottomRef = useRef(true);

  // Resolve target conversation ID transparently from @username, encrypted hash slug, or numeric ID
  let targetConvId = activeConversation?.id;
  if (conversationId) {
    if (conversationId.startsWith('@')) {
      const targetUsername = conversationId.substring(1).toLowerCase();
      const match = conversations.find(c => c.counterpart?.username?.toLowerCase() === targetUsername);
      if (match) {
        targetConvId = match.id;
      } else {
        targetConvId = decodeId(conversationId);
      }
    } else {
      targetConvId = decodeId(conversationId);
    }
  }

  const activeTheme = CHAT_THEMES.find(t => t.id === themeId) || CHAT_THEMES[0];

  const handleSelectTheme = (tid) => {
    setThemeId(tid);
    localStorage.setItem('markanm_chat_theme', tid);
  };

  useEffect(() => {
    if (targetConvId) {
      selectConversation(targetConvId);
      loadMessages(targetConvId);
    }
  }, [targetConvId]);

  const loadMessages = async (cid) => {
    try {
      const res = await chatService.getMessages(cid);
      setMessages(res.messages || []);
    } catch (e) {}
  };

  // Track scroll position to prevent interrupting user scrolling
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserNearBottomRef.current = distanceToBottom < 150;
  };

  // Ultra-Fast Live Reload Polling Strategy
  useEffect(() => {
    if (targetConvId) {
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadMessages(targetConvId);
        }
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [targetConvId]);

  useEffect(() => {
    const convInterval = setInterval(() => {
      if (!document.hidden) {
        fetchConversations(false);
      }
    }, 2500);
    return () => clearInterval(convInterval);
  }, []);

  // Only auto-scroll to bottom if user is near bottom
  useEffect(() => {
    if (isUserNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e, type = 'text', customContent = null) => {
    if (e) e.preventDefault();
    const content = customContent || newMessage;
    if (!content.trim() || !targetConvId) return;

    setSending(true);
    try {
      await chatService.sendMessage(targetConvId, content.trim(), replyingTo?.id || null, type, null);
      setNewMessage('');
      setReplyingTo(null);
      setShowAttachMenu(false);
      isUserNearBottomRef.current = true; // Force scroll to bottom on explicit send
      loadMessages(targetConvId);
      fetchConversations(true);
    } catch (err) {
      addToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleLaunchExperienceFromLauncher = async ({ experience, session_code }) => {
    const msgText = `🎮 Started Activity: ${experience.name}! Session #${session_code}`;
    await handleSendMessage(null, 'text', msgText);
    setActiveSandboxExp(experience);
    setActiveSandboxSessionCode(session_code);
  };

  const handleToggleSaveMessage = async (msgId) => {
    try {
      const res = await request(`/messages/${msgId}/save`, { method: 'POST' });
      addToast(res.is_saved ? 'Message saved to bookmarks!' : 'Message removed from bookmarks', 'info');
    } catch (err) {
      addToast('Failed to save message', 'error');
    }
  };

  return (
    <div className={`flex-1 h-full flex overflow-hidden ${activeTheme.bg}`}>
      {/* Main Conversation Stream */}
      <div className="flex-1 h-full flex flex-col min-w-0 relative">
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Select a Conversation</h2>
            <p className="text-xs text-gray-400 max-w-sm">Choose a chat from the sidebar or start a new direct message/room.</p>
          </div>
        ) : (
          <>
            {/* 1. Header Bar */}
            <div className="p-4 bg-[#0B0E14]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => navigate('/chats')}
                  className="sm:hidden p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                  onClick={() => {
                    if (activeConversation.counterpart) {
                      setSelectedUserProfile(activeConversation.counterpart);
                      setIsProfileModalOpen(true);
                    }
                  }}
                >
                  <Avatar
                    src={activeConversation.counterpart?.avatar_url || activeConversation.icon_url}
                    name={activeConversation.name || activeConversation.counterpart?.display_name}
                    isOnline={activeConversation.counterpart?.is_online}
                  />
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white truncate">
                      {activeConversation.name || activeConversation.counterpart?.display_name}
                    </h2>
                    <p className="text-[11px] text-gray-400 truncate">
                      {activeConversation.is_group ? `${activeConversation.member_count || 2} members` : (activeConversation.counterpart?.is_online ? 'Active now' : 'Offline')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsThemeOpen(true)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                  title="Chat Theme"
                >
                  <Palette className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsMediaPanelOpen(!isMediaPanelOpen)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                  title="Conversation Details"
                >
                  <PanelRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Messages Stream */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
            >
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const isActivityMsg = msg.content?.includes('Started Activity:') || msg.content?.includes('Session #SES_');

                return (
                  <div key={msg.id} className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                    {!isMe && (
                      <Avatar
                        src={msg.sender?.avatar_url}
                        name={msg.sender?.display_name || msg.sender_name}
                        size="sm"
                      />
                    )}

                    <div className="flex flex-col gap-1 min-w-0">
                      {!isMe && (
                        <span className="text-[10px] text-gray-400 font-semibold px-1">
                          {msg.sender?.display_name || msg.sender_name}
                        </span>
                      )}

                      <div className={`p-3.5 rounded-2xl text-xs relative group ${
                        isMe ? activeTheme.bubbleMe : 'bg-white/10 text-white rounded-tl-sm'
                      }`}>
                        {/* Interactive In-Chat Experience Activity Card */}
                        {isActivityMsg ? (
                          <div className="p-4 bg-gradient-to-tr from-indigo-950/80 to-purple-950/80 rounded-xl border border-indigo-500/40 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-indigo-300 font-bold">
                              <Gamepad2 className="w-4 h-4 text-indigo-400" />
                              <span>{msg.content}</span>
                            </div>

                            <button
                              onClick={() => {
                                const codeMatch = msg.content.match(/SES_[A-Z0-9]+/);
                                const code = codeMatch ? codeMatch[0] : null;
                                setActiveSandboxExp({
                                  name: 'Interactive Activity',
                                  category: 'Game',
                                  embed_url: '/experiences/embed/would-you-rather'
                                });
                                setActiveSandboxSessionCode(code);
                              }}
                              className="btn-gradient px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Join / Open Activity</span>
                            </button>
                          </div>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        )}

                        <span className="text-[9px] opacity-60 block text-right mt-1 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 3. Input Composer & Attachment Menu */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-4 bg-[#0B0E14]/90 backdrop-blur-md border-t border-white/10 relative">
              {showAttachMenu && (
                <div className="absolute bottom-16 left-4 p-2 bg-[#131822] border border-white/15 rounded-2xl shadow-2xl flex flex-col gap-1 z-30 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => { setIsExperienceLauncherOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl flex items-center gap-2 text-white font-semibold text-xs"
                  >
                    <Gamepad2 className="w-4 h-4 text-indigo-400" />
                    <span>🎮 Experiences & Mini Apps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsGifOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2 text-white font-semibold text-xs"
                  >
                    <Flame className="w-4 h-4 text-purple-400" />
                    <span>Search GIFs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsStickerOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2 text-white font-semibold text-xs"
                  >
                    <Smile className="w-4 h-4 text-amber-400" />
                    <span>Search Stickers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsPollOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2 text-white font-semibold text-xs"
                  >
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    <span>Create Live Poll</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                >
                  <Plus className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder="Type a message or /command..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="btn-gradient px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Side Panels & Modals */}
      <MediaPanel
        conversation={activeConversation}
        isOpen={isMediaPanelOpen}
        onClose={() => setIsMediaPanelOpen(false)}
        onOpenProfile={(mem) => {
          setSelectedUserProfile(mem);
          setIsProfileModalOpen(true);
        }}
      />

      <ProfilePreviewModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={selectedUserProfile}
      />

      <GifPickerModal
        isOpen={isGifOpen}
        onClose={() => setIsGifOpen(false)}
        onSelectGif={(url) => handleSendMessage(null, 'gif', url)}
      />

      <StickerPickerModal
        isOpen={isStickerOpen}
        onClose={() => setIsStickerOpen(false)}
        onSelectSticker={(url) => handleSendMessage(null, 'sticker', url)}
      />

      <CreatePollModal
        isOpen={isPollOpen}
        onClose={() => setIsPollOpen(false)}
        conversationId={targetConvId}
        onPollCreated={() => loadMessages(targetConvId)}
      />

      <ExperienceLauncherModal
        isOpen={isExperienceLauncherOpen}
        onClose={() => setIsExperienceLauncherOpen(false)}
        onLaunchInChat={handleLaunchExperienceFromLauncher}
      />

      {activeSandboxExp && (
        <ExperienceSandboxModal
          isOpen={true}
          onClose={() => {
            setActiveSandboxExp(null);
            setActiveSandboxSessionCode(null);
          }}
          experience={activeSandboxExp}
          sessionCode={activeSandboxSessionCode}
          conversationId={targetConvId}
          onSendMessage={(content) => handleSendMessage(null, 'text', content)}
        />
      )}

      <ThemeSelectorModal
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        currentThemeId={themeId}
        onSelectTheme={handleSelectTheme}
      />
    </div>
  );
}
