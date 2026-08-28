import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Flame, Users, Clock, Share2, Shield, AlertTriangle, ArrowLeft,
  MessageSquare, UserPlus, LogOut, Check, Send, ShieldAlert, Sparkles, Copy
} from 'lucide-react';
import { discoverService } from '../services/discoverService';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import { useRoomPolling } from '../hooks/useRoomPolling';
import { Avatar } from '../components/Avatar';
import { ReportModal } from '../components/ReportModal';

export function LiveRoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { selectConversation } = useChat();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: 'room', id: 0, name: '' });
  const [copiedLink, setCopiedLink] = useState(false);

  const loadRoom = async () => {
    try {
      const data = await discoverService.getRoom(code);
      setRoom(data.room);
    } catch (err) {
      addToast(err.message || 'Failed to load room', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [code]);

  // Periodic room presence heartbeat
  useRoomPolling(code, room?.conversation_id, null, loadRoom);

  const loadMessages = async () => {
    if (!room?.conversation_id || !room?.is_member) return;
    try {
      const res = await chatService.getMessages(room.conversation_id);
      setMessages(res.messages || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (room?.is_member) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [room?.conversation_id, room?.is_member]);

  const handleJoin = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      await discoverService.joinRoom(code);
      addToast('Joined live room!', 'success');
      loadRoom();
    } catch (err) {
      addToast(err.message || 'Failed to join room', 'error');
    }
  };

  const handleLeave = async () => {
    try {
      await discoverService.leaveRoom(code);
      addToast('Left live room', 'info');
      navigate('/discover');
    } catch (err) {
      addToast(err.message || 'Failed to leave room', 'error');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !room?.conversation_id) return;
    setSending(true);

    try {
      await chatService.sendMessage(room.conversation_id, newMessage.trim());
      setNewMessage('');
      loadMessages();
    } catch (err) {
      addToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    addToast('Room link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBanParticipant = async (targetUserId) => {
    if (!window.confirm('Ban this user from this room?')) return;
    try {
      await discoverService.banRoomUser(code, targetUserId, 'Banned by host');
      addToast('User banned from room', 'info');
      loadRoom();
    } catch (err) {
      addToast(err.message || 'Failed to ban user', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading Live Room...</span>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-red-400 text-sm font-medium">
        Room not found or has ended.
      </div>
    );
  }

  const isLive = room.status === 'live';

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0B0E14] text-white overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 glass-panel border-b border-white/10 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/discover')} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                LIVE
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white truncate">{room.title}</h1>
            </div>
            <p className="text-xs text-gray-400 truncate">{room.description || 'Live public conversation'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={() => {
              setReportTarget({ type: 'room', id: room.id, name: room.title });
              setIsReportOpen(true);
            }}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
            title="Report Room"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {room.is_member && (
            <button
              onClick={handleLeave}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-semibold flex items-center gap-1"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content View (Join Preview vs Full Chat) */}
      {!room.is_member ? (
        /* Join Room Preview Screen */
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-indigo-500/30 text-center flex flex-col items-center gap-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Flame className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{room.category?.name || 'Public Room'}</span>
              <h2 className="text-2xl font-black text-white mt-1">{room.title}</h2>
              {room.description && (
                <p className="text-xs text-gray-300 mt-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                  "{room.description}"
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 text-xs font-semibold text-gray-300">
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/20">
                <Users className="w-3.5 h-3.5" />
                {room.active_participants_count} people here
              </span>
              <span className="text-gray-400">Created by @{room.creator?.username}</span>
            </div>

            <button
              onClick={handleJoin}
              className="btn-gradient w-full py-3.5 rounded-2xl text-sm font-bold shadow-xl hover:scale-105 transition-transform"
            >
              Join Conversation
            </button>
          </div>
        </div>
      ) : (
        /* Joined Room Active Workspace */
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Workspace */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Smart Catch-Up Box */}
            <div className="p-3 bg-indigo-950/30 border-b border-indigo-500/20 flex items-center justify-between text-xs text-indigo-200 px-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span><strong>While You Were Away:</strong> {messages.length} messages active • {room.active_participants_count} participants live</span>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
              {messages.map(m => (
                <div key={m.id} className={`flex items-start gap-3 ${m.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                  <Avatar src={m.sender_avatar} name={m.sender_name} size="sm" />
                  <div className={`max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm ${
                    m.sender_id === user?.id ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-200'
                  }`}>
                    <p className="text-[10px] font-bold opacity-75 mb-0.5">{m.sender_name} (@{m.sender_username})</p>
                    <p className="leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-500 my-auto">No messages in this live room yet. Be the first to say hi!</p>
              )}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 glass-panel flex gap-2">
              <input
                type="text"
                placeholder="Type a message to the live room..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
              <button
                type="submit"
                disabled={sending}
                className="btn-gradient px-5 py-3 rounded-2xl text-xs font-bold shrink-0 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>

          {/* Active Participants Sidebar */}
          <div className="w-64 border-l border-white/10 p-4 hidden md:flex flex-col gap-4 overflow-y-auto bg-[#0E121B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>People Here Now</span>
              <span className="text-emerald-400 font-extrabold">{room.active_participants_count}</span>
            </h3>

            <div className="flex flex-col gap-2">
              {room.active_participants?.map(p => (
                <div key={p.user_id} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={p.avatar_url} name={p.display_name} size="xs" presence="online" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.display_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">@{p.username}</p>
                    </div>
                  </div>

                  {room.my_role === 'owner' && p.user_id !== user?.id && (
                    <button
                      onClick={() => handleBanParticipant(p.user_id)}
                      className="text-[10px] font-bold text-red-400 hover:bg-red-500/20 px-2 py-1 rounded-md"
                      title="Ban Participant"
                    >
                      Ban
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Moderation Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        targetName={reportTarget.name}
      />
    </div>
  );
}
