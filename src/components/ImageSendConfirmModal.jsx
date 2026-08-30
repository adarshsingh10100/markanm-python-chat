import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Image as ImageIcon, Crop, Check, RotateCcw, ZoomIn } from 'lucide-react';

export function ImageSendConfirmModal({ isOpen, onClose, file, imagePreviewUrl, onConfirmSend }) {
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  
  const [activePreviewUrl, setActivePreviewUrl] = useState(imagePreviewUrl);
  const [activeFile, setActiveFile] = useState(file);

  const [aspectRatio, setAspectRatio] = useState('free'); // 'free' | '1:1' | '16:9' | '4:5'
  const [cropScale, setCropScale] = useState(1);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    setActivePreviewUrl(imagePreviewUrl);
    setActiveFile(file);
    setIsCropping(false);
    setCaption('');
  }, [imagePreviewUrl, file, isOpen]);

  if (!isOpen || (!activeFile && !activePreviewUrl)) return null;

  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    let targetWidth = width;
    let targetHeight = height;
    let startX = 0;
    let startY = 0;

    if (aspectRatio === '1:1') {
      const minDim = Math.min(width, height);
      targetWidth = minDim;
      targetHeight = minDim;
      startX = (width - minDim) / 2;
      startY = (height - minDim) / 2;
    } else if (aspectRatio === '16:9') {
      targetWidth = width;
      targetHeight = Math.round(width * (9 / 16));
      if (targetHeight > height) {
        targetHeight = height;
        targetWidth = Math.round(height * (16 / 9));
      }
      startX = (width - targetWidth) / 2;
      startY = (height - targetHeight) / 2;
    } else if (aspectRatio === '4:5') {
      targetWidth = width;
      targetHeight = Math.round(width * (5 / 4));
      if (targetHeight > height) {
        targetHeight = height;
        targetWidth = Math.round(height * (4 / 5));
      }
      startX = (width - targetWidth) / 2;
      startY = (height - targetHeight) / 2;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      img,
      startX, startY, targetWidth, targetHeight,
      0, 0, targetWidth, targetHeight
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], activeFile?.name || 'cropped_image.png', { type: 'image/png' });
        const croppedDataUrl = canvas.toDataURL('image/png');
        setActiveFile(croppedFile);
        setActivePreviewUrl(croppedDataUrl);
        setIsCropping(false);
      }
    }, 'image/png');
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await onConfirmSend(activeFile, activePreviewUrl, caption);
      onClose();
    } catch (e) {
    } finally {
      setSending(false);
    }
  };

  const fileSizeMB = activeFile ? (activeFile.size / (1024 * 1024)).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isCropping ? 'Crop Image' : 'Send Image Preview'}
              </h3>
              <p className="text-[11px] text-gray-400 font-mono">
                {activeFile ? `${activeFile.name} • ${fileSizeMB} MB` : 'Pasted Image'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCropping && (
              <button
                type="button"
                onClick={() => setIsCropping(true)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-white/10"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Crop</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Preview & Crop Canvas */}
        <div className="w-full bg-black/60 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center min-h-[230px] max-h-[350px] relative p-2">
          {isCropping ? (
            <div className="flex flex-col items-center gap-3 w-full h-full">
              <img
                ref={imgRef}
                src={activePreviewUrl}
                alt="Crop Target"
                className="max-w-full max-h-[250px] object-contain rounded-xl border border-indigo-500/40"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('free')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${aspectRatio === 'free' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${aspectRatio === '1:1' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  1:1 Square
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  16:9 Wide
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('4:5')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${aspectRatio === '4:5' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  4:5 Portrait
                </button>
              </div>
            </div>
          ) : (
            <img
              src={activePreviewUrl}
              alt="Staged Preview"
              className="max-w-full max-h-[330px] object-contain rounded-xl"
            />
          )}
        </div>

        {/* Caption Input or Crop Controls */}
        {isCropping ? (
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsCropping(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-bold"
            >
              Cancel Crop
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Apply Crop</span>
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Add a caption... (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>Discard</span>
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={handleSend}
                className="btn-gradient px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Uploading...' : 'Send Image'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
