import React, { useState, useEffect } from 'react';
import { X, Users, Check, Sparkles } from 'lucide-react';
import { connectionService } from '../services/connectionService';
import { chatService } from '../services/chatService';
import { useToast } from '../context/ToastContext';
import { useChat } from '../context/ChatContext';
import { Avatar } from './Avatar';

export function CreateGroupModal({ isOpen, onClose }) {
  const { addToast } = useToast();
  const { fetchConversations, selectConversation } = useChat();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connections, setConnections] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      connectionService.getConnections()
        .then(res => setConnections(res.connected || []))
        .catch(() => addToast('Failed to fetch connections for group creation', 'error'))
        .finally(() => setLoading(false));
    } else {
      setName('');
      setDescription('');
      setSelectedUserIds([]);
    }
  }, [isOpen, addToast]);

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Group name is required.', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await chatService.createGroupChat(
        name.trim(),
        description.trim(),
        '',
        selectedUserIds
      );

      addToast('Group created successfully!', 'success');
      await fetchConversations(true);
      if (res.conversation_id) {
        selectConversation(res.conversation_id);
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to create group', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Create New Group</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Group Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Innovators Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Add Connected Members ({selectedUserIds.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto divide-y divide-white/5 bg-white/5 border border-white/10 rounded-2xl p-2">
              {loading ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading connections...</div>
              ) : connections.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  No connections available yet. Connect with people first!
                </div>
              ) : (
                connections.map(user => {
                  const isSelected = selectedUserIds.includes(user.user_id);
                  return (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => toggleUserSelection(user.user_id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                        isSelected ? 'bg-indigo-600/20 text-white' : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-white">{user.display_name}</p>
                          <p className="text-[10px] text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
