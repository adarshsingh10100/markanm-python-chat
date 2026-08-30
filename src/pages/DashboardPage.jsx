import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Users, UserPlus, Plus, Search, Sparkles, Check, X, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { connectionService } from '../services/connectionService';
import { userService } from '../services/userService';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';

export function DashboardPage({ onOpenCreateGroup, onOpenEmailInvite }) {
  const { user } = useAuth();
  const { conversations, selectConversation } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    connectionService.getConnections()
      .then(res => setPendingIncoming(res.pending_incoming || []))
      .catch(() => {});
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await userService.searchUsers(searchQuery.trim());
      setSearchResults(res.users || []);
    } catch (err) {
      addToast(err.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    try {
      await connectionService.sendRequest(targetUserId);
      addToast('Connection request sent!', 'success');
      setSearchResults(prev => prev.map(u => u.id === targetUserId ? { ...u, connection_status: 'request_sent' } : u));
    } catch (err) {
      addToast(err.message || 'Failed to send request', 'error');
    }
  };

  const handleAcceptRequest = async (connId) => {
    try {
      await connectionService.acceptRequest(connId);
      addToast('Connection accepted!', 'success');
      setPendingIncoming(prev => prev.filter(c => c.connection_id !== connId));
    } catch (err) {
      addToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (connId) => {
    try {
      await connectionService.rejectRequest(connId);
      setPendingIncoming(prev => prev.filter(c => c.connection_id !== connId));
    } catch (err) {
      addToast(err.message || 'Failed to reject request', 'error');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-[#0B0E14] text-white">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-white/10 relative overflow-hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Dashboard</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {user?.display_name}!
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Explore recent conversations, manage connections, and connect with the community.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateGroup}
              className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
            <button
              onClick={onOpenEmailInvite}
              className="px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Invite Friends via Email"
            >
              <Mail className="w-4 h-4" />
              <span>Invite via Email</span>
            </button>
            <Link
              to={`/@${user?.username}`}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>

        {/* Search People Card */}
        <div className="p-6 glass-card rounded-3xl border border-white/10 flex flex-col gap-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" />
            <span>Discover & Connect People</span>
          </h2>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by @username or display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shrink-0"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {searchResults.map(u => (
                <div key={u.id} className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{u.display_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">@{u.username}</p>
                    </div>
                  </div>

                  {u.connection_status === 'connected' ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-full">Connected</span>
                  ) : u.connection_status === 'request_sent' ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-1 rounded-full">Sent</span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(u.id)}
                      className="p-1.5 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 rounded-lg text-xs font-semibold transition-colors"
                      title="Connect"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Conversations */}
          <div className="p-6 glass-card rounded-3xl border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Recent Conversations</span>
              </h2>
              <Link to="/chat" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              {conversations.slice(0, 4).map(conv => (
                <button
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id);
                    navigate('/chat');
                  }}
                  className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={conv.avatar_url} name={conv.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{conv.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {conv.last_message?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="min-w-[18px] h-4 text-[10px] font-bold bg-indigo-500 text-white rounded-full flex items-center justify-center px-1">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))}

              {conversations.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No active conversations yet.</p>
              )}
            </div>
          </div>

          {/* Pending Connection Requests */}
          <div className="p-6 glass-card rounded-3xl border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Pending Requests</span>
              </h2>
              <Link to="/connections" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Manage
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              {pendingIncoming.slice(0, 4).map(req => (
                <div key={req.connection_id} className="p-3 rounded-2xl bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={req.avatar_url} name={req.display_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{req.display_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">@{req.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAcceptRequest(req.connection_id)}
                      className="p-1.5 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 rounded-lg text-xs transition-colors"
                      title="Accept"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.connection_id)}
                      className="p-1.5 bg-red-600/30 text-red-300 hover:bg-red-600 rounded-lg text-xs transition-colors"
                      title="Reject"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {pendingIncoming.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No pending incoming requests.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
