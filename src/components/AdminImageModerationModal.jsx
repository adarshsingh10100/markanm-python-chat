import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Check, Trash2, ShieldAlert, Filter, Loader2 } from 'lucide-react';
import { characterService } from '../services/characterService';

export function AdminImageModerationModal({ isOpen, onClose }) {
  const [images, setImages] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen, statusFilter]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await characterService.getAdminImageModeration(statusFilter);
      if (res?.success) {
        setImages(res.images || []);
      }
    } catch (err) {
      console.error('Failed to load admin images', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (imageId, newStatus, isSafe = 1) => {
    try {
      await characterService.updateAdminImageStatus(imageId, {
        moderation_status: newStatus,
        is_safe: isSafe
      });
      loadImages();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E131F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Character Image Moderation</h2>
              <p className="text-xs text-gray-400">Review, approve, and verify AI character image bank submissions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#121826] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Filter className="w-4 h-4 text-indigo-400" /> Filter:
            {['all', 'approved', 'pending', 'rejected'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                  statusFilter === st ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{images.length} items</span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No character images found matching filter "{statusFilter}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map(img => (
                <div key={img.id} className="bg-[#151B2B] border border-white/10 rounded-xl overflow-hidden flex flex-col">
                  <div className="relative aspect-square overflow-hidden bg-black/40">
                    <img src={img.image_url} alt={img.mood} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold bg-black/70 text-white rounded-md capitalize backdrop-blur-sm">
                      {img.mood}
                    </span>
                    <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize ${
                      img.moderation_status === 'approved' ? 'bg-emerald-500/80 text-white' :
                      img.moderation_status === 'rejected' ? 'bg-rose-500/80 text-white' : 'bg-amber-500/80 text-white'
                    }`}>
                      {img.moderation_status}
                    </span>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div className="flex items-center gap-2">
                      <img src={img.character_avatar} alt={img.character_name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-medium text-white truncate">{img.character_name}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleUpdateStatus(img.id, 'approved', 1)}
                        className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(img.id, 'rejected', 0)}
                        className="flex-1 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
