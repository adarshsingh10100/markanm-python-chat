import React, { useState, useEffect } from 'react';
import { Trophy, Swords, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';

const TOOLS = [
  { id: 'rock', name: 'Rock', emoji: '🗿', beats: 'scissors' },
  { id: 'paper', name: 'Paper', emoji: '📄', beats: 'rock' },
  { id: 'scissors', name: 'Scissors', emoji: '✂️', beats: 'paper' }
];

export function RpsWidget({ gameData, messageId, conversationId }) {
  const { user } = useAuth();
  const [data, setData] = useState(() => {
    if (typeof gameData === 'string') {
      try { return JSON.parse(gameData); } catch { return null; }
    }
    return gameData;
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (typeof gameData === 'string') {
      try { setData(JSON.parse(gameData)); } catch {}
    } else if (gameData) {
      setData(gameData);
    }
  }, [gameData]);

  if (!data) return null;

  const isP1 = data.p1_id ? (user?.id === data.p1_id) : true;
  const isP2 = data.p1_id && user?.id !== data.p1_id;

  // Strict Turn Order: Player 1 (Initiator) MUST move first!
  const p1HasMoved = Boolean(data.p1_move);
  const p2HasMoved = Boolean(data.p2_move);

  const canP1Move = isP1 && !p1HasMoved;
  const canP2Move = isP2 && p1HasMoved && !p2HasMoved;

  const isFinished = data.status === 'p1_win' || data.status === 'p2_win' || data.status === 'draw';

  const handlePickMove = async (moveId) => {
    if (updating || !messageId || isFinished) return;
    if (isP1 && !canP1Move) return;
    if (isP2 && !canP2Move) return;

    setUpdating(true);
    try {
      const updated = { ...data };

      if (isP1) {
        if (!updated.p1_id) updated.p1_id = user?.id;
        if (!updated.p1_name) updated.p1_name = user?.display_name || user?.username || 'Initiator';
        updated.p1_move = moveId;
      } else {
        if (!updated.p2_id) updated.p2_id = user?.id;
        if (!updated.p2_name) updated.p2_name = user?.display_name || user?.username || 'Opponent';
        updated.p2_move = moveId;
      }

      // Both players locked in -> compute winner
      if (updated.p1_move && updated.p2_move) {
        const m1 = TOOLS.find(t => t.id === updated.p1_move);
        const m2 = TOOLS.find(t => t.id === updated.p2_move);

        if (updated.p1_move === updated.p2_move) {
          updated.status = 'draw';
          updated.result_text = `🤝 It's a Tie! Both ${updated.p1_name} & ${updated.p2_name} chose ${m1.emoji} ${m1.name}!`;
        } else if (m1.beats === updated.p2_move) {
          updated.status = 'p1_win';
          updated.result_text = `🎉 ${updated.p1_name} (${m1.emoji} ${m1.name}) defeated ${updated.p2_name} (${m2.emoji} ${m2.name})!`;
        } else {
          updated.status = 'p2_win';
          updated.result_text = `🎉 ${updated.p2_name} (${m2.emoji} ${m2.name}) defeated ${updated.p1_name} (${m1.emoji} ${m1.name})!`;
        }
      }

      setData(updated);
      await chatService.editMessage(messageId, JSON.stringify(updated), true);
    } catch (e) {
    } finally {
      setUpdating(false);
    }
  };

  const handlePlayAgain = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      const newPayload = JSON.stringify({
        game_type: 'rps',
        game_id: 'rps_' + Date.now(),
        p1_id: user?.id,
        p1_name: user?.display_name || user?.username || 'Initiator',
        p1_move: null,
        p2_id: null,
        p2_name: null,
        p2_move: null,
        status: 'waiting'
      });
      await chatService.sendMessage(conversationId, newPayload);
    } catch (e) {
    } finally {
      setUpdating(false);
    }
  };

  const p1Tool = TOOLS.find(t => t.id === data.p1_move);
  const p2Tool = TOOLS.find(t => t.id === data.p2_move);

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/90 to-purple-950/90 border border-amber-500/30 shadow-xl max-w-sm w-full my-1 text-left flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-400 animate-pulse" />
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Rock Paper Scissors Duel</h4>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-extrabold uppercase">
          {isFinished ? 'Finished' : 'Live Match'}
        </span>
      </div>

      {/* Players status */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400 font-bold truncate">{data.p1_name || 'Initiator'} (P1)</span>
          <span className="text-base sm:text-lg font-bold">
            {isFinished ? (p1Tool?.emoji + ' ' + p1Tool?.name) : (p1HasMoved ? '🔒 Locked' : '⌛ Your Turn...')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400 font-bold truncate">{data.p2_name || 'Opponent'} (P2)</span>
          <span className="text-base sm:text-lg font-bold">
            {isFinished ? (p2Tool?.emoji + ' ' + p2Tool?.name) : (p2HasMoved ? '🔒 Locked' : (p1HasMoved ? '⌛ Thinking...' : '⏸ Waiting P1'))}
          </span>
        </div>
      </div>

      {/* Controls or Result */}
      {isFinished ? (
        <div className="flex flex-col gap-2">
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center flex flex-col items-center gap-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <p className="text-xs font-bold text-white leading-relaxed">{data.result_text}</p>
          </div>

          <button
            onClick={handlePlayAgain}
            disabled={updating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all mt-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>🔄 Play Again (New Duel)</span>
          </button>
        </div>
      ) : (canP1Move || canP2Move) ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-amber-300 font-semibold">
            {canP1Move ? '👉 Initiator Turn: Select your tool first:' : '👉 Your Turn: Select your tool:'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => handlePickMove(t.id)}
                disabled={updating}
                className="p-2.5 rounded-xl bg-white/10 border border-white/15 hover:border-amber-400 hover:bg-amber-500/20 text-white font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[10px]">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-amber-200">
          {!p1HasMoved
            ? `⌛ Waiting for ${data.p1_name || 'Initiator'} to make the first move...`
            : `⚡ Move locked in! Waiting for opponent...`}
        </div>
      )}
    </div>
  );
}
