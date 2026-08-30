import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles } from 'lucide-react';

const CATEGORY_CHIPS = [
  { id: 'trending', label: '🔥 Trending', query: '' },
  { id: 'funny', label: '😂 Funny', query: 'funny' },
  { id: 'love', label: '❤️ Love', query: 'love' },
  { id: 'anime', label: '🎌 Anime', query: 'anime' },
  { id: 'cats', label: '🐱 Cats', query: 'cat' },
  { id: 'dance', label: '💃 Dance', query: 'dance' },
  { id: 'memes', label: '💥 Memes', query: 'meme' },
  { id: 'reaction', label: '😱 Reaction', query: 'reaction' },
  { id: 'applause', label: '👏 Bravo', query: 'applause' }
];

// Verified 100% working direct i.giphy.com CDN links (never blocked by referrer rules)
const FALLBACK_GIFS = [
  { id: 'L1VRSg6CslKVZoxWWD', title: 'Love Heart Cat', tags: ['love', 'cute', 'cat', 'heart'], url: 'https://i.giphy.com/L1VRSg6CslKVZoxWWD.gif' },
  { id: 'MDJ9IbxxvDUQM', title: 'Heart Hug', tags: ['love', 'cute', 'hug', 'heart'], url: 'https://i.giphy.com/MDJ9IbxxvDUQM.gif' },
  { id: 'GeimqsH0TLDt4tScGw', title: 'Funny Dance Cat', tags: ['dance', 'funny', 'cat', 'trending'], url: 'https://i.giphy.com/GeimqsH0TLDt4tScGw.gif' },
  { id: 'slvHAS8JVC1yE', title: 'Anime Excited', tags: ['anime', 'excited', 'reaction', 'trending'], url: 'https://i.giphy.com/slvHAS8JVC1yE.gif' },
  { id: '10t57cXzcu7504', title: 'Laughing Dog', tags: ['funny', 'laugh', 'dog', 'meme'], url: 'https://i.giphy.com/10t57cXzcu7504.gif' },
  { id: '26ufdipQqU2lhNA4g', title: 'Mind Blown', tags: ['reaction', 'meme', 'mind blown', 'trending'], url: 'https://i.giphy.com/26ufdipQqU2lhNA4g.gif' },
  { id: 'Swx36yLm2k434Cw73q', title: 'Clapping Bravo', tags: ['applause', 'bravo', 'clapping', 'reaction'], url: 'https://i.giphy.com/Swx36yLm2k434Cw73q.gif' },
  { id: 'blSTtZehjAZ8I', title: 'Party Dance', tags: ['dance', 'party', 'funny', 'trending'], url: 'https://i.giphy.com/blSTtZehjAZ8I.gif' },
  { id: 'vfkqJ4m6C0E4U', title: 'Love Bear Hug', tags: ['love', 'cute', 'bear', 'hug'], url: 'https://i.giphy.com/vfkqJ4m6C0E4U.gif' },
  { id: '8vQSQ3cNXuDGo', title: 'Anime Wow', tags: ['anime', 'wow', 'reaction', 'love'], url: 'https://i.giphy.com/8vQSQ3cNXuDGo.gif' },
  { id: 'tsX3YMWYzDPjAARfeg', title: 'Cat Vibe', tags: ['cat', 'vibing', 'dance', 'funny'], url: 'https://i.giphy.com/tsX3YMWYzDPjAARfeg.gif' },
  { id: 'G3va39rn8E4A8', title: 'Cute Kiss', tags: ['love', 'kiss', 'cute', 'heart'], url: 'https://i.giphy.com/G3va39rn8E4A8.gif' },
  { id: 'cNhCye8HCoi3u', title: 'Happy Cat', tags: ['cats', 'happy', 'cute'], url: 'https://i.giphy.com/cNhCye8HCoi3u.gif' },
  { id: 'n5VaQoW39ZwxO', title: 'Dancing Baby', tags: ['dance', 'funny', 'party'], url: 'https://i.giphy.com/n5VaQoW39ZwxO.gif' },
  { id: 'l4KibWpBGWG90JwCI', title: 'Meme Cat Wave', tags: ['memes', 'cat', 'funny'], url: 'https://i.giphy.com/l4KibWpBGWG90JwCI.gif' },
  { id: '3o7abKhOpu0NwenH3O', title: 'Heart Boom', tags: ['love', 'heart', 'reaction'], url: 'https://i.giphy.com/3o7abKhOpu0NwenH3O.gif' }
];

export function GifPickerModal({ isOpen, onClose, onSelectGif }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('trending');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = async (searchQuery = '') => {
    setLoading(true);
    const q = searchQuery.trim().toLowerCase();

    try {
      const giphyApiKey = 'pLJu9ZaGBSbgPjRGSFSuTVMODEsA3i2C';
      const giphyUrl = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(q)}&limit=48&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=48&rating=g`;

      const gResp = await fetch(giphyUrl);
      if (gResp.ok) {
        const gData = await gResp.json();
        if (gData.data && Array.isArray(gData.data) && gData.data.length > 0) {
          const formatted = gData.data.map(item => {
            // Convert to direct i.giphy.com URL to bypass domain referrer blocking
            const directUrl = item.id ? `https://i.giphy.com/${item.id}.gif` : (item.images.original?.url || item.images.fixed_height?.url);
            return {
              id: item.id,
              title: item.title || 'GIF',
              url: directUrl,
              preview: directUrl
            };
          });
          setGifs(formatted);
          setLoading(false);
          return;
        }
      }
    } catch (err) {}

    // Fallback: Filter catalog with i.giphy.com URLs
    let filtered = FALLBACK_GIFS;
    if (q) {
      const terms = q.split(/\s+/);
      filtered = FALLBACK_GIFS.filter(g =>
        terms.some(t => g.title.toLowerCase().includes(t) || g.tags.some(tag => tag.includes(t)))
      );
      if (filtered.length === 0) {
        filtered = FALLBACK_GIFS;
      }
    }

    setGifs(filtered.map(g => ({ id: g.id, title: g.title, url: g.url, preview: g.url })));
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => fetchGifs(query), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, query]);

  if (!isOpen) return null;

  const handleCategoryClick = (chip) => {
    setActiveCategory(chip.id);
    setQuery(chip.query);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl relative my-auto flex flex-col gap-4 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Millions of Worldwide GIFs</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search millions of GIFs (e.g. happy, cat, dance)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCategory('custom');
            }}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_CHIPS.map(chip => (
            <button
              key={chip.id}
              onClick={() => handleCategoryClick(chip)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeCategory === chip.id
                  ? 'bg-indigo-600 text-white font-bold shadow-md'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* GIFs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 overflow-y-auto max-h-[55vh] sm:max-h-96 pr-1 scrollbar-none">
          {loading ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-medium">Searching GIFs...</span>
            </div>
          ) : gifs.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-gray-500">No GIFs found for "{query}"</div>
          ) : (
            gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => {
                  onSelectGif(gif.url);
                  onClose();
                }}
                className="group relative rounded-2xl overflow-hidden aspect-square border border-white/10 hover:border-indigo-500 transition-all hover:scale-105 bg-black/40 shadow-sm"
              >
                <img
                  src={gif.preview || gif.url}
                  alt={gif.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    if (gif.id) {
                      e.target.src = `https://i.giphy.com/${gif.id}.gif`;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[11px] font-extrabold text-white">
                  Send GIF
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
