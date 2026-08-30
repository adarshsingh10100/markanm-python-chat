import React, { useState, useEffect } from 'react';
import { Heart, Brain, Trophy, CheckCircle2, RefreshCw, XCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';

export function CompatQuizWidget({ gameData, messageId, conversationId }) {
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

  if (!data || !data.questions) return null;

  const isQuiz = data.game_type === 'quiz_test' || data.game_type === 'quiz';
  const questions = data.questions || [];

  // Determine player slot
  const isP1 = data.p1_id ? (user?.id === data.p1_id) : true;
  const mySlot = isP1 ? 'p1' : 'p2';
  const oppSlot = isP1 ? 'p2' : 'p1';

  const myAnswers = data[`${mySlot}_answers`] || {};
  const oppAnswers = data[`${oppSlot}_answers`] || {};

  const p1Answers = data.p1_answers || {};
  const p2Answers = data.p2_answers || {};

  const myCount = Object.keys(myAnswers).length;
  const oppCount = Object.keys(oppAnswers).length;

  const p1Count = Object.keys(p1Answers).length;
  const p2Count = Object.keys(p2Answers).length;

  const totalQs = questions.length;
  const myCurrentQIdx = Math.min(myCount, totalQs - 1);

  const myFinished = myCount >= totalQs;
  const oppFinished = oppCount >= totalQs;
  const allFinished = p1Count >= totalQs && p2Count >= totalQs;

  const p1Name = data.p1_name || 'Player 1';
  const p2Name = data.p2_name || 'Player 2';

  const handleSelectOption = async (optionText, optIdx) => {
    if (updating || myFinished || !messageId) return;

    setUpdating(true);
    try {
      const updated = { ...data };

      if (isP1) {
        if (!updated.p1_id) updated.p1_id = user?.id;
        if (!updated.p1_name) updated.p1_name = user?.display_name || user?.username || 'Player 1';
        if (!updated.p1_answers) updated.p1_answers = {};
        updated.p1_answers[String(myCurrentQIdx)] = optionText;
      } else {
        if (!updated.p2_id) updated.p2_id = user?.id;
        if (!updated.p2_name) updated.p2_name = user?.display_name || user?.username || 'Player 2';
        if (!updated.p2_answers) updated.p2_answers = {};
        updated.p2_answers[String(myCurrentQIdx)] = optionText;
      }

      const p1Done = Object.keys(updated.p1_answers || {}).length >= totalQs;
      const p2Done = Object.keys(updated.p2_answers || {}).length >= totalQs;

      if (p1Done && p2Done) {
        updated.status = 'completed';
        if (!isQuiz) {
          let matches = 0;
          for (let i = 0; i < totalQs; i++) {
            if (updated.p1_answers[String(i)] === updated.p2_answers[String(i)]) {
              matches++;
            }
          }
          const scorePct = Math.round((matches / totalQs) * 100);
          updated.compat_score = scorePct;
          updated.result_text = `💖 Compatibility Result between ${updated.p1_name} & ${updated.p2_name}: ${scorePct}% Match! (${matches}/${totalQs} identical choices)`;
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
        game_type: data.game_type,
        game_id: (isQuiz ? 'quiz_' : 'compat_') + Date.now(),
        test_mode: data.test_mode || 'friends',
        questions: questions,
        p1_id: user?.id,
        p1_name: user?.display_name || user?.username || 'Player 1',
        p1_answers: {},
        p2_id: null,
        p2_name: null,
        p2_answers: {},
        status: 'in_progress'
      });
      await chatService.sendMessage(conversationId, newPayload);
    } catch (e) {
    } finally {
      setUpdating(false);
    }
  };

  const currentQ = questions[myCurrentQIdx];

  return (
    <div className={`p-4 rounded-2xl border shadow-xl max-w-sm w-full my-1 text-left flex flex-col gap-3 ${
      isQuiz
        ? 'bg-gradient-to-br from-indigo-950/90 to-blue-950/90 border-indigo-500/30'
        : 'bg-gradient-to-br from-pink-950/90 to-purple-950/90 border-pink-500/30'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          {isQuiz ? <Brain className="w-5 h-5 text-indigo-400" /> : <Heart className="w-5 h-5 text-pink-400" />}
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
            {isQuiz ? '🧠 Quiz Challenge' : '💖 Compatibility Test'}
          </h4>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[9px] font-extrabold uppercase">
          {allFinished ? 'Completed' : 'Live Match'}
        </span>
      </div>

      {/* Status Bar */}
      <div className="flex justify-between text-[11px] text-gray-300 px-1 font-semibold">
        <span>👤 {p1Name}: {p1Count}/{totalQs}</span>
        <span>👥 {p2Name}: {p2Count}/{totalQs}</span>
      </div>

      {/* Game Content */}
      {allFinished ? (
        <div className="flex flex-col gap-3">
          <div className="p-3.5 rounded-xl bg-white/10 border border-white/20 text-center flex flex-col items-center gap-1.5">
            <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            <h5 className="text-sm font-extrabold text-white">
              {isQuiz ? 'Both Players Finished!' : `${data.compat_score ?? 100}% Match!`}
            </h5>
            <p className="text-xs text-gray-200">{data.result_text || 'Great job answering together!'}</p>
          </div>

          {/* Reveal detailed answer breakdown */}
          <div className="flex flex-col gap-2">
            <h6 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider px-1">Answer Breakdown:</h6>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {questions.map((q, i) => {
                const ans1 = p1Answers[String(i)] || 'No answer';
                const ans2 = p2Answers[String(i)] || 'No answer';
                const isMatch = ans1 === ans2;

                return (
                  <div key={i} className={`p-2.5 rounded-xl border flex flex-col gap-1.5 text-xs ${
                    isMatch ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-white/5 border-white/10'
                  }`}>
                    <span className="font-bold text-white text-[11px]">Q{i + 1}: {q.q}</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                        <span className="text-gray-400 font-bold truncate">{p1Name}</span>
                        <span className="text-indigo-300 font-medium truncate">{ans1}</span>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                        <span className="text-gray-400 font-bold truncate">{p2Name}</span>
                        <span className="text-pink-300 font-medium truncate">{ans2}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-extrabold pt-0.5">
                      <span className={isMatch ? 'text-emerald-400' : 'text-amber-400'}>
                        {isMatch ? '✨ Identical Choice!' : '❌ Different Choice'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Play Again Button */}
          <button
            onClick={handlePlayAgain}
            disabled={updating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all mt-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>🔄 Play Again (New Match)</span>
          </button>
        </div>
      ) : !myFinished && currentQ ? (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-gray-400 block mb-1">
              Question {myCurrentQIdx + 1} of {totalQs}:
            </span>
            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">{currentQ.q}</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {currentQ.opts.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectOption(opt, i)}
                disabled={updating}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/40 hover:bg-white/15 text-left text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="font-bold mr-2 text-indigo-300">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-gray-300 flex flex-col items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-white">You completed all questions! 🎉</span>
          <span className="text-[11px] text-gray-400">Waiting for partner ({isP1 ? p2Name : p1Name}) to finish...</span>
        </div>
      )}
    </div>
  );
}
