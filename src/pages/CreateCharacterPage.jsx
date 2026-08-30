import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Wand2, Palette, ShieldCheck, Globe, Lock, EyeOff } from 'lucide-react';
import { characterService } from '../services/characterService';
import { useToast } from '../context/ToastContext';
import { AppearanceBuilder } from '../components/AppearanceBuilder';

export function CreateCharacterPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [mode, setMode] = useState('easy'); // 'easy' or 'advanced'
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [animeName, setAnimeName] = useState('');
  const [description, setDescription] = useState('');
  const [personalitySummary, setPersonalitySummary] = useState('');
  const [greeting, setGreeting] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [category, setCategory] = useState('Original');
  const [gender, setGender] = useState('Female');
  const [visibility, setVisibility] = useState('public');

  // Advanced persona details
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [scenario, setScenario] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');

  // Appearance JSON from builder
  const [appearance, setAppearance] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Character name is required', 'error');
      return;
    }

    setSubmitting(true);

    const payload = {
      display_name: name.trim(),
      anime_name: animeName.trim(),
      description: description.trim(),
      personality_summary: personalitySummary.trim() || 'Playful and intelligent companion',
      greeting: greeting.trim(),
      avatar_url: avatarUrl.trim(),
      category,
      gender,
      visibility,
      speaking_style: speakingStyle.trim(),
      scenario: scenario.trim(),
      likes: likes.split(',').map(s => s.trim()).filter(Boolean),
      dislikes: dislikes.split(',').map(s => s.trim()).filter(Boolean),
      appearance
    };

    try {
      const res = await characterService.createCharacter(payload);
      if (res.success && res.character) {
        addToast('Character created successfully!', 'success');
        navigate(`/characters/${res.character.slug}`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to create character', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0B0E14] text-white overflow-y-auto custom-scrollbar">
      {/* Header Bar */}
      <div className="border-b border-white/10 bg-[#131822] p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/characters')}
              className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Create AI Character</h1>
              <p className="text-xs text-gray-400">Customize personality, appearance, and speech style</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setMode('easy')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'easy' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Simple Wizard
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'advanced' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Advanced Persona
            </button>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full p-6 space-y-8 pb-16">
        {/* Basic Identity */}
        <div className="bg-[#131822] p-6 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Character Identity
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">Character Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Aiko, Cyberpunk Hacker, Naruto"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">Anime / Universe Name (Optional)</label>
              <input
                type="text"
                value={animeName}
                onChange={e => setAnimeName(e.target.value)}
                placeholder="e.g. Cyberpunk City, Naruto, Original"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1 block">Personality Tagline (Short Summary)</label>
            <input
              type="text"
              value={personalitySummary}
              onChange={e => setPersonalitySummary(e.target.value)}
              placeholder="e.g. Energetic • Playful • Loyal"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1 block">Description & Biography</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe who your character is, their background story, and demeanor..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1 block">First Greeting Message</label>
            <textarea
              rows={2}
              value={greeting}
              onChange={e => setGreeting(e.target.value)}
              placeholder="e.g. Finally! I was waiting for you. What are we getting into today?"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Custom Appearance Builder */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance Builder
          </h2>
          <AppearanceBuilder value={appearance} onChange={setAppearance} />

          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-300 mb-1 block">Or Custom Image Avatar URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#131822] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Advanced Persona Settings */}
        {mode === 'advanced' && (
          <div className="bg-[#131822] p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Advanced Persona Rules & Speech Style
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Speaking Style</label>
                <input
                  type="text"
                  value={speakingStyle}
                  onChange={e => setSpeakingStyle(e.target.value)}
                  placeholder="e.g. Short casual texts with occasional emojis"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Current Scenario</label>
                <input
                  type="text"
                  value={scenario}
                  onChange={e => setScenario(e.target.value)}
                  placeholder="e.g. Living in a futuristic city together"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Likes (Comma separated)</label>
                <input
                  type="text"
                  value={likes}
                  onChange={e => setLikes(e.target.value)}
                  placeholder="Ramen, Training, Music"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Dislikes (Comma separated)</label>
                <input
                  type="text"
                  value={dislikes}
                  onChange={e => setDislikes(e.target.value)}
                  placeholder="Waiting, Traitors, Boredom"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Visibility Controls */}
        <div className="bg-[#131822] p-6 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Character Visibility
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'public', label: 'Public', desc: 'Appears in discovery for everyone', icon: Globe },
              { id: 'unlisted', label: 'Unlisted', desc: 'Accessible only via direct link', icon: EyeOff },
              { id: 'private', label: 'Private', desc: 'Only you can see and chat', icon: Lock }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVisibility(item.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    visibility === item.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 text-indigo-400 mb-2" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.label}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/characters')}
            className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {submitting ? 'Creating Character...' : 'Create & Publish Character'}
          </button>
        </div>
      </form>
    </div>
  );
}
