import React from 'react';
import { X, MessageSquare, Zap, Heart, Info, Sparkles, UserPlus, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { characterService } from '../services/characterService';
import { useToast } from '../context/ToastContext';

export function CharacterInfoModal({ isOpen, onClose, character, onStartChat }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  if (!isOpen || !character) return null;

  const handleStartChat = async () => {
    onClose();
    if (onStartChat) {
      onStartChat(character);
    } else {
      try {
        const res = await characterService.startChat(character.slug || character.id);
        if (res.success && res.conversation_id) {
          navigate(`/chat/${res.conversation_id}`);
        }
      } catch (err) {
        addToast(err.message || 'Failed to start chat', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#131822] border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0 relative flex flex-col max-h-[90vh]">
        {/* Banner / Header Image */}
        <div className="relative h-44 w-full bg-slate-900 overflow-hidden shrink-0">
          {character.banner_url || character.avatar_url ? (
            <img
              src={character.banner_url || character.avatar_url}
              alt={character.display_name}
              className="w-full h-full object-cover opacity-60 blur-sm scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-indigo-950 via-purple-950 to-slate-950" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#131822] via-transparent to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur-md text-gray-400 hover:text-white border border-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div className="absolute bottom-3 left-6 flex items-end gap-4 z-10">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-indigo-500 overflow-hidden shadow-xl shrink-0">
              {character.avatar_url ? (
                <img src={character.avatar_url} alt={character.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-600 font-bold text-2xl text-white">
                  {character.display_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-extrabold text-white leading-tight">{character.display_name}</h2>
              <p className="text-xs font-semibold text-indigo-300">
                {character.anime_name ? `From ${character.anime_name}` : character.category || 'Original Persona'}
              </p>

              {character.creator_name ? (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full w-fit">
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Created by {character.creator_name}</span>
                </div>
              ) : character.created_by ? (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full w-fit">
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Community Persona</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Tagline */}
          {character.personality_summary && (
            <div className="px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{character.personality_summary}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-[10px]">Description & Story</h4>
            <p className="text-gray-200 leading-relaxed whitespace-pre-line bg-white/5 p-3.5 rounded-xl border border-white/5">
              {character.description || 'No detailed biography provided.'}
            </p>
          </div>

          {/* Greeting Snippet */}
          {character.greeting && (
            <div>
              <h4 className="font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-[10px]">First Greeting</h4>
              <p className="text-indigo-200 italic bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20">
                "{character.greeting}"
              </p>
            </div>
          )}

          {/* Quick Analytics */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-gray-400">Conversations</span>
              <span className="font-bold text-white">{character.conversations_count || 0}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-gray-400">Likes</span>
              <span className="font-bold text-white">{character.likes_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0B0E14] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              onClose();
              navigate(`/characters/${character.slug}`);
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-colors"
          >
            View Full Profile
          </button>

          <button
            onClick={handleStartChat}
            className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}
