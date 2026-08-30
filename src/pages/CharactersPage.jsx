import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Plus, Flame, Heart, MessageSquare, Star, Compass, Filter, RefreshCw, Zap, Info, ChevronDown, UserCheck, Settings2, Link as LinkIcon, Globe, Lock, Trash2, Edit3 } from 'lucide-react';
import { characterService } from '../services/characterService';
import { useToast } from '../context/ToastContext';
import { CharacterInfoModal } from '../components/CharacterInfoModal';
import { MyCharacterEditorModal } from '../components/MyCharacterEditorModal';

export function CharactersPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [mainTab, setMainTab] = useState('catalog'); // 'catalog' | 'my_characters'
  const [characters, setCharacters] = useState([]);
  const [myCharacters, setMyCharacters] = useState([]);
  const [myFilter, setMyFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [editingChar, setEditingChar] = useState(null);

  const categories = [
    { id: 'all', label: '🌟 All Categories' },
    { id: '🔥 Trending', label: '🔥 Trending' },
    { id: '✨ Recommended', label: '✨ Recommended' },
    { id: '🆕 New', label: '🆕 New' },
    { id: '❤️ Popular', label: '❤️ Popular' },
    { id: 'Anime', label: '🎭 Anime' },
    { id: 'Games', label: '🎮 Games' },
    { id: 'Fictional', label: '🎬 Fictional' },
    { id: 'Romantic', label: '💬 Romantic' },
    { id: 'Flirty', label: '😏 Flirty' },
    { id: 'Intelligent', label: '🧠 Intelligent' },
    { id: 'Funny', label: '😂 Funny' },
    { id: 'Villain', label: '👿 Villains' },
    { id: 'Hero', label: '🦸 Heroes' },
    { id: 'Female', label: '👩 Female' },
    { id: 'Male', label: '👨 Male' },
    { id: 'Original', label: '🌈 Custom' }
  ];

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await characterService.getCatalog({
        category: activeCategory,
        q: searchQuery,
        limit: 48
      });
      if (res.success) {
        setCharacters(res.characters || []);
      }
    } catch (err) {
      addToast('Failed to load characters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCharacters = async () => {
    setLoading(true);
    try {
      const res = await characterService.getMyCharacters();
      if (res.success) {
        setMyCharacters(res.characters || []);
      }
    } catch (err) {
      addToast('Failed to load your characters', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mainTab === 'my_characters') {
        fetchMyCharacters();
      } else {
        fetchCatalog();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [mainTab, activeCategory, searchQuery]);

  const handleDeleteCharacter = async (charId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this character?')) return;
    try {
      await characterService.deleteCharacter(charId);
      addToast('Character deleted successfully', 'info');
      fetchMyCharacters();
    } catch (err) {
      addToast(err.message || 'Failed to delete character', 'error');
    }
  };

  const copyShareLink = (char, e) => {
    if (e) e.stopPropagation();
    const shareLink = `${window.location.origin}/character/${char.slug || char.id}`;
    navigator.clipboard.writeText(shareLink);
    addToast(`Copied share link to clipboard!`, 'success');
  };

  const handleStartChat = async (char, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await characterService.startChat(char.slug || char.id);
      if (res.success && res.conversation_id) {
        navigate(`/chat/${res.conversation_id}`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to start chat', 'error');
    }
  };

  const handleImportAniList = async () => {
    setIsImporting(true);
    try {
      const pageToFetch = Math.floor(Math.random() * 8) + 1;
      const res = await characterService.importAniList(pageToFetch, 50);
      if (res.success) {
        addToast(`Imported ${res.imported_count} anime & fantasy characters!`, 'success');
        fetchCatalog();
      }
    } catch (err) {
      addToast('Import error: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const currentCategoryObj = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <div className="h-full flex flex-col bg-[#0B0E14] text-white overflow-y-auto custom-scrollbar">
      {/* Header Banner */}
      <div className="relative border-b border-white/10 bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs tracking-wider uppercase mb-2">
              <Sparkles className="w-4 h-4" />
              <span>MarkanM Characters</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              Discover & Chat with AI Personas
            </h1>
            <p className="text-gray-400 text-sm mt-2 max-w-xl">
              Explore thousands of anime icons, fictional heroes, custom personas, or create your own AI companion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImportAniList}
              disabled={isImporting}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${isImporting ? 'animate-spin' : ''}`} />
              {isImporting ? 'Importing AniList...' : 'Fetch Anime Characters'}
            </button>

            <button
              onClick={() => navigate('/characters/create')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Character
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6">
        {/* Main Tab Switcher */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <button
            onClick={() => setMainTab('catalog')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              mainTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-[#131822] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Community Catalog</span>
          </button>

          <button
            onClick={() => setMainTab('my_characters')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              mainTab === 'my_characters'
                ? 'bg-gradient-to-r from-amber-600 to-purple-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-[#131822] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>My Characters Studio</span>
            {myCharacters.length > 0 && (
              <span className="px-2 py-0.5 bg-black/40 rounded-full text-[10px] font-bold text-amber-300">
                {myCharacters.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: COMMUNITY CATALOG */}
        {mainTab === 'catalog' && (
          <>
            {/* Search & Category Dropdown Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80 md:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by character name, anime, persona..."
                  className="w-full bg-[#131822] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Category Select Dropdown */}
              <div className="relative w-full sm:w-64">
                <div className="flex items-center gap-2 bg-[#131822] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus-within:border-indigo-500">
                  <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
                  <select
                    value={activeCategory}
                    onChange={e => setActiveCategory(e.target.value)}
                    className="bg-transparent w-full text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900 text-white py-1">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Category Quick Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#131822] border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Character Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : characters.length === 0 ? (
              <div className="text-center py-16 bg-[#131822] rounded-2xl border border-white/10 p-8">
                <Compass className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-lg font-bold text-white mb-1">No Characters Found</h3>
                <p className="text-gray-400 text-xs max-w-sm mx-auto mb-6">
                  Try tweaking your search query or category filter, or fetch new anime characters!
                </p>
                <button
                  onClick={handleImportAniList}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  Fetch Characters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {characters.map(char => (
                  <div
                    key={char.id}
                    onClick={() => navigate(`/characters/${char.slug}`)}
                    className="group relative bg-[#131822] rounded-2xl border border-white/10 overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    {/* Character Image */}
                    <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
                      {char.avatar_url ? (
                        <img
                          src={char.avatar_url}
                          alt={char.display_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-2xl">
                          {char.display_name?.charAt(0)}
                        </div>
                      )}

                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-indigo-300 border border-white/10">
                        AI Persona
                      </span>

                      {/* Quick Info Preview Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewChar(char);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-gray-300 hover:text-white hover:bg-black/80 border border-white/10 transition-all"
                        title="Quick Half Info Preview"
                      >
                        <Info className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    </div>

                    {/* Info Card Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white truncate group-hover:text-indigo-300 transition-colors">
                          {char.display_name}
                        </h3>
                        <p className="text-[11px] font-medium text-gray-400 truncate">
                          {char.anime_name || char.category || 'Original'}
                        </p>

                        {char.creator_name && (
                          <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md truncate block mt-1 w-fit">
                            By {char.creator_name}
                          </span>
                        )}

                        {char.personality_summary && (
                          <p className="text-[10px] text-indigo-400 font-semibold mt-1 truncate">
                            🍥 {char.personality_summary}
                          </p>
                        )}
                      </div>

                      {/* Stats & Quick Actions */}
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewChar(char);
                          }}
                          className="text-gray-400 hover:text-indigo-300 font-semibold text-[10px] flex items-center gap-1"
                        >
                          <Info className="w-3 h-3 text-indigo-400" />
                          Info
                        </button>

                        <button
                          onClick={(e) => handleStartChat(char, e)}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 fill-current" />
                          Chat
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2: MY CHARACTERS STUDIO */}
        {mainTab === 'my_characters' && (
          <div className="space-y-6">
            {/* Visibility Filters for My Characters */}
            <div className="flex items-center gap-2">
              {['all', 'public', 'unlisted', 'private'].map(vis => (
                <button
                  key={vis}
                  onClick={() => setMyFilter(vis)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all border ${
                    myFilter === vis
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-[#131822] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {vis === 'all' ? 'All My Characters' : vis}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : myCharacters.length === 0 ? (
              <div className="text-center py-16 bg-[#131822] rounded-3xl border border-white/10 p-8 space-y-4">
                <UserCheck className="w-12 h-12 text-amber-400 mx-auto opacity-60" />
                <div>
                  <h3 className="text-lg font-bold text-white">No Characters Created Yet</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    Design your first AI persona, retrain it with custom lore, and choose whether to share it publicly or via unlisted link!
                  </p>
                </div>
                <button
                  onClick={() => navigate('/characters/create')}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-lg"
                >
                  Create Your First Character
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {myCharacters
                  .filter(c => myFilter === 'all' || c.visibility === myFilter)
                  .map(char => (
                    <div
                      key={char.id}
                      className="bg-[#131822] rounded-3xl border border-white/10 p-4 space-y-4 hover:border-amber-500/50 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={char.avatar_url || 'https://via.placeholder.com/150'}
                            alt={char.display_name}
                            className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-sm text-white truncate">{char.display_name}</h4>
                            <p className="text-[11px] text-gray-400 truncate">{char.anime_name || char.category || 'Custom'}</p>

                            {/* Visibility Badge */}
                            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              char.visibility === 'public'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : char.visibility === 'unlisted'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}>
                              {char.visibility === 'public' ? <Globe className="w-2.5 h-2.5" /> : char.visibility === 'unlisted' ? <LinkIcon className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                              <span>{char.visibility || 'public'}</span>
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                          {char.personality_summary || char.description || 'Custom AI Character'}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setEditingChar(char)}
                            className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit & Retrain</span>
                          </button>

                          <button
                            onClick={(e) => handleStartChat(char, e)}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs">
                          {(char.visibility === 'unlisted' || char.visibility === 'public') && (
                            <button
                              onClick={(e) => copyShareLink(char, e)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-[11px] font-semibold flex items-center gap-1 flex-1 justify-center border border-white/10"
                            >
                              <LinkIcon className="w-3 h-3 text-amber-400" />
                              <span>Copy Share Link</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => handleDeleteCharacter(char.id, e)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                            title="Delete Character"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Character Half Info Preview Modal */}
      {previewChar && (
        <CharacterInfoModal
          isOpen={Boolean(previewChar)}
          onClose={() => setPreviewChar(null)}
          character={previewChar}
          onStartChat={(char) => handleStartChat(char, null)}
        />
      )}

      {/* My Character Studio Editor Modal */}
      {editingChar && (
        <MyCharacterEditorModal
          isOpen={Boolean(editingChar)}
          onClose={() => setEditingChar(null)}
          character={editingChar}
          onSave={() => fetchMyCharacters()}
        />
      )}
    </div>
  );
}
