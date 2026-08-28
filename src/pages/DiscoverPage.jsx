import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass, Flame, Users, Plus, Search, Sparkles, Tag, Smile,
  Heart, MessageSquare, Zap, Target, UserPlus, ArrowRight, Radio
} from 'lucide-react';
import { discoverService } from '../services/discoverService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RoomCard } from '../components/RoomCard';
import { Avatar } from '../components/Avatar';
import { CreateRoomModal } from '../components/CreateRoomModal';

const MOOD_OPTIONS = [
  { id: 'fun', label: 'Have Fun', icon: '😄' },
  { id: 'talk', label: 'Talk to Someone', icon: '💬' },
  { id: 'bored', label: "I'm Bored", icon: '😶' },
  { id: 'deep', label: 'Deep Conversation', icon: '🧠' },
  { id: 'play', label: 'Play', icon: '🎮' },
  { id: 'advice', label: 'Need Advice', icon: '❤️' },
  { id: 'debate', label: 'Debate', icon: '🔥' },
  { id: 'listen', label: 'Just Listen', icon: '🎤' }
];

export function DiscoverPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState('all');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isQuickRoom, setIsQuickRoom] = useState(false);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await discoverService.getDiscoverFeed();
      setFeed(data);
    } catch (err) {
      addToast(err.message || 'Failed to load discovery feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleMoodSelect = async (moodLabel) => {
    const nextMood = selectedMood === moodLabel ? null : moodLabel;
    setSelectedMood(nextMood);
    if (user && nextMood) {
      try {
        await discoverService.updateMood(nextMood);
        addToast(`Mood set to "${nextMood}"`, 'success');
      } catch (e) {}
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await discoverService.search(searchQuery.trim(), searchTab);
      setSearchResults(res);
    } catch (err) {
      addToast(err.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const categories = feed?.categories || [];
  const liveNow = feed?.live_now || [];
  const trending = feed?.trending || [];
  const recommended = feed?.recommended || [];
  const newRooms = feed?.new_rooms || [];
  const people = feed?.people || [];

  // Filtered rooms by category
  const filterByCategory = (list) => {
    if (selectedCategory === 'all') return list;
    return list.filter(r => r.category_slug === selectedCategory);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-[#0B0E14] text-white">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Hero Banner Section */}
        <div className="p-6 sm:p-8 glass-panel rounded-3xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="z-10 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Live Social Discovery</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              What's happening right now?
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
              Talk to people you know, discover communities, and join live public conversations happening across MarkanM.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
              <button
                onClick={() => {
                  setIsQuickRoom(false);
                  setIsCreateRoomOpen(true);
                }}
                className="btn-gradient px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Start a Live Room</span>
              </button>

              <button
                onClick={() => {
                  setIsQuickRoom(true);
                  setIsCreateRoomOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Quick 1-Hour Drop-in</span>
              </button>
            </div>
          </div>

          {/* Decorative Hero Graphic */}
          <div className="w-full md:w-64 h-36 rounded-2xl bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-600/30 border border-white/10 p-4 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <Flame className="w-10 h-10 text-red-400 animate-bounce mb-1" />
            <span className="text-xs font-black text-white">{liveNow.length} Live Rooms Active</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Join any conversation instantly</span>
          </div>
        </div>

        {/* Mood-Based Discovery Bar */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Smile className="w-4 h-4 text-indigo-400" />
            <span>What are you here for? (Select your mood)</span>
          </span>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {MOOD_OPTIONS.map(m => {
              const isSelected = selectedMood === m.label;
              return (
                <button
                  key={m.id}
                  onClick={() => handleMoodSelect(m.label)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-105'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="p-6 glass-card rounded-3xl border border-white/10 flex flex-col gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Live Rooms, People, Topics, or #tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="btn-gradient px-6 py-3 rounded-2xl text-xs font-bold shrink-0"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition-all ${
                  selectedCategory === cat.slug ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results Display */}
        {searchResults && (
          <div className="flex flex-col gap-4 p-6 glass-panel rounded-3xl border border-indigo-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Search Results for "{searchQuery}"</h3>
              <button onClick={() => setSearchResults(null)} className="text-xs text-gray-400 hover:text-white">
                Clear Results
              </button>
            </div>

            {searchResults.rooms?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {searchResults.rooms.map(r => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </div>
            )}

            {searchResults.people?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {searchResults.people.map(p => (
                  <Link key={p.id} to={`/@${p.username}`} className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                    <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.display_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">@{p.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 1. 🔴 Live Now Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>Live Now</span>
            </h2>
            <span className="text-xs font-semibold text-gray-400">{filterByCategory(liveNow).length} active conversations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filterByCategory(liveNow).map(room => (
              <RoomCard key={room.id} room={room} />
            ))}
            {filterByCategory(liveNow).length === 0 && !loading && (
              <div className="col-span-full p-8 text-center text-gray-500 text-xs">
                No active live rooms found in this category. Be the first to start one!
              </div>
            )}
          </div>
        </div>

        {/* 2. 🔥 Trending Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Trending Conversations</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filterByCategory(trending).map(room => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>

        {/* 3. 🎯 Recommended For You Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              <span>Recommended For You</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filterByCategory(recommended).map(room => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>

        {/* 4. 👥 Discoverable People */}
        <div className="flex flex-col gap-4 p-6 glass-card rounded-3xl border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>People to Connect With</span>
            </h2>
            <Link to="/connections" className="text-xs font-semibold text-indigo-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {people.map(p => (
              <Link
                key={p.id}
                to={`/@${p.username}`}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex flex-col items-center text-center gap-2 transition-all hover:scale-105"
              >
                <Avatar src={p.avatar_url} name={p.display_name} size="md" presence={p.presence} />
                <div className="min-w-0 w-full">
                  <p className="text-xs font-bold text-white truncate">{p.display_name}</p>
                  <p className="text-[10px] text-gray-400 truncate">@{p.username}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Room Creation Modal */}
        <CreateRoomModal
          isOpen={isCreateRoomOpen}
          onClose={() => setIsCreateRoomOpen(false)}
          categories={categories}
          isQuick={isQuickRoom}
        />
      </div>
    </div>
  );
}
