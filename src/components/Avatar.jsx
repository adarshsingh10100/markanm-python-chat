import React from 'react';

export function Avatar({ src, name, size = 'md', presence = null, className = '' }) {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
    '3xl': 'w-32 h-32 text-3xl'
  };

  const statusSize = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5',
    '3xl': 'w-6 h-6'
  };

  // Generate Reddit-style robotic avatar if no custom image is uploaded
  const botttsRobotUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'MarkanMUser')}`;
  const avatarSrc = src && src.trim() !== '' ? src : botttsRobotUrl;

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <img
        src={avatarSrc}
        alt={name || 'User avatar'}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = botttsRobotUrl;
        }}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-indigo-500/30 bg-[#151A24] p-0.5 shadow-md transition-transform hover:scale-105`}
      />

      {presence && presence !== 'offline' && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-[#0B0E14] ${statusSize[size]} ${
            presence === 'online' ? 'bg-emerald-500 animate-pulse-glow' : 'bg-amber-500'
          }`}
          title={presence}
        />
      )}
    </div>
  );
}
