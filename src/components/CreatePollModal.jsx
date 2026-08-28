import React, { useState } from 'react';
import { X, BarChart2, Plus, Trash2 } from 'lucide-react';
import { request } from '../services/api';
import { useToast } from '../context/ToastContext';

export function CreatePollModal({ isOpen, onClose, conversationId, onPollCreated }) {
  const { addToast } = useToast();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleOptionChange = (idx, val) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      addToast('Maximum 6 options allowed.', 'info');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) {
      addToast('A poll must have at least 2 options.', 'error');
      return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      addToast('Poll question is required.', 'error');
      return;
    }

    const cleanOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (cleanOptions.length < 2) {
      addToast('At least 2 non-empty options are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      await request('/polls', {
        method: 'POST',
        body: {
          conversation_id: conversationId,
          question: question.trim(),
          options: cleanOptions,
          is_multiple_choice: isMultipleChoice
        }
      });

      addToast('Live poll created!', 'success');
      onClose();
      if (onPollCreated) onPollCreated();
    } catch (err) {
      addToast(err.message || 'Failed to create poll', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create a Live Poll</h3>
              <p className="text-[11px] text-gray-400">Ask a question and gather votes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Poll Question *</label>
            <input
              type="text"
              required
              placeholder="e.g. Which feature should we build next?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Poll Options *</label>
            <div className="flex flex-col gap-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 text-gray-400 hover:text-red-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="multiChoice"
              checked={isMultipleChoice}
              onChange={(e) => setIsMultipleChoice(e.target.checked)}
              className="rounded bg-white/5 border-white/10 text-purple-600 focus:ring-0"
            />
            <label htmlFor="multiChoice" className="text-xs text-gray-300">Allow multiple choices</label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg"
            >
              {loading ? 'Creating...' : 'Create Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
