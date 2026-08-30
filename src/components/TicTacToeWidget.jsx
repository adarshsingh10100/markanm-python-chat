import React, { useState, useEffect } from 'react';
import { Gamepad2, Trophy, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export function TicTacToeWidget({ gameData, messageId, conversationId }) {
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

  const board = data.board || Array(9).fill(null);
  const turn = data.turn || 'X';

  const isP1 = data.p1_id ? (user?.id === data.p1_id) : true;
  const isP2 = data.p2_id ? (user?.id === data.p2_id) : (!isP1);

  // Strict Turn Verification: Player 1 (Initiator) always gets first move ('X')
  const isMyTurn = (turn === 'X' && (data.p1_id ? user?.id === data.p1_id : true)) ||
                   (turn === 'O' && (data.p2_id ? user?.id === data.p2_id : user?.id !== data.p1_id));

  const checkWinner = (b) => {
    for (let combo of WINNING_COMBOS) {
      const [a, bIdx, c] = combo;
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
        return { winner: b[a], combo };
      }
    }
    if (b.every(cell => cell !== null)) {
      return { winner: 'Draw', combo: null };
    }
    return null;
  };

  const handleCellClick = async (idx) => {
    if (board[idx] || data.winner || !isMyTurn || updating || !messageId) return;

    setUpdating(true);
    try {
      const updated = { ...data };

      if (!updated.p1_id) {
        updated.p1_id = user?.id;
        updated.p1_name = user?.display_name || user?.username || 'Initiator';
      } else if (!updated.p2_id && user?.id !== updated.p1_id) {
        updated.p2_id = user?.id;
        updated.p2_name = user?.display_name || user?.username || 'Player O';
      }

      const newBoard = [...board];
      newBoard[idx] = turn;
      updated.board = newBoard;

      const winRes = checkWinner(newBoard);
      if (winRes) {
        updated.winner = winRes.winner;
        updated.status = 'finished';
        if (winRes.winner === 'Draw') {
          updated.result_text = `🤝 Match ended in a Draw between ${updated.p1_name || 'Player X'} and ${updated.p2_name || 'Player O'}!`;
        } else {
          const winName = winRes.winner === 'X' ? (updated.p1_name || 'Player X') : (updated.p2_name || 'Player O');
          updated.result_text = `🎉 ${winName} (${winRes.winner}) won the Tic-Tac-Toe match! 🏆`;
        }
      } else {
        updated.turn = turn === 'X' ? 'O' : 'X';
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
        game_type: 'tictactoe',
        game_id: 'ttt_' + Date.now(),
        p1_id: user?.id,
        p1_name: user?.display_name || user?.username || 'Initiator',
        p2_id: null,
        p2_name: null,
        board: Array(9).fill(null),
        turn: 'X',
        status: 'playing',
        winner: null
      });
      await chatService.sendMessage(conversationId, newPayload);
    } catch (e) {
    } finally {
      setUpdating(false);
    }
  };

  const currentTurnName = turn === 'X' ? (data.p1_name || 'Initiator') : (data.p2_name || 'Player O');

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/90 to-slate-950/90 border border-indigo-500/30 shadow-xl max-w-xs w-full my-1 text-left flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-indigo-400" />
          <h4 className="text-xs sm:text-sm font-bold text-white">Tic Tac Toe Duel</h4>
        </div>
        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-500/30">
          {data.winner ? 'Finished' : `Turn: ${turn}`}
        </span>
      </div>

      {/* Players */}
      <div className="flex justify-between text-[11px] text-gray-300 px-1 font-semibold">
        <span className="text-indigo-400">❌ {data.p1_name || 'Initiator'}</span>
        <span className="text-pink-400">⭕️ {data.p2_name || 'Player O (Waiting...)'}</span>
      </div>

      {/* Turn indicator */}
      {!data.winner && (
        <p className="text-[10px] text-gray-400 text-center font-medium">
          {isMyTurn ? '👉 It is YOUR turn! Tap a cell:' : `⏳ Waiting for ${currentTurnName} (${turn})...`}
        </p>
      )}

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-black/40 rounded-2xl border border-white/10">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={!!cell || !!data.winner || !isMyTurn || updating}
            className={`h-16 rounded-xl text-2xl font-extrabold flex items-center justify-center transition-all border ${
              cell
                ? 'bg-white/10 border-white/10'
                : (isMyTurn ? 'bg-white/5 border-white/15 hover:bg-white/20 hover:border-indigo-400 cursor-pointer' : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed')
            } ${cell === 'X' ? 'text-indigo-400' : 'text-pink-400'}`}
          >
            {cell}
          </button>
        ))}
      </div>

      {data.winner && (
        <div className="flex flex-col gap-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-center flex flex-col items-center gap-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">{data.result_text}</span>
          </div>

          <button
            onClick={handlePlayAgain}
            disabled={updating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all mt-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>🔄 Play Again (New Match)</span>
          </button>
        </div>
      )}
    </div>
  );
}
