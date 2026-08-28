import React, { useState, useEffect } from 'react';
import { X, Smile, Search, Sparkles } from 'lucide-react';
import { request } from '../services/api';

export function StickerPickerModal({ isOpen, onClose, onSelectSticker }) {
  const [query, setQuery] = useState('');
  const [packs, setPacks] = useState([]);
  const [selectedPackId, setSelectedPackId] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      request('/stickers', { method: 'GET' })
        .then(res => setPacks(res.packs || []))
        .catch(() => setPacks([]));
    }
  }, [isOpen]);

  const fetchStickers = async (searchQuery) => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const apiKey = 'dc6zaTOxFJmzC';
    const clientUrl = `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=30`;

    try {
      const resp = await fetch(clientUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const formatted = data.data.map(item => ({
            id: item.id,
            name: item.title || 'Sticker',
            url: item.images.fixed_height.url || item.images.original.url
          }));
          setSearchResults(formatted);
          setLoading(false);
          return;
        }
      }
    } catch (err) {}

    // Fallback proxy
    try {
      const res = await request(`/stickers/search?q=${encodeURIComponent(q)}`, { method: 'GET' });
      setSearchResults(res.stickers || []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => fetchStickers(query), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, query]);

  if (!isOpen) return null;

  const currentPack = packs.find(p => p.id === selectedPackId) || packs[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Worldwide Stickers</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Worldwide Stickers */}
        <div className="relative my-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search worldwide stickers (e.g. cat, dance)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Packs Tabs (only if not searching) */}
        {!query.trim() && (
          <div className="flex items-center gap-2 overflow-x-auto my-2 pb-1 border-b border-white/5 scrollbar-none">
            {packs.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPackId(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition-all ${
                  selectedPackId === p.id ? 'bg-amber-600 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Grid Display */}
        <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2">
          {query.trim() ? (
            loading ? (
              <div className="col-span-full text-center text-xs text-gray-400 py-8">Searching Worldwide Stickers...</div>
            ) : searchResults.length === 0 ? (
              <div className="col-span-full text-center text-xs text-gray-500 py-8">No stickers found</div>
            ) : (
              searchResults.map(st => (
                <button
                  key={st.id}
                  onClick={() => {
                    onSelectSticker(st.url);
                    onClose();
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-center gap-1 transition-transform hover:scale-110"
                >
                  <img src={st.url} alt={st.name} className="w-12 h-12 object-contain" />
                </button>
              ))
            )
          ) : (
            currentPack?.stickers?.map(st => (
              <button
                key={st.id}
                onClick={() => {
                  onSelectSticker(st.url);
                  onClose();
                }}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <img src={st.url} alt={st.name} className="w-10 h-10 object-contain" />
                <span className="text-[9px] font-semibold text-gray-400 truncate w-full text-center">{st.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
