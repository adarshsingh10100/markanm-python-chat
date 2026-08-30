import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Plus, Check, Loader2, Sparkles, Tag } from 'lucide-react';
import { characterService } from '../services/characterService';

const MOOD_OPTIONS = [
  'cute', 'happy', 'sad', 'angry', 'battle', 
  'romantic', 'flirty', 'cool', 'casual', 
  'funny', 'serious', 'portrait', 'beach', 'formal'
];

export function CharacterImageBankModal({ isOpen, onClose, character }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [imageUrl, setImageUrl] = useState('');
  const [mood, setMood] = useState('cute');
  const [style, setStyle] = useState('portrait');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && character?.id) {
      loadImages();
    }
  }, [isOpen, character]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await characterService.getCharacterImages(character.id);
      if (res?.success) {
        setImages(res.images || []);
      }
    } catch (err) {
      console.error('Failed to load character images', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setError('Please provide a valid Image URL.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const res = await characterService.uploadCharacterImage(character.id, {
        image_url: imageUrl,
        mood,
        style,
        tags: [mood, style, ...parsedTags]
      });

      if (res?.success) {
        setSuccess('Image added to Character Bank!');
        setImageUrl('');
        setTagsInput('');
        loadImages();
      } else {
        setError(res?.error || 'Failed to upload image.');
      }
    } catch (err) {
      setError(err.message || 'Error uploading image.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !character) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0E131F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <img src={character.avatar_url} alt={character.display_name} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40" />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {character.display_name} Image Bank <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-gray-400">Add mood photos for AI photo requests</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Upload Form */}
          <form onSubmit={handleUpload} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" /> Add New Mood Photo
            </h3>

            {error && <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">{error}</div>}
            {success && <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Direct Image URL *</label>
                <input
                  type="url"
                  placeholder="https://example.com/character-photo.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151B2B] border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Target Mood</label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151B2B] border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none capitalize"
                >
                  {MOOD_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Additional Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. smiling, outfit, chibi"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#151B2B] border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Image to Bank
              </button>
            </div>
          </form>

          {/* Existing Gallery */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" /> Stored Image Bank ({images.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10 text-gray-400 text-xs">
                No custom mood photos uploaded yet. Upload images above to allow the AI to send them in chat!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="group relative rounded-xl overflow-hidden bg-[#151B2B] border border-white/10 aspect-square">
                    <img src={img.image_url} alt={img.mood} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-indigo-600/80 text-white rounded-full capitalize">
                        {img.mood}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
