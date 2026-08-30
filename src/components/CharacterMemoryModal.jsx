import React, { useState, useEffect } from 'react';
import { X, Brain, Trash2, Shield, RefreshCw } from 'lucide-react';
import { characterService } from '../services/characterService';
import { useToast } from '../context/ToastContext';

export function CharacterMemoryModal({ isOpen, onClose, character }) {
  const { addToast } = useToast();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMemories = async () => {
    if (!character?.id) return;
    setLoading(true);
    try {
      const res = await characterService.getMemories(character.id);
      if (res.success) {
        setMemories(res.memories || []);
      }
    } catch (err) {
      addToast('Failed to load memories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchMemories();
  }, [isOpen, character?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#131822] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Character Memories</h3>
              <p className="text-xs text-gray-400">Facts stored by {character?.display_name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300 flex items-start gap-2">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            {character?.display_name} remembers user preferences and facts to personalize chat responses. You can view or clear these facts anytime.
          </span>
        </div>

        {/* Memories List */}
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              Loading memories...
            </div>
          ) : memories.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 italic">
              No saved memories yet for this character.
            </div>
          ) : (
            memories.map(m => (
              <div key={m.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-indigo-300">{m.fact_key}:</span>{' '}
                  <span className="text-gray-200">{m.fact_value}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
