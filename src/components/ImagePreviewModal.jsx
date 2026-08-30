import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export function ImagePreviewModal({ isOpen, onClose, imageUrl }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Floating Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
        <a
          href={imageUrl}
          download="image_attachment"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-all border border-white/15"
          title="Download Image"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </a>
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-all border border-white/15"
          title="Open Original"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/15"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image */}
      <div className="max-w-5xl max-h-[88vh] p-2 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt="Full Preview"
          referrerPolicy="no-referrer"
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
        />
      </div>
    </div>
  );
}
