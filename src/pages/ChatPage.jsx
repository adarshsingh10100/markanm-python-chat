import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Plus, Paperclip, Smile, Image as ImageIcon,
  BarChart2, Flame, Bookmark, ShieldAlert, MoreVertical, Search,
  ChevronRight, Reply, Trash2, Edit2, PanelRight, ArrowLeft, Palette,
  Gamepad2, Sparkles, Play, CheckCircle2, PanelLeftClose, PanelLeft,
  ArrowDown, Maximize2, Minimize2, Upload, Video, PhoneCall, Copy, ExternalLink, X, Calendar, Info
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
import { WhatsAppImportModal } from '../components/WhatsAppImportModal';
import { GoogleMeetModal } from '../components/GoogleMeetModal';
import { JumpToDateModal } from '../components/JumpToDateModal';
import { MessageInfoModal } from '../components/MessageInfoModal';
import { formatMessagePreview, formatTime, countryFlag } from '../utils/textUtils';
import { encodeId, decodeId } from '../utils/hashUtils';

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, userTimezone, userCountryCode } = useAuth();
  const { conversations, activeConversation, selectConversation, fetchConversations } = useChat();
  const { addToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchConvQuery, setSearchConvQuery] = useState('');

  // Fold / Unfold & Full Focus Mode state
  const [isSidebarFolded, setIsSidebarFolded] = useState(false);
  const [userIsScrolledUp, setUserIsScrolledUp] = useState(false);
  const [hasUnreadNewMessages, setHasUnreadNewMessages] = useState(false);

  // Attachment & Theme state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isGifOpen, setIsGifOpen] = useState(false);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isExperienceLauncherOpen, setIsExperienceLauncherOpen] = useState(false);
  const [isWhatsAppImportOpen, setIsWhatsAppImportOpen] = useState(false);
  const [isMeetModalOpen, setIsMeetModalOpen] = useState(false);
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [isInChatSearchOpen, setIsInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [inChatSearchResults, setInChatSearchResults] = useState([]);
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [selectedInfoMsg, setSelectedInfoMsg] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const touchStartRef = useRef(null);
  const isJumpModeRef = useRef(false);

  // Sandbox state
  const [activeSandboxExp, setActiveSandboxExp] = useState(null);
  const [activeSandboxSessionCode, setActiveSandboxSessionCode] = useState(null);

  const [themeId, setThemeId] = useState(localStorage.getItem('markanm_chat_theme') || 'indigo');
  const [bgImage, setBgImage] = useState(localStorage.getItem('markanm_chat_bg_image') || null);

  // Side panels & Modals
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const prevMessagesCountRef = useRef(0);
  const userJustSentRef = useRef(false);

  // Resolve target conversation ID transparently
  let targetConvId = activeConversation?.id;
  if (conversationId) {
    if (conversationId.startsWith('@')) {
      const targetUsername = conversationId.substring(1).toLowerCase();
      const match = conversations.find(c => c.counterpart?.username?.toLowerCase() === targetUsername);
      targetConvId = match ? match.id : conversationId;
    } else {
      const decoded = decodeId(conversationId);
      targetConvId = (typeof decoded === 'number' && decoded > 0) ? decoded : conversationId;
    }
  }

  const activeTheme = CHAT_THEMES.find(t => t.id === themeId) || CHAT_THEMES[0];

  const handleSelectTheme = (tid) => {
    setThemeId(tid);
    localStorage.setItem('markanm_chat_theme', tid);
  };

  const handleSelectBgImage = (imgUrl) => {
    setBgImage(imgUrl);
    if (imgUrl) {
      localStorage.setItem('markanm_chat_bg_image', imgUrl);
    } else {
      localStorage.removeItem('markanm_chat_bg_image');
    }
  };

  useEffect(() => {
    const handleDocClick = () => setContextMenu(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  useEffect(() => {
    if (targetConvId) {
      isInitialLoadRef.current = true;
      isJumpModeRef.current = false;
      setUserIsScrolledUp(false);
      setHasUnreadNewMessages(false);
      selectConversation(targetConvId);
      loadMessages(targetConvId);
    }
  }, [targetConvId]);

  const [displayedMessages, setDisplayedMessages] = useState([]);
  const allMessagesRef = useRef([]);
  const sendQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);
  const loadingMoreTopRef = useRef(false);
  const [hasMoreTop, setHasMoreTop] = useState(true);

  const MAX_WINDOW = 150;

  // Update DOM window (renders max 150 messages when at bottom; preserves all history when scrolling up)
  const updateDisplayedWindow = (forceScrollBottom = false) => {
    const all = allMessagesRef.current;
    
    // If user is scrolled up or in Jump Mode, do NOT slice array to prevent DOM height collapse
    if ((!userIsScrolledUp && !isJumpModeRef.current) || forceScrollBottom) {
      const windowed = all.slice(-MAX_WINDOW);
      setDisplayedMessages(windowed);
    } else {
      setDisplayedMessages([...all]);
    }

    if (forceScrollBottom) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
        messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoadRef.current ? 'auto' : 'smooth' });
      }, 20);
    }
  };

  const loadMessages = async (cid) => {
    if (!cid || (typeof cid === 'number' && (isNaN(cid) || cid <= 0))) return;
    
    // Do NOT overwrite user's Jump Mode view (top of chat or date jump) during background polling
    if (isJumpModeRef.current && (userIsScrolledUp || allMessagesRef.current.length > 0)) {
      return;
    }

    try {
      const res = await chatService.getMessages(cid, 0, 0, 150);
      const fetchedMsgs = res.messages || [];

      // Preserve any pending optimistic messages that are still sending
      const pendingMsgs = allMessagesRef.current.filter(m => m.status === 'sending' || m.status === 'failed');

      // Merge fetched messages with pending optimistic messages
      const existingIds = new Set(fetchedMsgs.map(m => m.id));
      const filteredPending = pendingMsgs.filter(m => !existingIds.has(m.id));

      const merged = [...fetchedMsgs, ...filteredPending];
      
      // Preserve history if user has loaded earlier messages while scrolling up
      if (userIsScrolledUp && allMessagesRef.current.length > merged.length) {
        const mergedIds = new Set(merged.map(m => m.id));
        const historyOnly = allMessagesRef.current.filter(m => !mergedIds.has(m.id));
        allMessagesRef.current = [...historyOnly, ...merged];
      } else {
        allMessagesRef.current = merged;
      }

      // Detect unread messages
      if (!isInitialLoadRef.current && merged.length > prevMessagesCountRef.current) {
        if (userIsScrolledUp && !userJustSentRef.current) {
          setHasUnreadNewMessages(true);
        }
      }

      prevMessagesCountRef.current = merged.length;
      updateDisplayedWindow(isInitialLoadRef.current || userJustSentRef.current);

      if (isInitialLoadRef.current) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 15);
        isInitialLoadRef.current = false;
      }
      if (userJustSentRef.current) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 15);
        userJustSentRef.current = false;
      }
    } catch (e) {}
  };

  // Load earlier messages when scrolling near top (150 messages per batch)
  const loadEarlierMessages = async () => {
    if (loadingMoreTopRef.current || !hasMoreTop || allMessagesRef.current.length === 0) return;
    loadingMoreTopRef.current = true;

    const oldestMsg = allMessagesRef.current[0];
    if (!oldestMsg || oldestMsg.id.toString().startsWith('temp_')) {
      loadingMoreTopRef.current = false;
      return;
    }

    const container = messagesContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;
    const oldScrollTop = container ? container.scrollTop : 0;

    try {
      const res = await chatService.getMessages(targetConvId, 0, oldestMsg.id, 150);
      const earlierMsgs = res.messages || [];

      if (earlierMsgs.length < 150) {
        setHasMoreTop(false);
      }

      if (earlierMsgs.length > 0) {
        const existingIds = new Set(allMessagesRef.current.map(m => m.id));
        const newEarlier = earlierMsgs.filter(m => !existingIds.has(m.id));

        if (newEarlier.length > 0) {
          allMessagesRef.current = [...newEarlier, ...allMessagesRef.current];
          setDisplayedMessages([...allMessagesRef.current]);

          // Lock scroll position seamlessly using rAF so view never jumps or snaps
          requestAnimationFrame(() => {
            if (container) {
              const heightDiff = container.scrollHeight - oldScrollHeight;
              container.scrollTop = oldScrollTop + heightDiff;
            }
          });
        }
      }
    } catch (e) {
    } finally {
      loadingMoreTopRef.current = false;
    }
  };

  // Scroll handler: Auto load 150 earlier messages when scrolling top half of chat
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isScrolledUp = distanceToBottom > 100;
    setUserIsScrolledUp(isScrolledUp);

    if (!isScrolledUp) {
      setHasUnreadNewMessages(false);
    }

    // Auto-load 150 earlier messages when user reaches top half of scroll container
    if (el.scrollTop < 400 || el.scrollTop < (el.scrollHeight * 0.35)) {
      loadEarlierMessages();
    }
  };

  // Ultra-Fast Live Reload Polling Strategy
  useEffect(() => {
    if (targetConvId) {
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadMessages(targetConvId);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [targetConvId]);

  // In-Chat Message Search Effect
  useEffect(() => {
    if (!isInChatSearchOpen || !targetConvId) return;
    const q = inChatSearchQuery.trim();
    if (!q) {
      setInChatSearchResults([]);
      setIsSearchingInChat(false);
      return;
    }

    setIsSearchingInChat(true);
    const timer = setTimeout(async () => {
      try {
        const res = await chatService.searchMessages(targetConvId, q);
        setInChatSearchResults(res.results || []);
      } catch (e) {
        setInChatSearchResults([]);
      } finally {
        setIsSearchingInChat(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inChatSearchQuery, isInChatSearchOpen, targetConvId]);

  useEffect(() => {
    const convInterval = setInterval(() => {
      if (!document.hidden) {
        fetchConversations(false);
      }
    }, 2500);
    return () => clearInterval(convInterval);
  }, []);

  const scrollToBottom = () => {
    isJumpModeRef.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserIsScrolledUp(false);
    setHasUnreadNewMessages(false);
  };

  const handleJumpToTop = async () => {
    if (!targetConvId) return;
    try {
      addToast('Jumping to earliest messages...', 'info');
      isJumpModeRef.current = true;
      setUserIsScrolledUp(true);
      const res = await chatService.getMessages(targetConvId, 0, 0, 150, true);
      const topMsgs = res.messages || [];
      if (topMsgs.length > 0) {
        allMessagesRef.current = topMsgs;
        setDisplayedMessages([...topMsgs]);
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = 0;
          }
        }, 30);
      }
    } catch (e) {
      addToast('Could not load top of chat', 'error');
    }
  };

  const handleJumpToDate = async (dateStr) => {
    if (!targetConvId || !dateStr) return;
    try {
      addToast(`Jumping to messages near ${dateStr}...`, 'info');
      isJumpModeRef.current = true;
      setUserIsScrolledUp(true);
      const res = await chatService.getMessages(targetConvId, 0, 0, 150, false, false, dateStr);
      const dateMsgs = res.messages || [];
      if (dateMsgs.length > 0) {
        allMessagesRef.current = dateMsgs;
        setDisplayedMessages([...dateMsgs]);
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = 0;
          }
        }, 30);
      } else {
        addToast(`No messages found near date ${dateStr}`, 'warning');
      }
    } catch (e) {
      addToast('Could not load target date messages', 'error');
    }
  };

  // Process Outgoing Queue Sequentially in Background
  const processSendQueue = async () => {
    if (isProcessingQueueRef.current || sendQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;

    while (sendQueueRef.current.length > 0) {
      const task = sendQueueRef.current[0];
      try {
        const res = await chatService.sendMessage(
          task.convId,
          task.content,
          task.replyToId,
          task.type,
          null
        );

        const realMsg = res.message;
        if (realMsg) {
          allMessagesRef.current = allMessagesRef.current.map(m =>
            m.id === task.tempId ? { ...realMsg, is_mine: true, status: 'sent' } : m
          );
          updateDisplayedWindow(false);
        }
        sendQueueRef.current.shift();
      } catch (err) {
        // Mark message as failed
        allMessagesRef.current = allMessagesRef.current.map(m =>
          m.id === task.tempId ? { ...m, status: 'failed' } : m
        );
        updateDisplayedWindow(false);
        sendQueueRef.current.shift();
        addToast(err.message || 'Failed to send message', 'error');
      }
    }

    isProcessingQueueRef.current = false;
    fetchConversations(false);
  };

  // OPTIMISTIC MESSAGE SENDER (0ms UI Latency)
  const handleSendMessage = async (e, type = 'text', customContent = null) => {
    if (e) e.preventDefault();
    const content = customContent || newMessage;
    if (!content.trim() || !targetConvId) return;

    const cleanContent = content.trim();
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const tempMsg = {
      id: tempId,
      conversation_id: targetConvId,
      sender_id: user?.id,
      sender_name: user?.display_name || 'Me',
      sender_username: user?.username,
      sender_avatar: user?.avatar_url,
      type: type,
      message_type: type,
      content: cleanContent,
      reply_to_id: replyingTo?.id || null,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      is_mine: true,
      status: 'sending'
    };

    // Instant UI feedback (0ms delay)
    setNewMessage('');
    setReplyingTo(null);
    setShowAttachMenu(false);
    setUserIsScrolledUp(false);
    userJustSentRef.current = true;

    allMessagesRef.current = [...allMessagesRef.current, tempMsg];
    updateDisplayedWindow(true);

    // Push into queue
    sendQueueRef.current.push({
      tempId,
      convId: targetConvId,
      content: cleanContent,
      replyToId: replyingTo?.id || null,
      type
    });

    processSendQueue();
  };

  const handleLaunchExperienceFromLauncher = async ({ experience, session_code }) => {
    const msgText = `🎮 Started Activity: ${experience.name}! Session #${session_code}`;
    await handleSendMessage(null, 'text', msgText);
    setActiveSandboxExp(experience);
    setActiveSandboxSessionCode(session_code);
  };

  // Filter conversations list for left sidebar
  const filteredConversations = conversations.filter(c => {
    const searchName = c.name || c.counterpart?.display_name || c.counterpart?.username || '';
    return searchName.toLowerCase().includes(searchConvQuery.toLowerCase());
  });

  // Render Rich Formatted Message Contents (Polls, GIFs, Stickers, Images, Videos)
  const renderRichMessage = (msg) => {
    const text = msg.content || '';

    // 1. Poll Message
    let pollId = null;
    if (msg.type === 'poll' || text.startsWith('{"poll_id"')) {
      try {
        const parsed = JSON.parse(text);
        pollId = parsed.poll_id;
      } catch (e) {
        const match = text.match(/"poll_id"\s*:\s*([0-9]+)/);
        if (match) pollId = parseInt(match[1], 10);
      }
    }

    if (pollId) {
      return (
        <div className="my-1 w-full">
          <PollWidget pollId={pollId} />
        </div>
      );
    }

    // 2. GIF Message
    if (msg.type === 'gif' || text.endsWith('.gif') || text.includes('giphy.com') || text.includes('tenor.com')) {
      return (
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg max-w-xs sm:max-w-sm bg-black/40 my-1">
          <img src={text} alt="GIF" className="w-full h-auto max-h-72 object-cover" />
        </div>
      );
    }

    // 3. Sticker Message
    if (msg.type === 'sticker' || text.includes('twemoji') || text.includes('iconify') || text.includes('/stickers/')) {
      return (
        <div className="p-1 my-1">
          <img src={text} alt="Sticker" className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-md" />
        </div>
      );
    }

    // 4. Image Attachment
    if (msg.type === 'image' || (text.startsWith('http') && (text.endsWith('.jpg') || text.endsWith('.png') || text.endsWith('.jpeg') || text.endsWith('.webp')))) {
      return (
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg max-w-xs sm:max-w-sm my-1">
          <img
            src={text}
            alt="Image Attachment"
            className="w-full h-auto max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => window.open(text, '_blank')}
          />
        </div>
      );
    }

    // 5. Video Attachment
    if (msg.type === 'video' || (text.startsWith('http') && (text.endsWith('.mp4') || text.endsWith('.webm')))) {
      return (
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg max-w-xs sm:max-w-sm bg-black my-1">
          <video src={text} controls className="w-full h-auto max-h-80" />
        </div>
      );
    }

    // 6. Default Text Message
    return <p className="leading-relaxed text-xs sm:text-sm md:text-base whitespace-pre-wrap break-words">{text}</p>;
  };

  return (
    <div className={`flex-1 h-full flex overflow-hidden ${activeTheme.bg}`}>
      {/* 1. Left Conversations Sidebar List (Foldable for Full Focus Mode) */}
      <div className={`h-full bg-[#0B0E14]/95 border-r border-white/10 flex flex-col shrink-0 transition-all duration-300 ${
        isSidebarFolded ? 'hidden' : (activeConversation ? 'hidden md:flex w-full md:w-80' : 'flex w-full md:w-80')
      }`}>
        {/* Search & Inbox Header */}
        <div className="p-4 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">Chats</h2>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-500/20">
              {conversations.length} Inbox
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchConvQuery}
              onChange={(e) => setSearchConvQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-none">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No conversations found. Start a new chat from Discover or Connections!
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = activeConversation?.id === conv.id;
              const title = conv.name || conv.counterpart?.display_name || 'Conversation';
              const targetSlug = conv.counterpart?.username ? `@${conv.counterpart.username}` : encodeId(conv.id);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id);
                    navigate(`/chat/${targetSlug}`);
                  }}
                  className={`p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-white shadow-lg'
                      : 'hover:bg-white/5 text-gray-300 border border-transparent'
                  }`}
                >
                  <Avatar
                    src={conv.counterpart?.avatar_url || conv.icon_url}
                    name={title}
                    isOnline={conv.counterpart?.is_online}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{title}</h4>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                          {formatTime(conv.last_message_at, userTimezone)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {formatMessagePreview(conv.last_message) || 'No messages yet'}
                    </p>
                  </div>

                  {Boolean(conv.unread_count) && conv.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Conversation Stream Column (Full Focus Mode Supported) */}
      <div className={`flex-1 h-full flex-col min-w-0 relative ${
        activeConversation ? 'flex' : 'hidden md:flex'
      }`}>
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 shadow-xl">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Select a Conversation</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm leading-relaxed">Choose a chat from the sidebar or start a new direct message/room.</p>
          </div>
        ) : (
          <>
            {/* Responsive Header Bar */}
            <div className="p-3.5 sm:p-4 bg-[#0B0E14]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back / Inbox Button */}
                <button
                  onClick={() => {
                    selectConversation(null);
                    navigate('/chat');
                  }}
                  className="md:hidden p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/5 flex items-center gap-1 text-xs font-bold"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Inbox</span>
                </button>

                {/* Desktop Fold / Unfold Sidebar Toggle */}
                <button
                  onClick={() => setIsSidebarFolded(!isSidebarFolded)}
                  className="hidden md:flex p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                  title={isSidebarFolded ? "Unfold Sidebar (Show Chats)" : "Fold Sidebar (Full Focus Mode)"}
                >
                  {isSidebarFolded ? <PanelLeft className="w-5 h-5 text-indigo-400" /> : <PanelLeftClose className="w-5 h-5" />}
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
                    size="md"
                  />
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-base font-bold text-white truncate">
                      {activeConversation.name || activeConversation.counterpart?.display_name}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                      {activeConversation.is_group ? `${activeConversation.member_count || 2} members` : (activeConversation.counterpart?.is_online ? 'Active now' : 'Offline')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setIsInChatSearchOpen(!isInChatSearchOpen)}
                  className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs ${
                    isInChatSearchOpen
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                  }`}
                  title="Search Messages in Chat"
                >
                  <Search className="w-5 h-5 text-indigo-400" />
                  <span className="hidden lg:inline">Search</span>
                </button>
                <button
                  onClick={() => setIsJumpModalOpen(true)}
                  className="p-2.5 text-gray-400 hover:text-amber-400 rounded-xl hover:bg-amber-500/10 transition-all flex items-center gap-1.5 font-bold text-xs"
                  title="Jump to Top or Date"
                >
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span className="hidden md:inline text-amber-400">Timeline</span>
                </button>
                <button
                  onClick={() => setIsMeetModalOpen(true)}
                  className="p-2.5 text-gray-400 hover:text-emerald-400 rounded-xl hover:bg-emerald-500/10 transition-all flex items-center gap-1.5 font-bold text-xs"
                  title="Start Google Meet Call"
                >
                  <Video className="w-5 h-5 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-400">Call</span>
                </button>
                <button
                  onClick={() => setIsThemeOpen(true)}
                  className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                  title="Chat Theme"
                >
                  <Palette className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsMediaPanelOpen(!isMediaPanelOpen)}
                  className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                  title="Conversation Details"
                >
                  <PanelRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Telegram/Discord Style In-Chat Search Drawer Overlay */}
            {isInChatSearchOpen && (
              <div className="bg-[#131822] border-b border-white/10 p-3 flex flex-col gap-2.5 z-20 animate-in slide-in-from-top duration-150">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search messages in this chat..."
                      value={inChatSearchQuery}
                      onChange={(e) => setInChatSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-9 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                    {inChatSearchQuery && (
                      <button
                        onClick={() => setInChatSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsInChatSearchOpen(false);
                      setInChatSearchQuery('');
                    }}
                    className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Results Display */}
                {inChatSearchQuery.trim() && (
                  <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                    {isSearchingInChat ? (
                      <div className="p-3 text-center text-xs text-gray-400">Searching messages...</div>
                    ) : inChatSearchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-500">No messages found matching "{inChatSearchQuery}"</div>
                    ) : (
                      inChatSearchResults.map(res => (
                        <button
                          key={res.id}
                          onClick={() => {
                            const targetEl = document.getElementById(`msg-${res.id}`);
                            if (targetEl) {
                              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              targetEl.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-500/20');
                              setTimeout(() => targetEl.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-500/20'), 3000);
                            } else {
                              addToast('Message is further up in history. Scroll up to load.', 'info');
                            }
                            setIsInChatSearchOpen(false);
                          }}
                          className="p-2.5 hover:bg-white/10 rounded-xl flex items-center justify-between gap-3 text-left transition-all border border-white/5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={res.sender_avatar} name={res.sender_name} size="xs" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-indigo-300">{res.sender_name}</span>
                              <span className="text-xs text-gray-200 truncate">{res.content}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0 flex flex-col items-end gap-0.5">
                            <span>📅 {new Date(res.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-gray-300 font-bold">{formatTime(res.created_at, userTimezone)}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Messages Stream with Responsive Spacing & Custom Wallpaper */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              style={{
                backgroundImage: bgImage ? `linear-gradient(rgba(11, 14, 20, 0.82), rgba(11, 14, 20, 0.82)), url("${bgImage}")` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 relative"
            >
              {displayedMessages.map((msg) => {
                const isMe = msg.sender_id === user?.id || msg.is_mine;
                const isActivityMsg = msg.content?.includes('Started Activity:') || msg.content?.includes('Session #SES_');

                return (
                  <div key={msg.id} className={`flex gap-3 max-w-[92%] sm:max-w-[80%] md:max-w-[70%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                    {!isMe && (
                      <Avatar
                        src={msg.sender?.avatar_url}
                        name={msg.sender?.display_name || msg.sender_name}
                        size="sm"
                      />
                    )}

                    <div className="flex flex-col gap-1 min-w-0">
                      {!isMe && (
                        <span className="text-[11px] text-gray-400 font-semibold px-1">
                          {msg.sender?.display_name || msg.sender_name}
                        </span>
                      )}

                      <div
                        id={`msg-${msg.id}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, msg });
                        }}
                        onTouchStart={(e) => {
                          touchStartRef.current = {
                            x: e.touches[0].clientX,
                            y: e.touches[0].clientY,
                            msg
                          };
                        }}
                        onTouchEnd={(e) => {
                          if (!touchStartRef.current) return;
                          const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
                          const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
                          if (Math.abs(dx) > 60 && dy < 40) {
                            setReplyingTo(touchStartRef.current.msg);
                            if (navigator.vibrate) navigator.vibrate(20);
                          }
                          touchStartRef.current = null;
                        }}
                        className={`p-3.5 sm:p-4 rounded-2xl relative group ${
                          isMe
                            ? (activeTheme.bubbleMe || 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-sm shadow-md border border-indigo-400/30')
                            : (activeTheme.bubbleOther || 'bg-[#1E2638] text-white rounded-tl-sm border border-white/10 shadow-sm')
                        }`}
                      >
                        {/* Replying Quote Block */}
                        {(msg.reply_content || msg.reply_to?.content) && (
                          <div
                            onClick={() => {
                              const targetId = msg.reply_to_id || msg.reply_to?.id;
                              const targetEl = document.getElementById(`msg-${targetId}`);
                              targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              targetEl?.classList.add('ring-2', 'ring-indigo-500');
                              setTimeout(() => targetEl?.classList.remove('ring-2', 'ring-indigo-500'), 2000);
                            }}
                            className="p-2 mb-2 rounded-xl bg-black/40 border-l-4 border-indigo-400 text-xs cursor-pointer hover:bg-black/60 transition-all text-gray-200 text-left"
                          >
                            <div className="font-bold text-[10px] text-indigo-300">
                              {msg.reply_sender_name || msg.reply_to?.sender_name || 'Replied Message'}
                            </div>
                            <div className="truncate opacity-80">{msg.reply_content || msg.reply_to?.content}</div>
                          </div>
                        )}

                        {/* Interactive Call Card */}
                        {(msg.message_type === 'call' || msg.type === 'call' || msg.content?.includes('meet.google.com')) ? (
                          <div className="p-4 bg-gradient-to-tr from-emerald-950/90 to-teal-950/90 rounded-2xl border border-emerald-500/40 flex flex-col gap-3 min-w-[220px]">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
                                <Video className="w-4 h-4 text-emerald-400 animate-pulse" />
                                <span>Google Meet Video Call</span>
                              </div>
                            </div>

                            <p className="text-[11px] text-gray-300 text-left">
                              {msg.content?.includes('Ended') ? '🔴 Video Call Ended' : '📞 Video Call Started — Click to join!'}
                            </p>

                            <div className="flex gap-2">
                              {!msg.content?.includes('Ended') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const urlMatch = msg.content.match(/https?:\/\/[^\s]+/);
                                    if (urlMatch) window.open(urlMatch[0], '_blank');
                                  }}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Join Call</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage(null, 'call', '🔴 Video Call Ended');
                                }}
                                className="py-2 px-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>End Call</span>
                              </button>
                            </div>
                          </div>
                        ) : isActivityMsg ? (
                          <div className="p-4 bg-gradient-to-tr from-indigo-950/80 to-purple-950/80 rounded-2xl border border-indigo-500/40 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs sm:text-sm">
                              <Gamepad2 className="w-4 h-4 text-indigo-400" />
                              <span>{msg.content}</span>
                            </div>

                            <button
                              onClick={() => {
                                const codeMatch = msg.content.match(/SES_[A-Z0-9]+/);
                                const code = codeMatch ? codeMatch[0] : null;

                                let embedUrl = '/experiences/embed/would-you-rather';
                                let gameName = 'Interactive Activity';

                                if (msg.content.includes('Prediction Poll')) {
                                  embedUrl = '/experiences/embed/prediction-poll';
                                  gameName = 'Prediction Poll';
                                } else if (msg.content.includes('Quick Quiz')) {
                                  embedUrl = '/experiences/embed/quick-quiz';
                                  gameName = 'Quick Quiz';
                                } else if (msg.content.includes('Party Game') || msg.content.includes('Truth or Dare')) {
                                  embedUrl = '/experiences/embed/party-game';
                                  gameName = 'Truth or Dare';
                                } else if (msg.content.includes('Compatibility Test') || msg.content.includes('Compatibility')) {
                                  embedUrl = '/experiences/embed/compatibility-test';
                                  gameName = 'Compatibility Test';
                                } else if (msg.content.includes('Would You Rather')) {
                                  embedUrl = '/experiences/embed/would-you-rather';
                                  gameName = 'Would You Rather';
                                }

                                setActiveSandboxExp({ name: gameName, embed_url: embedUrl });
                                setActiveSandboxSessionCode(code);
                              }}
                              className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Join / Open Activity</span>
                            </button>
                          </div>
                        ) : (
                          renderRichMessage(msg)
                        )}

                        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-60 font-mono">
                          <span>{formatTime(msg.created_at, userTimezone)}</span>
                          {msg.status === 'sending' && (
                            <span className="text-amber-400 animate-pulse flex items-center gap-1">
                              <span>⏳</span>
                            </span>
                          )}
                          {msg.status === 'failed' && (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <span>⚠️ Failed</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Unread New Messages Pill */}
            {hasUnreadNewMessages && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-20 right-6 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-2xl border border-indigo-400/30 flex items-center gap-2 z-20 animate-bounce"
              >
                <ArrowDown className="w-4 h-4" />
                <span>New Messages Below</span>
              </button>
            )}

            {/* Input Composer & Attachment Menu */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-3.5 sm:p-4 bg-[#0B0E14]/90 backdrop-blur-md border-t border-white/10 relative">
              {/* Replying Banner Above Input */}
              {replyingTo && (
                <div className="flex items-center justify-between p-2.5 mb-2 bg-indigo-950/80 border-l-4 border-indigo-400 rounded-xl text-xs text-gray-200 shadow-md">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-indigo-300 text-[11px] flex items-center gap-1">
                      <Reply className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Replying to {replyingTo.sender_name || 'Message'}</span>
                    </span>
                    <span className="truncate text-gray-300 opacity-90">{replyingTo.content}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-gray-400 hover:text-white rounded-lg shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {showAttachMenu && (
                <div className="absolute bottom-16 left-2 sm:left-4 p-2 bg-[#131822] border border-white/15 rounded-2xl shadow-2xl flex flex-col gap-1 z-30 min-w-[200px] max-w-[calc(100vw-24px)]">
                  <button
                    type="button"
                    onClick={() => { setIsExperienceLauncherOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl flex items-center gap-2.5 text-white font-semibold text-xs sm:text-sm"
                  >
                    <Gamepad2 className="w-4 h-4 text-indigo-400" />
                    <span>🎮 Experiences & Mini Apps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsGifOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2.5 text-white font-semibold text-xs sm:text-sm"
                  >
                    <Flame className="w-4 h-4 text-purple-400" />
                    <span>Search GIFs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsStickerOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2.5 text-white font-semibold text-xs sm:text-sm"
                  >
                    <Smile className="w-4 h-4 text-amber-400" />
                    <span>Search Stickers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsPollOpen(true); setShowAttachMenu(false); }}
                    className="p-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2.5 text-white font-semibold text-xs sm:text-sm"
                  >
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    <span>Create Live Poll</span>
                  </button>

                  {activeConversation?.type === 'direct' && (
                    <button
                      type="button"
                      onClick={() => { setIsWhatsAppImportOpen(true); setShowAttachMenu(false); }}
                      className="p-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2.5 text-white font-semibold text-xs sm:text-sm"
                    >
                      <Upload className="w-4 h-4 text-green-400" />
                      <span>📱 Import WhatsApp Chat</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2.5 sm:p-3 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                >
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <input
                  type="text"
                  placeholder="Type a message or /command..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm md:text-base text-white focus:outline-none focus:border-indigo-500/50"
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="btn-gradient px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shrink-0"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
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
        currentBgImage={bgImage}
        onSelectBgImage={handleSelectBgImage}
      />

      <WhatsAppImportModal
        isOpen={isWhatsAppImportOpen}
        onClose={() => setIsWhatsAppImportOpen(false)}
        conversationId={targetConvId}
        currentUser={user}
        partnerUser={activeConversation?.counterpart || {}}
        onImportComplete={() => loadMessages(targetConvId)}
      />

      <GoogleMeetModal
        isOpen={isMeetModalOpen}
        onClose={() => setIsMeetModalOpen(false)}
        onStartCall={(url) => {
          handleSendMessage(null, 'call', `📞 Google Meet Video Call: ${url}`);
        }}
      />

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 180),
            left: Math.min(contextMenu.x, window.innerWidth - 180)
          }}
          className="fixed z-50 min-w-[170px] bg-[#131822]/95 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 text-xs font-semibold text-white animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setReplyingTo(contextMenu.msg);
              setContextMenu(null);
            }}
            className="p-2 hover:bg-indigo-600/30 hover:text-indigo-300 rounded-xl flex items-center gap-2.5 text-left transition-all"
          >
            <Reply className="w-4 h-4 text-indigo-400" />
            <span>Reply</span>
          </button>

          <button
            onClick={() => {
              if (contextMenu.msg?.content) {
                navigator.clipboard.writeText(contextMenu.msg.content);
                addToast('Copied text to clipboard!', 'info');
              }
              setContextMenu(null);
            }}
            className="p-2 hover:bg-white/10 rounded-xl flex items-center gap-2.5 text-left transition-all"
          >
            <Copy className="w-4 h-4 text-gray-400" />
            <span>Copy Text</span>
          </button>

          <button
            onClick={() => {
              chatService.toggleSave(contextMenu.msg.id);
              addToast('Saved message!', 'success');
              setContextMenu(null);
            }}
            className="p-2 hover:bg-white/10 rounded-xl flex items-center gap-2.5 text-left transition-all"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span>Save Message</span>
          </button>

          <button
            onClick={() => {
              setSelectedInfoMsg(contextMenu.msg);
              setContextMenu(null);
            }}
            className="p-2 hover:bg-white/10 rounded-xl flex items-center gap-2.5 text-left transition-all"
          >
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Message Info</span>
          </button>

          {(contextMenu.msg?.sender_id === user?.id || contextMenu.msg?.is_mine) && (
            <button
              onClick={() => {
                chatService.deleteMessage(contextMenu.msg.id);
                allMessagesRef.current = allMessagesRef.current.filter(m => m.id !== contextMenu.msg.id);
                updateDisplayedWindow(false);
                setContextMenu(null);
              }}
              className="p-2 hover:bg-red-600/20 hover:text-red-400 rounded-xl flex items-center gap-2.5 text-left transition-all text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Message</span>
            </button>
          )}
        </div>
      )}
      <JumpToDateModal
        isOpen={isJumpModalOpen}
        onClose={() => setIsJumpModalOpen(false)}
        onJumpToTop={handleJumpToTop}
        onJumpToDate={handleJumpToDate}
        onJumpToBottom={scrollToBottom}
      />
      <MessageInfoModal
        isOpen={!!selectedInfoMsg}
        onClose={() => setSelectedInfoMsg(null)}
        message={selectedInfoMsg}
        userTimezone={userTimezone}
      />
    </div>
  );
}
