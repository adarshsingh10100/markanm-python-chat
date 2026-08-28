import React from 'react';
import { X, Palette, Check } from 'lucide-react';

export const CHAT_THEMES = [
  { id: 'indigo', name: 'Indigo Neon', bg: 'bg-[#0B0E14]', primary: 'from-indigo-600 to-purple-600', bubble: 'bg-indigo-600', preview: 'bg-indigo-900' },
  { id: 'amethyst', name: 'Amethyst Glow', bg: 'bg-[#120B1B]', primary: 'from-purple-600 to-pink-600', bubble: 'bg-purple-600', preview: 'bg-purple-900' },
  { id: 'emerald', name: 'Cyber Emerald', bg: 'bg-[#0B1713]', primary: 'from-emerald-600 to-teal-600', bubble: 'bg-emerald-600', preview: 'bg-emerald-900' },
  { id: 'abyss', name: 'Abyss Blue', bg: 'bg-[#071322]', primary: 'from-blue-600 to-cyan-600', bubble: 'bg-blue-600', preview: 'bg-blue-900' },
  { id: 'sunset', name: 'Sunset Nebula', bg: 'bg-[#1A0D15]', primary: 'from-rose-600 to-amber-600', bubble: 'bg-rose-600', preview: 'bg-rose-900' },
  { id: 'obsidian', name: 'OLED Obsidian', bg: 'bg-[#000000]', primary: 'from-neutral-700 to-neutral-900', bubble: 'bg-neutral-800', preview: 'bg-neutral-950' }
];

export function ThemeSelectorModal({ isOpen, onClose, currentThemeId, onSelectTheme }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Chat Color Theme</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 my-4">
          {CHAT_THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => {
                onSelectTheme(theme.id);
                onClose();
              }}
              className={`p-3 rounded-2xl border flex flex-col gap-2 items-start text-left transition-all ${
                currentThemeId === theme.id
                  ? 'border-indigo-500 bg-white/10 ring-2 ring-indigo-500/50'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="w-full h-12 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner border border-white/10" style={{ background: theme.preview }}>
                <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${theme.primary} shadow-md`} />
                {currentThemeId === theme.id && (
                  <Check className="w-4 h-4 text-white absolute right-2 bottom-2" />
                )}
              </div>
              <span className="text-xs font-bold text-white">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
