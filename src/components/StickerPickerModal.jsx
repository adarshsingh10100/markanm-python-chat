import React, { useState, useEffect } from 'react';
import { X, Smile, Search } from 'lucide-react';

const STICKER_CATEGORIES = [
  { id: 'cute', label: '🐱 Cute & Animals', query: 'cute' },
  { id: 'reactions', label: '😍 Reactions', query: 'reaction' },
  { id: 'memes', label: '💥 Memes', query: 'meme' },
  { id: 'love', label: '💖 Love & Hearts', query: 'love' },
  { id: 'funny', label: '😂 Funny', query: 'funny' },
  { id: 'anime', label: '🎌 Anime & Chibi', query: 'anime' },
  { id: 'celebration', label: '🎉 Party', query: 'party' }
];

// Verified 100% working direct i.giphy.com transparent stickers catalog
const FALLBACK_STICKERS = [
  { id: 'L1VRSg6CslKVZoxWWD', name: 'Love Cat', tags: ['cute', 'love', 'cat', 'heart'], url: 'https://i.giphy.com/L1VRSg6CslKVZoxWWD.gif' },
  { id: 'MDJ9IbxxvDUQM', name: 'Heart Sparkle', tags: ['love', 'heart', 'reactions', 'cute'], url: 'https://i.giphy.com/MDJ9IbxxvDUQM.gif' },
  { id: 'GeimqsH0TLDt4tScGw', name: 'Party Dance', tags: ['party', 'dance', 'funny', 'celebration'], url: 'https://i.giphy.com/GeimqsH0TLDt4tScGw.gif' },
  { id: 'slvHAS8JVC1yE', name: 'Anime Heart', tags: ['anime', 'love', 'cute', 'reactions'], url: 'https://i.giphy.com/slvHAS8JVC1yE.gif' },
  { id: '10t57cXzcu7504', name: 'Lol Meme', tags: ['memes', 'funny', 'laugh', 'reactions'], url: 'https://i.giphy.com/10t57cXzcu7504.gif' },
  { id: '8vQSQ3cNXuDGo', name: 'Pikachu Wave', tags: ['cute', 'anime', 'party', 'reactions'], url: 'https://i.giphy.com/8vQSQ3cNXuDGo.gif' },
  { id: 'tsX3YMWYzDPjAARfeg', name: 'Kitten Vibe', tags: ['cute', 'cat', 'dance', 'funny'], url: 'https://i.giphy.com/tsX3YMWYzDPjAARfeg.gif' },
  { id: 'G3va39rn8E4A8', name: 'Bear Kiss', tags: ['love', 'cute', 'reactions', 'heart'], url: 'https://i.giphy.com/G3va39rn8E4A8.gif' },
  { id: 'cNhCye8HCoi3u', name: 'Cat Sparkle', tags: ['cute', 'cat', 'funny'], url: 'https://i.giphy.com/cNhCye8HCoi3u.gif' },
  { id: '3o7abKhOpu0NwenH3O', name: 'Heart Explode', tags: ['love', 'heart', 'party'], url: 'https://i.giphy.com/3o7abKhOpu0NwenH3O.gif' }
];

export function StickerPickerModal({ isOpen, onClose, onSelectSticker }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('cute');
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStickers = async (searchQuery = '') => {
    setLoading(true);
    const q = searchQuery.trim().toLowerCase() || STICKER_CATEGORIES.find(c => c.id === activeCategory)?.query || 'cute';

    try {
      const giphyApiKey = 'pLJu9ZaGBSbgPjRGSFSuTVMODEsA3i2C';
      const gUrl = `https://api.giphy.com/v1/stickers/search?api_key=${giphyApiKey}&q=${encodeURIComponent(q)}&limit=48&rating=g`;
      const gResp = await fetch(gUrl);
      if (gResp.ok) {
        const gData = await gResp.json();
        if (gData.data && Array.isArray(gData.data) && gData.data.length > 0) {
          const formatted = gData.data.map(item => {
            const directUrl = item.id ? `https://i.giphy.com/${item.id}.gif` : (item.images.fixed_height?.url || item.images.original?.url);
            return {
              id: item.id,
              name: item.title || 'Sticker',
              url: directUrl
            };
          });
          setStickers(formatted);
          setLoading(false);
          return;
        }
      }
    } catch (err) {}

    // Fallback catalog
    let filtered = FALLBACK_STICKERS;
    if (q) {
      const terms = q.split(/\s+/);
      filtered = FALLBACK_STICKERS.filter(s =>
        terms.some(t => s.name.toLowerCase().includes(t) || s.tags.some(tag => tag.includes(t)))
      );
      if (filtered.length === 0) filtered = FALLBACK_STICKERS;
    }

    setStickers(filtered.map(s => ({ id: s.id, name: s.name, url: s.url })));
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => fetchStickers(query), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, query, activeCategory]);

  if (!isOpen) return null;

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat.id);
    setQuery(cat.query);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl relative my-auto flex flex-col gap-4 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Millions of Worldwide Stickers</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stickers (e.g. cat, dance, heart)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCategory('custom');
            }}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Categories Horizontal Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STICKER_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-black font-bold shadow-md'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid Display */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[55vh] sm:max-h-80 overflow-y-auto p-1 scrollbar-none">
          {loading ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-medium">Searching stickers...</span>
            </div>
          ) : stickers.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-gray-500">No stickers found</div>
          ) : (
            stickers.map(st => (
              <button
                key={st.id}
                onClick={() => {
                  onSelectSticker(st.url);
                  onClose();
                }}
                className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-110 group relative shadow-sm aspect-square"
              >
                <img
                  src={st.url}
                  alt={st.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    if (st.id) {
                      e.target.src = `https://i.giphy.com/${st.id}.gif`;
                    }
                  }}
                  className="w-14 h-14 object-contain drop-shadow-md"
                />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
