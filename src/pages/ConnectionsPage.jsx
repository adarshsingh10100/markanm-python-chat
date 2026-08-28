import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, UserPlus, Check, X, MessageSquare, Trash2, Mail } from 'lucide-react';
import { connectionService } from '../services/connectionService';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';
import { useToast } from '../context/ToastContext';
import { useChat } from '../context/ChatContext';
import { Avatar } from '../components/Avatar';

export function ConnectionsPage({ onOpenEmailInvite }) {
  const { addToast } = useToast();
  const { selectConversation, fetchConversations } = useChat();
  const navigate = useNavigate();

  const [tab, setTab] = useState('connected'); // connected, incoming, outgoing, search
  const [connected, setConnected] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await connectionService.getConnections();
      setConnected(res.connected || []);
      setIncoming(res.pending_incoming || []);
      setOutgoing(res.pending_outgoing || []);
    } catch (err) {
      addToast(err.message || 'Failed to load connections', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
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
      loadConnections();
    } catch (err) {
      addToast(err.message || 'Failed to send request', 'error');
    }
  };

  const handleAcceptRequest = async (connId) => {
    try {
      await connectionService.acceptRequest(connId);
      addToast('Connection accepted!', 'success');
      loadConnections();
    } catch (err) {
      addToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (connId) => {
    try {
      await connectionService.rejectRequest(connId);
      loadConnections();
    } catch (err) {
      addToast(err.message || 'Failed to reject request', 'error');
    }
  };

  const handleRemoveConnection = async (connId) => {
    if (!window.confirm('Remove this connection?')) return;
    try {
      await connectionService.removeConnection(connId);
      addToast('Connection removed', 'info');
      loadConnections();
    } catch (err) {
      addToast(err.message || 'Failed to remove connection', 'error');
    }
  };

  const handleStartDM = async (targetUserId) => {
    try {
      const res = await chatService.createDirectChat(targetUserId);
      await fetchConversations(true);
      if (res.conversation_id) {
        selectConversation(res.conversation_id);
        navigate('/chat');
      }
    } catch (err) {
      addToast(err.message || 'Failed to open message', 'error');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-[#0B0E14] text-white">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-white/10">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" />
              <span>Connections & Network</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Manage your friends, pending requests, and discover new people.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEmailInvite}
              className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
            >
              <Mail className="w-4 h-4" />
              <span>Invite by Email</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setTab('connected')}
            className={`px-3 py-2 rounded-xl transition-all ${tab === 'connected' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Connected ({connected.length})
          </button>
          <button
            onClick={() => setTab('incoming')}
            className={`px-3 py-2 rounded-xl transition-all relative ${tab === 'incoming' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Incoming ({incoming.length})
            {incoming.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />}
          </button>
          <button
            onClick={() => setTab('outgoing')}
            className={`px-3 py-2 rounded-xl transition-all ${tab === 'outgoing' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Outgoing ({outgoing.length})
          </button>
          <button
            onClick={() => setTab('search')}
            className={`px-3 py-2 rounded-xl transition-all ${tab === 'search' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Find People
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'connected' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {connected.map(user => (
              <div key={user.user_id} className="p-4 glass-card rounded-2xl border border-white/10 flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar src={user.avatar_url} name={user.display_name} size="md" presence={user.presence} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{user.display_name}</h3>
                    <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleStartDM(user.user_id)}
                    className="flex-1 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                  <button
                    onClick={() => handleRemoveConnection(user.connection_id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Remove Connection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {connected.length === 0 && !loading && (
              <div className="col-span-full p-8 text-center text-gray-500">
                You have no connected friends yet. Switch to "Find People" or "Invite by Email" to connect!
              </div>
            )}
          </div>
        )}

        {tab === 'incoming' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {incoming.map(req => (
              <div key={req.connection_id} className="p-4 glass-card rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={req.avatar_url} name={req.display_name} size="md" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{req.display_name}</h3>
                    <p className="text-xs text-gray-400 truncate">@{req.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.connection_id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.connection_id)}
                    className="px-3 py-1.5 bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {incoming.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500">No pending incoming connection requests.</div>
            )}
          </div>
        )}

        {tab === 'search' && (
          <div className="flex flex-col gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search username or display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
              <button
                type="submit"
                disabled={searching}
                className="btn-gradient px-6 py-3 rounded-2xl text-xs font-bold shrink-0"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {searchResults.map(u => (
                <div key={u.id} className="p-4 glass-card rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={u.avatar_url} name={u.display_name} size="md" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{u.display_name}</h3>
                      <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                    </div>
                  </div>

                  {u.connection_status === 'connected' ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full">Connected</span>
                  ) : u.connection_status === 'request_sent' ? (
                    <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full">Sent</span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(u.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
