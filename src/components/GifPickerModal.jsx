import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { request } from '../services/api';

export function GifPickerModal({ isOpen, onClose, onSelectGif }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = async (searchQuery = '') => {
    setLoading(true);
    const q = searchQuery.trim();
    const apiKey = 'dc6zaTOxFJmzC'; // GIPHY Public Beta Key

    let clientUrl = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=30`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=30`;

    try {
      // 1. Try Direct Worldwide GIPHY API Call (Ultra-fast)
      const resp = await fetch(clientUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const formatted = data.data.map(item => ({
            id: item.id,
            title: item.title || 'GIF',
            url: item.images.original.url || item.images.fixed_height.url,
            preview: item.images.fixed_height.url || item.images.original.url
          }));
          setGifs(formatted);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      // Fall through to backend proxy fallback
    }

    // 2. Proxy Fallback via PHP backend
    try {
      const res = await request(`/gifs/search?q=${encodeURIComponent(q)}`, { method: 'GET' });
      setGifs(res.gifs || []);
    } catch (e) {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => fetchGifs(query), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Worldwide GIFs (GIPHY API)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative my-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search millions of worldwide GIFs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* GIFs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="col-span-full p-8 text-center text-xs text-gray-400">Loading GIFs...</div>
          ) : gifs.length === 0 ? (
            <div className="col-span-full p-8 text-center text-xs text-gray-500">No GIFs found</div>
          ) : (
            gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => {
                  onSelectGif(gif.url);
                  onClose();
                }}
                className="group relative rounded-xl overflow-hidden aspect-video border border-white/10 hover:border-indigo-500 transition-all hover:scale-105 bg-black/40"
              >
                <img src={gif.preview || gif.url} alt={gif.title} className="w-full h-full object-cover" />
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
                  Send GIF
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
