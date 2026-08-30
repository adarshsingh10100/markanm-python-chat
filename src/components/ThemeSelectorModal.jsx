import React, { useState, useRef } from 'react';
import { X, Palette, Check, Image as ImageIcon, Upload, Trash2, Sparkles } from 'lucide-react';

export const CHAT_THEMES = [
  {
    id: 'indigo',
    name: 'Indigo Neon',
    bg: 'bg-[#0B0E14]',
    primary: 'from-indigo-600 to-purple-600',
    bubbleMe: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-sm shadow-md border border-indigo-400/30',
    bubbleOther: 'bg-[#1E2638] text-white rounded-tl-sm border border-white/10 shadow-sm',
    preview: '#1E1E38'
  },
  {
    id: 'amethyst',
    name: 'Amethyst Glow',
    bg: 'bg-[#120B1B]',
    primary: 'from-purple-600 to-pink-600',
    bubbleMe: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm shadow-md border border-purple-400/30',
    bubbleOther: 'bg-[#251A33] text-white rounded-tl-sm border border-white/10 shadow-sm',
    preview: '#2B1B3A'
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald',
    bg: 'bg-[#0B1713]',
    primary: 'from-emerald-600 to-teal-600',
    bubbleMe: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-md border border-emerald-400/30',
    bubbleOther: 'bg-[#152B24] text-white rounded-tl-sm border border-white/10 shadow-sm',
    preview: '#143328'
  },
  {
    id: 'abyss',
    name: 'Abyss Blue',
    bg: 'bg-[#071322]',
    primary: 'from-blue-600 to-cyan-600',
    bubbleMe: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm shadow-md border border-blue-400/30',
    bubbleOther: 'bg-[#15263B] text-white rounded-tl-sm border border-white/10 shadow-sm',
    preview: '#132B47'
  },
  {
    id: 'sunset',
    name: 'Sunset Nebula',
    bg: 'bg-[#1A0D15]',
    primary: 'from-rose-600 to-amber-600',
    bubbleMe: 'bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-tr-sm shadow-md border border-rose-400/30',
    bubbleOther: 'bg-[#2E1824] text-white rounded-tl-sm border border-white/10 shadow-sm',
    preview: '#3B182B'
  },
  {
    id: 'obsidian',
    name: 'OLED Obsidian',
    bg: 'bg-[#000000]',
    primary: 'from-neutral-700 to-neutral-900',
    bubbleMe: 'bg-neutral-800 text-white rounded-tr-sm shadow-md border border-neutral-700',
    bubbleOther: 'bg-neutral-900 text-gray-200 rounded-tl-sm border border-neutral-800',
    preview: '#171717'
  }
];

export const WALLPAPER_PRESETS = [
  { id: 'space', name: 'Deep Space', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200' },
  { id: 'cyber', name: 'Neon City', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200' },
  { id: 'mountains', name: 'Dark Mountains', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200' },
  { id: 'waves', name: 'Abstract Waves', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200' }
];

export function ThemeSelectorModal({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  currentBgImage,
  onSelectBgImage
}) {
  const [activeTab, setActiveTab] = useState('themes');
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onSelectBgImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectBgImage(customUrl.trim());
      setCustomUrl('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Appearance & Theme</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('themes')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'themes' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Color Themes</span>
          </button>
          <button
            onClick={() => setActiveTab('wallpapers')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'wallpapers' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Wallpaper</span>
          </button>
        </div>

        {/* Tab 1: Color Themes */}
        {activeTab === 'themes' && (
          <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {CHAT_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                }}
                className={`p-3 rounded-2xl border flex flex-col gap-2 items-start text-left transition-all ${
                  currentThemeId === theme.id
                    ? 'border-indigo-500 bg-white/10 ring-2 ring-indigo-500/50'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div
                  className="w-full h-12 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner border border-white/10"
                  style={{ background: theme.preview }}
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${theme.primary} shadow-md`} />
                  {currentThemeId === theme.id && (
                    <Check className="w-4 h-4 text-white absolute right-2 bottom-2" />
                  )}
                </div>
                <span className="text-xs font-bold text-white">{theme.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab 2: Background Wallpapers */}
        {activeTab === 'wallpapers' && (
          <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1">
            {/* Presets */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Presets</span>
              <div className="grid grid-cols-2 gap-2.5">
                {WALLPAPER_PRESETS.map(wp => (
                  <button
                    key={wp.id}
                    onClick={() => onSelectBgImage(wp.url)}
                    className={`h-20 rounded-2xl border relative overflow-hidden group transition-all ${
                      currentBgImage === wp.url ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={wp.url} alt={wp.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2 text-center">
                      <span className="text-xs font-bold text-white drop-shadow-md">{wp.name}</span>
                    </div>
                    {currentBgImage === wp.url && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-indigo-600 text-white shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Upload & Link */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Custom Wallpaper</span>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload Image from Device</span>
              </button>

              <form onSubmit={handleApplyCustomUrl} className="flex gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Or paste Image URL..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white"
                >
                  Apply
                </button>
              </form>

              {currentBgImage && (
                <button
                  type="button"
                  onClick={() => onSelectBgImage(null)}
                  className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 flex items-center justify-center gap-2 mt-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Wallpaper</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
