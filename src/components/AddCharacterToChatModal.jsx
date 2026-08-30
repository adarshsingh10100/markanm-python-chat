import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, UserPlus, Sparkles, MessageSquare } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { characterService } from '../services/characterService';
import { useToast } from '../context/ToastContext';

export function AddCharacterToChatModal({ isOpen, onClose, character }) {
  const navigate = useNavigate();
  const { conversations } = useChat();
  const { addToast } = useToast();
  const [addingId, setAddingId] = useState(null);

  if (!isOpen || !character) return null;

  const handleSelectChat = async (conv) => {
    setAddingId(conv.id);
    try {
      // Direct start or navigate to chat
      const res = await characterService.startChat(character.slug || character.id);
      if (res.success && res.conversation_id) {
        addToast(`Added ${character.display_name} to conversation!`, 'success');
        onClose();
        navigate(`/chat/${res.conversation_id}`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to add character to chat', 'error');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#131822] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Add {character.display_name} to Chat</h3>
              <p className="text-xs text-gray-400">Select a group or private chat room</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversations List */}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 italic">
              No conversations active. Start a new chat first!
            </div>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                onClick={() => handleSelectChat(c)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {c.title ? c.title.charAt(0) : <MessageSquare className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {c.title || c.name || 'Chat Conversation'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {c.type === 'group' ? '👥 Group Chat' : '💬 Private Chat'}
                    </p>
                  </div>
                </div>

                <button
                  disabled={addingId === c.id}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm transition-all"
                >
                  {addingId === c.id ? 'Adding...' : 'Select'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
