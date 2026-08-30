import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Heart, Sparkles, UserPlus, ShieldAlert, Brain, ChevronLeft, Zap, Info, Share2 } from 'lucide-react';
import { characterService } from '../services/characterService';
import { useToast } from '../context/ToastContext';
import { CharacterMemoryModal } from '../components/CharacterMemoryModal';
import { AddCharacterToChatModal } from '../components/AddCharacterToChatModal';
import { CharacterImageBankModal } from '../components/CharacterImageBankModal';
import { Image as ImageIcon } from 'lucide-react';

export function CharacterDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const containerRef = useRef(null);

  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isAddToChatOpen, setIsAddToChatOpen] = useState(false);
  const [isImageBankOpen, setIsImageBankOpen] = useState(false);

  const fetchCharacter = async () => {
    setLoading(true);
    try {
      const res = await characterService.getBySlug(slug);
      if (res.success) {
        setCharacter(res.character);
      }
    } catch (err) {
      addToast('Character not found', 'error');
      navigate('/characters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacter();
  }, [slug]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [slug, character]);

  const handleStartChat = async () => {
    try {
      const res = await characterService.startChat(character.slug || character.id);
      if (res.success && res.conversation_id) {
        navigate(`/chat/${res.conversation_id}`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to start chat', 'error');
    }
  };

  const handleFavorite = async () => {
    try {
      const res = await characterService.toggleFavorite(character.id);
      if (res.success) {
        setCharacter(prev => ({
          ...prev,
          is_favorite: res.is_favorite,
          likes_count: res.is_favorite ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1)
        }));
      }
    } catch (err) {
      addToast('Failed to favorite character', 'error');
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-[#0B0E14] flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading Character Profile...</span>
        </div>
      </div>
    );
  }

  if (!character) return null;

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-[#0B0E14] text-white overflow-y-auto custom-scrollbar">
      {/* Sticky Top Header Bar for Smooth Scrolling */}
      <div className="sticky top-0 z-30 bg-[#0B0E14]/90 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/characters')}
          className="flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-indigo-400" />
          <span>Back to Characters</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white hidden sm:inline">{character.display_name}</span>
          <button
            onClick={handleStartChat}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Chat
          </button>
        </div>
      </div>

      {/* Banner & Header */}
      <div className="relative h-56 sm:h-72 w-full bg-slate-900 overflow-hidden shrink-0">
        {character.banner_url || character.avatar_url ? (
          <img
            src={character.banner_url || character.avatar_url}
            alt={character.display_name}
            className="w-full h-full object-cover opacity-40 blur-sm scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/60 to-transparent" />
      </div>

      {/* Main Profile Info & Scrollable Content */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 -mt-20 relative z-10 space-y-6 pb-32">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 bg-[#131822] p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-slate-800 border-4 border-[#131822] overflow-hidden shadow-xl shrink-0 -mt-16 md:-mt-20">
              {character.avatar_url ? (
                <img src={character.avatar_url} alt={character.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-600 font-bold text-3xl">
                  {character.display_name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">{character.display_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                  🤖 AI Character
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-400 mt-1">
                {character.anime_name ? `From ${character.anime_name}` : character.category || 'Original Persona'}
              </p>

              {character.creator_name ? (
                <div className="flex items-center justify-center md:justify-start gap-1.5 mt-2 text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full w-fit">
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Created by {character.creator_name}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center md:justify-start gap-1.5 mt-2 text-xs text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Official MarkanM Persona</span>
                </div>
              )}

              {character.personality_summary && (
                <p className="text-xs text-indigo-400 font-semibold mt-2">
                  🍥 {character.personality_summary}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center">
            <button
              onClick={handleFavorite}
              className={`p-3 rounded-xl border transition-all ${
                character.is_favorite
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Favorite"
            >
              <Heart className={`w-5 h-5 ${character.is_favorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => setIsImageBankOpen(true)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              Image Bank
            </button>

            <button
              onClick={() => setIsAddToChatOpen(true)}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Add to Group
            </button>

            <button
              onClick={handleStartChat}
              className="flex-1 md:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              Start AI Chat
            </button>
          </div>
        </div>

        {/* Non-canon AI Disclaimer Box */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">AI Character Notice:</span> This AI persona is inspired by the fictional character {character.display_name}. It is an automated AI model and not affiliated with official rights holders.
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#131822] p-6 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">About Character</h3>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {character.description || 'No description provided.'}
              </p>
            </div>

            {character.greeting && (
              <div className="bg-[#131822] p-6 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">First Greeting</h3>
                <div className="bg-white/5 p-4 rounded-xl text-sm italic text-indigo-200 border border-white/5">
                  "{character.greeting}"
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Specs & Memories */}
          <div className="space-y-6">
            <div className="bg-[#131822] p-5 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Analytics & Stats</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Conversations</span>
                  <span className="font-bold text-white">{character.conversations_count || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Likes</span>
                  <span className="font-bold text-white">{character.likes_count || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Category</span>
                  <span className="font-bold text-indigo-300">{character.category || 'Anime'}</span>
                </div>
              </div>
            </div>

            {/* Memories Control Button */}
            <button
              onClick={() => setIsMemoryOpen(true)}
              className="w-full p-4 rounded-2xl bg-[#131822] border border-white/10 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-xs font-bold text-white">Character Memories</h4>
                  <p className="text-[10px] text-gray-400">View & control what {character.display_name} remembers</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Memory Control Modal */}
      {isMemoryOpen && (
        <CharacterMemoryModal
          isOpen={isMemoryOpen}
          onClose={() => setIsMemoryOpen(false)}
          character={character}
        />
      )}

      {/* Add to Chat / Group Modal */}
      {isAddToChatOpen && (
        <AddCharacterToChatModal
          isOpen={isAddToChatOpen}
          onClose={() => setIsAddToChatOpen(false)}
          character={character}
        />
      )}

      {/* Character Image Bank Modal */}
      {isImageBankOpen && (
        <CharacterImageBankModal
          isOpen={isImageBankOpen}
          onClose={() => setIsImageBankOpen(false)}
          character={character}
        />
      )}
    </div>
  );
}
