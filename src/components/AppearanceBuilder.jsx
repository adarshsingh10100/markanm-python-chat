import React, { useState } from 'react';
import { Palette, Sparkles, User, Shield, Wand2, Glasses, Crown, Zap, Heart, Smile } from 'lucide-react';

export function AppearanceBuilder({ value, onChange }) {
  const [appearance, setAppearance] = useState(value || {
    skinTone: '#FFDFC4',
    hairStyle: 'spiky',
    hairColor: '#F59E0B',
    eyeColor: '#2563EB',
    expression: 'smile',
    outfit: 'cyberpunk',
    accessory: 'none',
    background: 'neon-city'
  });

  const updateAttr = (key, val) => {
    const next = { ...appearance, [key]: val };
    setAppearance(next);
    if (onChange) onChange(next);
  };

  const hairStyles = [
    { id: 'spiky', label: '⚡ Spiky Hero' },
    { id: 'short', label: '✂️ Messy Short' },
    { id: 'long', label: '💇‍♀️ Flowing Long' },
    { id: 'bob', label: '👩‍🦰 Sleek Bob' },
    { id: 'ponytail', label: '🎀 High Ponytail' },
    { id: 'twin_tails', label: '👧 Twin Tails' },
    { id: 'curly', label: '🌀 Curly Waves' },
    { id: 'hooded', label: '🥷 Hooded Cowl' }
  ];

  const hairColors = [
    { label: 'Gold Blonde', hex: '#F59E0B' },
    { label: 'Raven Black', hex: '#0F172A' },
    { label: 'Crimson Red', hex: '#DC2626' },
    { label: 'Cyber Purple', hex: '#9333EA' },
    { label: 'Silver White', hex: '#E2E8F0' },
    { label: 'Aqua Cyan', hex: '#06B6D4' },
    { label: 'Sakura Pink', hex: '#EC4899' },
    { label: 'Flame Orange', hex: '#EA580C' },
    { label: 'Emerald Green', hex: '#10B981' },
    { label: 'Deep Indigo', hex: '#3730A3' }
  ];

  const skinTones = [
    { label: 'Porcelain', hex: '#FDF2E9' },
    { label: 'Fair Peach', hex: '#FFDFC4' },
    { label: 'Warm Ivory', hex: '#F5C4A0' },
    { label: 'Honey Tan', hex: '#E0AC69' },
    { label: 'Bronze', hex: '#C68642' },
    { label: 'Dark Ochre', hex: '#8D5524' }
  ];

  const eyeColors = [
    { label: 'Azure Blue', hex: '#2563EB' },
    { label: 'Ruby Red', hex: '#DC2626' },
    { label: 'Emerald Green', hex: '#059669' },
    { label: 'Amethyst Purple', hex: '#7C3AED' },
    { label: 'Amber Gold', hex: '#D97706' },
    { label: 'Magenta Pink', hex: '#DB2777' },
    { label: 'Glowing Cyan', hex: '#0891B2' },
    { label: 'Slate Grey', hex: '#475569' }
  ];

  const expressions = [
    { id: 'smile', label: '😊 Happy Smile' },
    { id: 'smirk', label: '😏 Confident Smirk' },
    { id: 'confident', label: '😄 Open Grin' },
    { id: 'blush', label: '😳 Shy Blush' }
  ];

  const outfits = [
    { id: 'cyberpunk', label: '🧥 Cyberpunk Neon Jacket' },
    { id: 'ninja', label: '🥋 Shinobi Battle Robe' },
    { id: 'casual', label: '👕 Streetwear Hoodie' },
    { id: 'suit', label: '👔 Sorcerer Blazer' },
    { id: 'armor', label: '🛡️ Knight Battle Armor' },
    { id: 'dress', label: '👗 Gothic Ribbon Dress' }
  ];

  const accessories = [
    { id: 'none', label: '❌ None' },
    { id: 'headband', label: '🎗️ Shinobi Headband' },
    { id: 'glasses', label: '👓 Smart Glasses' },
    { id: 'cat_ears', label: '🐱 Neko Cat Ears' },
    { id: 'halo', label: '😇 Angel Halo' },
    { id: 'mask', label: '😷 Cyberpunk Mask' }
  ];

  const backgrounds = [
    { id: 'neon-city', label: '🌆 Cyberpunk City', bgClass: 'from-purple-950 via-indigo-950 to-slate-950' },
    { id: 'dojo', label: '🎋 Mystic Dojo', bgClass: 'from-amber-950 via-stone-900 to-zinc-950' },
    { id: 'sunset', label: '🌅 Anime Sunset', bgClass: 'from-rose-900 via-orange-950 to-slate-950' },
    { id: 'galaxy', label: '🌌 Starry Cosmos', bgClass: 'from-blue-950 via-purple-950 to-black' },
    { id: 'sakura', label: '🌸 Sakura Blossom', bgClass: 'from-pink-950 via-purple-950 to-slate-950' }
  ];

  const currentBg = backgrounds.find(b => b.id === appearance.background) || backgrounds[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-[#131822] p-6 rounded-3xl border border-white/10 shadow-2xl">
      {/* Visual Vector Avatar Canvas Preview */}
      <div className="flex flex-col items-center justify-center gap-3 shrink-0">
        <div className={`w-52 h-52 rounded-3xl bg-gradient-to-b ${currentBg.bgClass} flex items-center justify-center relative overflow-hidden border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 group`}>
          <svg className="w-48 h-48 relative z-10" viewBox="0 0 100 100">
            {/* Definitions / Gradients */}
            <defs>
              <linearGradient id="hairShine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="irisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="100%" stopColor={appearance.eyeColor} stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* 1. BACK HAIR LAYER (Behind Body & Head) */}
            {appearance.hairStyle === 'long' && (
              <path
                d="M 20 38 Q 10 65 18 92 C 26 95 34 80 32 45 L 68 45 C 66 80 74 95 82 92 Q 90 65 80 38 Z"
                fill={appearance.hairColor}
              />
            )}
            {appearance.hairStyle === 'twin_tails' && (
              <g fill={appearance.hairColor}>
                {/* Left Tail */}
                <path d="M 24 30 Q 8 45 12 78 Q 22 82 28 42 Z" />
                {/* Right Tail */}
                <path d="M 76 30 Q 92 45 88 78 Q 78 82 72 42 Z" />
                {/* Ribbon Ties */}
                <circle cx="24" cy="30" r="3.5" fill="#EF4444" />
                <circle cx="76" cy="30" r="3.5" fill="#EF4444" />
              </g>
            )}
            {appearance.hairStyle === 'ponytail' && (
              <g>
                <path
                  d="M 64 22 Q 88 18 84 56 Q 76 68 64 32 Z"
                  fill={appearance.hairColor}
                />
                <circle cx="64" cy="23" r="4" fill="#EF4444" />
              </g>
            )}
            {appearance.hairStyle === 'curly' && (
              <g fill={appearance.hairColor}>
                <path d="M 16 35 Q 8 52 20 72 Q 28 52 26 35 Z" />
                <path d="M 84 35 Q 92 52 80 72 Q 72 52 74 35 Z" />
              </g>
            )}

            {/* 2. OUTFIT & BODY TORSO (Y=56-100) */}
            <g>
              {/* Neck */}
              <path d="M 43 50 L 43 62 L 57 62 L 57 50 Z" fill={appearance.skinTone} />
              <path d="M 43 52 L 57 52 L 50 58 Z" fill="#000000" opacity="0.1" />

              {/* Clothes */}
              {appearance.outfit === 'cyberpunk' && (
                <g>
                  {/* Jacket base */}
                  <path d="M 22 64 Q 50 58 78 64 L 84 100 L 16 100 Z" fill="#312E81" />
                  {/* High collar */}
                  <path d="M 32 60 L 42 74 L 36 100 L 16 100 Z" fill="#4338CA" />
                  <path d="M 68 60 L 58 74 L 64 100 L 84 100 Z" fill="#4338CA" />
                  {/* Neon Trim Lines */}
                  <path d="M 32 60 L 42 74" stroke="#06B6D4" strokeWidth="1.5" fill="none" />
                  <path d="M 68 60 L 58 74" stroke="#06B6D4" strokeWidth="1.5" fill="none" />
                  {/* Inner shirt */}
                  <polygon points="42,74 50,84 58,74 50,62" fill="#1E1B4B" />
                </g>
              )}

              {appearance.outfit === 'ninja' && (
                <g>
                  <path d="M 22 64 Q 50 60 78 64 L 84 100 L 16 100 Z" fill="#1E1B4B" />
                  <polygon points="40,60 50,78 60,60" fill="#DC2626" />
                  <path d="M 28 66 L 50 88 L 72 66" stroke="#94A3B8" strokeWidth="2" fill="none" />
                </g>
              )}

              {appearance.outfit === 'casual' && (
                <g>
                  <path d="M 22 64 Q 50 60 78 64 L 84 100 L 16 100 Z" fill="#4F46E5" />
                  <path d="M 44 60 C 44 70, 56 70, 56 60 Z" fill="#3730A3" />
                  {/* Hoodie drawstrings */}
                  <line x1="46" y1="64" x2="46" y2="76" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="54" y1="64" x2="54" y2="76" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              )}

              {appearance.outfit === 'suit' && (
                <g>
                  <path d="M 22 64 Q 50 60 78 64 L 84 100 L 16 100 Z" fill="#0F172A" />
                  <polygon points="42,60 50,80 58,60" fill="#FFFFFF" />
                  <polygon points="48,64 52,64 53,82 47,82" fill="#DC2626" />
                </g>
              )}

              {appearance.outfit === 'armor' && (
                <g>
                  <path d="M 20 64 Q 50 58 80 64 L 86 100 L 14 100 Z" fill="#475569" />
                  {/* Pauldrons */}
                  <path d="M 18 64 Q 32 58 36 74 L 16 80 Z" fill="#64748B" />
                  <path d="M 82 64 Q 68 58 64 74 L 84 80 Z" fill="#64748B" />
                  <circle cx="50" cy="74" r="6" fill="#F59E0B" />
                </g>
              )}

              {appearance.outfit === 'dress' && (
                <g>
                  <path d="M 24 64 Q 50 60 76 64 L 84 100 L 16 100 Z" fill="#881337" />
                  <path d="M 38 60 L 50 72 L 62 60 Z" fill="#FFFFFF" />
                  <circle cx="50" cy="68" r="3" fill="#EC4899" />
                </g>
              )}
            </g>

            {/* 3. HEAD & FACE STRUCTURE (Centered at cy=40, r=19) */}
            <g>
              {/* Ears */}
              <ellipse cx="28" cy="42" rx="3.5" ry="5" fill={appearance.skinTone} />
              <ellipse cx="72" cy="42" rx="3.5" ry="5" fill={appearance.skinTone} />

              {/* Head Base */}
              <path
                d="M 30 34 C 28 18, 72 18, 70 34 C 70 50, 58 62, 50 62 C 42 62, 30 50, 30 34 Z"
                fill={appearance.skinTone}
              />

              {/* Blushing Cheeks */}
              {(appearance.expression === 'blush' || appearance.expression === 'smile') && (
                <g opacity="0.4">
                  <ellipse cx="36" cy="47" rx="4" ry="2.5" fill="#F87171" />
                  <ellipse cx="64" cy="47" rx="4" ry="2.5" fill="#F87171" />
                </g>
              )}

              {/* Eyes Base White */}
              <ellipse cx="38" cy="41" rx="5" ry="6.5" fill="#FFFFFF" />
              <ellipse cx="62" cy="41" rx="5" ry="6.5" fill="#FFFFFF" />

              {/* Iris */}
              <ellipse cx="38" cy="42" rx="3.5" ry="5" fill={appearance.eyeColor} />
              <ellipse cx="62" cy="42" rx="3.5" ry="5" fill={appearance.eyeColor} />

              {/* Pupils */}
              <circle cx="38" cy="42" r="2" fill="#0F172A" />
              <circle cx="62" cy="42" r="2" fill="#0F172A" />

              {/* Catchlight Shine Dots */}
              <circle cx="36.5" cy="39.5" r="1.5" fill="#FFFFFF" />
              <circle cx="60.5" cy="39.5" r="1.5" fill="#FFFFFF" />

              {/* Eyelashes / Top Lid */}
              <path d="M 31 39 Q 38 34 44 39" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 56 39 Q 62 34 69 39" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />

              {/* Eyebrows */}
              <path d="M 33 33 Q 38 30 43 33" stroke={appearance.hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 57 33 Q 62 30 67 33" stroke={appearance.hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />

              {/* Nose */}
              <path d="M 50 46 L 49 48 L 51 48 Z" fill="#94A3B8" />

              {/* Mouth / Expressions */}
              {appearance.expression === 'smile' && (
                <path d="M 44 53 Q 50 58 56 53" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
              )}
              {appearance.expression === 'smirk' && (
                <path d="M 44 54 Q 52 56 57 51" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
              )}
              {appearance.expression === 'confident' && (
                <path d="M 43 52 Q 50 60 57 52 Z" fill="#0F172A" />
              )}
              {appearance.expression === 'blush' && (
                <path d="M 46 54 Q 50 56 54 54" stroke="#0F172A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              )}
            </g>

            {/* 4. FRONT HAIR & BANGS LAYER (Positioned ON TOP OF HEAD Y=10 to 42) */}
            <g fill={appearance.hairColor}>
              {appearance.hairStyle === 'spiky' && (
                <g>
                  {/* Top crown Spikes */}
                  <path d="M 26 32 Q 18 10 38 16 Q 44 4 50 14 Q 58 4 64 16 Q 82 10 74 32 Q 62 20 50 22 Q 38 20 26 32 Z" />
                  {/* Front Bangs */}
                  <path d="M 28 34 L 36 40 L 42 32 L 50 42 L 58 32 L 64 40 L 72 34 Q 50 22 28 34 Z" />
                </g>
              )}

              {appearance.hairStyle === 'short' && (
                <g>
                  {/* Rounded Messy Top */}
                  <path d="M 26 34 C 22 14, 78 14, 74 34 C 64 22, 36 22, 26 34 Z" />
                  {/* Jagged Bangs */}
                  <path d="M 28 34 L 36 38 L 44 32 L 50 40 L 56 32 L 64 38 L 72 34 Q 50 24 28 34 Z" />
                </g>
              )}

              {appearance.hairStyle === 'long' && (
                <g>
                  {/* Top Crown */}
                  <path d="M 26 34 C 24 16, 76 16, 74 34 C 64 22, 36 22, 26 34 Z" />
                  {/* Swept Curtain Bangs */}
                  <path d="M 26 34 Q 38 32 46 44 L 50 32 L 54 44 Q 62 32 74 34 Q 50 24 26 34 Z" />
                  {/* Front Framing Strands */}
                  <path d="M 24 34 Q 22 55 26 68 Q 30 55 28 34 Z" />
                  <path d="M 76 34 Q 78 55 74 68 Q 70 55 72 34 Z" />
                </g>
              )}

              {appearance.hairStyle === 'bob' && (
                <g>
                  {/* Sleek Bob Helmet */}
                  <path d="M 24 38 C 22 14, 78 14, 76 38 Q 78 58 74 64 L 68 44 Q 50 24 32 44 L 26 64 Q 22 58 24 38 Z" />
                  {/* Neat Straight Bangs */}
                  <path d="M 30 34 L 70 34 Q 50 24 30 34 Z" />
                </g>
              )}

              {appearance.hairStyle === 'ponytail' && (
                <g>
                  {/* Top Cap */}
                  <path d="M 26 34 C 24 16, 76 16, 74 34 C 64 22, 36 22, 26 34 Z" />
                  {/* Side Swept Bangs */}
                  <path d="M 26 34 Q 42 32 48 42 L 52 32 Q 60 38 74 34 Q 50 24 26 34 Z" />
                </g>
              )}

              {appearance.hairStyle === 'twin_tails' && (
                <g>
                  {/* Cute Top Crown */}
                  <path d="M 26 34 C 24 16, 76 16, 74 34 C 64 22, 36 22, 26 34 Z" />
                  {/* Cute Blunt Bangs */}
                  <path d="M 30 35 L 70 35 Q 50 26 30 35 Z" />
                  <path d="M 26 35 L 28 54 L 32 35 Z" />
                  <path d="M 74 35 L 72 54 L 68 35 Z" />
                </g>
              )}

              {appearance.hairStyle === 'curly' && (
                <g>
                  {/* Wavy Volume Crown */}
                  <path d="M 24 34 C 18 10, 82 10, 76 34 C 64 20, 36 20, 24 34 Z" />
                  {/* Wavy Bangs */}
                  <path d="M 28 34 Q 38 42 50 34 Q 62 42 72 34 Q 50 24 28 34 Z" />
                </g>
              )}

              {appearance.hairStyle === 'hooded' && (
                <g fill="#1E1B4B">
                  {/* Hood Enclosure */}
                  <path d="M 20 45 C 16 10, 84 10, 80 45 Q 84 70 76 74 Q 50 56 24 74 Q 16 70 20 45 Z" />
                  {/* Inner Hood Shadow */}
                  <path d="M 26 42 Q 50 22 74 42 Q 66 30 50 32 Q 34 30 26 42 Z" fill="#0F172A" />
                </g>
              )}
            </g>

            {/* 5. ACCESSORIES LAYER (On Top of Hair & Face) */}
            {appearance.accessory === 'headband' && (
              <g>
                <path d="M 26 28 L 74 28 L 72 34 L 28 34 Z" fill="#1E293B" />
                <rect x="42" y="27" width="16" height="7" rx="2" fill="#94A3B8" stroke="#64748B" strokeWidth="0.8" />
                <circle cx="50" cy="30.5" r="1.5" fill="#334155" />
              </g>
            )}

            {appearance.accessory === 'glasses' && (
              <g fill="none" stroke="#0F172A" strokeWidth="2">
                <rect x="31" y="36" width="14" height="10" rx="3" fill="#FFFFFF" fillOpacity="0.1" />
                <rect x="55" y="36" width="14" height="10" rx="3" fill="#FFFFFF" fillOpacity="0.1" />
                <line x1="45" y1="41" x2="55" y2="41" />
                <line x1="28" y1="40" x2="31" y2="40" />
                <line x1="69" y1="40" x2="72" y2="40" />
              </g>
            )}

            {appearance.accessory === 'cat_ears' && (
              <g fill={appearance.hairColor}>
                {/* Left Ear */}
                <path d="M 22 28 L 32 8 L 42 22 Z" />
                <path d="M 26 26 L 32 14 L 38 22 Z" fill="#F472B6" />
                {/* Right Ear */}
                <path d="M 78 28 L 68 8 L 58 22 Z" />
                <path d="M 74 26 L 68 14 L 62 22 Z" fill="#F472B6" />
              </g>
            )}

            {appearance.accessory === 'halo' && (
              <ellipse cx="50" cy="10" rx="22" ry="5" fill="none" stroke="#FBBF24" strokeWidth="3" opacity="0.9" />
            )}

            {appearance.accessory === 'mask' && (
              <g>
                <path d="M 32 48 L 68 48 L 64 64 L 36 64 Z" fill="#0F172A" />
                <line x1="36" y1="56" x2="64" y2="56" stroke="#06B6D4" strokeWidth="1.5" />
              </g>
            )}
          </svg>
        </div>

        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 bg-indigo-500/10 px-3.5 py-1.5 rounded-full border border-indigo-500/20 shadow-inner">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          High-Style Anime Vector Avatar
        </span>
      </div>

      {/* Controls Area */}
      <div className="flex-1 space-y-5">
        {/* Hairstyle Selector */}
        <div>
          <label className="text-xs font-extrabold text-white mb-2 flex items-center justify-between">
            <span>Hairstyle (Fitted to Head)</span>
            <span className="text-[11px] text-gray-400 font-normal">{hairStyles.find(h => h.id === appearance.hairStyle)?.label}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {hairStyles.map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => updateAttr('hairStyle', h.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  appearance.hairStyle === h.id
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Hair Color */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 block">Hair Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {hairColors.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => updateAttr('hairColor', c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    appearance.hairColor === c.hex ? 'scale-125 border-white shadow-lg ring-2 ring-indigo-500' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Skin Tone */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 block">Skin Tone</label>
            <div className="flex flex-wrap items-center gap-2">
              {skinTones.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => updateAttr('skinTone', c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    appearance.skinTone === c.hex ? 'scale-125 border-white shadow-lg ring-2 ring-indigo-500' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Eye Color */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 block">Eye Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {eyeColors.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => updateAttr('eyeColor', c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    appearance.eyeColor === c.hex ? 'scale-125 border-white shadow-lg ring-2 ring-indigo-500' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Expressions & Accessories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 block">Facial Expression</label>
            <select
              value={appearance.expression}
              onChange={e => updateAttr('expression', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {expressions.map(ex => (
                <option key={ex.id} value={ex.id} className="bg-slate-900">{ex.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 block">Head Accessory</label>
            <select
              value={appearance.accessory}
              onChange={e => updateAttr('accessory', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {accessories.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-slate-900">{acc.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Outfit & Background Scene */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 block">Outfit Style</label>
            <select
              value={appearance.outfit}
              onChange={e => updateAttr('outfit', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus-within:border-indigo-500 cursor-pointer"
            >
              {outfits.map(o => (
                <option key={o.id} value={o.id} className="bg-slate-900">{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 block">Background Scene</label>
            <select
              value={appearance.background}
              onChange={e => updateAttr('background', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus-within:border-indigo-500 cursor-pointer"
            >
              {backgrounds.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900">{b.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
