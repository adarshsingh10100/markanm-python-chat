import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Flame, Tag, Clock, Users, Shield, Sparkles, Plus } from 'lucide-react';
import { discoverService } from '../services/discoverService';
import { useToast } from '../context/ToastContext';

export function CreateRoomModal({ isOpen, onClose, categories = [], isQuick = false }) {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState(isQuick ? 'Anyone awake? Let\'s talk' : '');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(16); // Default Random
  const [type, setType] = useState('public');
  const [tags, setTags] = useState('');
  const [duration, setDuration] = useState(isQuick ? '1h' : '3h');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Room title is required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await discoverService.createRoom({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        type,
        tags: tagArray,
        duration,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null
      });

      addToast('Live room created successfully!', 'success');
      onClose();
      if (res.room?.code) {
        navigate(`/room/${res.room.code}`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to create room', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isQuick ? 'Start Quick Drop-in Room' : 'Start a Live Room'}
              </h3>
              <p className="text-[11px] text-gray-400">Create a discoverable public conversation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Room Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Late Night Talk or GTA VI Theories"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="What are we talking about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#131822] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Room Privacy</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="public" className="bg-[#131822] text-white">Public (Discoverable)</option>
                <option value="unlisted" className="bg-[#131822] text-white">Unlisted (Link Only)</option>
                <option value="private" className="bg-[#131822] text-white">Private (Invite Only)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="30m" className="bg-[#131822] text-white">30 minutes</option>
                <option value="1h" className="bg-[#131822] text-white">1 hour</option>
                <option value="3h" className="bg-[#131822] text-white">3 hours</option>
                <option value="6h" className="bg-[#131822] text-white">6 hours</option>
                <option value="12h" className="bg-[#131822] text-white">12 hours</option>
                <option value="24h" className="bg-[#131822] text-white">24 hours</option>
                <option value="none" className="bg-[#131822] text-white">No expiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Participant Limit</label>
              <select
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="" className="bg-[#131822] text-white">Unlimited</option>
                <option value="10" className="bg-[#131822] text-white">10 participants</option>
                <option value="25" className="bg-[#131822] text-white">25 participants</option>
                <option value="50" className="bg-[#131822] text-white">50 participants</option>
                <option value="100" className="bg-[#131822] text-white">100 participants</option>
                <option value="250" className="bg-[#131822] text-white">250 participants</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. gaming, movies, tech"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
            />
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
              disabled={loading}
              className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Launch Room'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
