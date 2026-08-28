import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Flame, Tag, ShieldCheck } from 'lucide-react';
import { Avatar } from './Avatar';

export function RoomCard({ room, onJoin }) {
  if (!room) return null;

  const isLive = room.status === 'live';

  return (
    <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between gap-3 hover:border-indigo-500/40 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-500/30 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-800 px-2.5 py-0.5 rounded-full">
              ENDED
            </span>
          )}

          {room.category_name && (
            <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-500/25 px-2.5 py-0.5 rounded-full">
              {room.category_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          <Users className="w-3 h-3" />
          <span>{room.active_participants_count} talking</span>
        </div>
      </div>

      {/* Room Title & Description */}
      <div>
        <Link to={`/room/${room.code}`} className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
          {room.title}
        </Link>
        {room.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {room.description}
          </p>
        )}
      </div>

      {/* Tags Row */}
      {Array.isArray(room.tags) && room.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-1">
          {room.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-[10px] font-semibold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-500/20">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Info & Join Button */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-1">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar src={room.creator?.avatar_url} name={room.creator?.display_name} size="xs" />
          <span className="text-[11px] font-semibold text-gray-300 truncate">
            @{room.creator?.username}
          </span>
        </div>

        <Link
          to={`/room/${room.code}`}
          className="btn-gradient px-4 py-1.5 rounded-xl text-xs font-bold shadow-md hover:scale-105 transition-transform"
        >
          Join
        </Link>
      </div>
    </div>
  );
}
