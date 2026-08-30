import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Trophy, Heart, Brain, Plus, Trash2, CheckCircle2, Sparkles, Upload, FileText, Swords, Gamepad2, Save, FolderOpen, Loader2 } from 'lucide-react';
import { request } from '../services/api';
import { useToast } from '../context/ToastContext';

export function InlineGameModal({ isOpen, onClose, onSendMessage, conversationId, mode = 'compatibility' }) {
  const { addToast } = useToast();

  // Navigation mode
  const [gameMode, setGameMode] = useState('menu'); // menu | compat | quiz | custom-builder | custom-quiz | saved-packs
  const [compatMode, setCompatMode] = useState('friends'); // friends | partner
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loadingQs, setLoadingQs] = useState(false);

  // Custom Quiz Builder State
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('General');
  const [customQs, setCustomQs] = useState([
    { q: '', opts: ['', '', '', ''], correct: 0 }
  ]);
  const [savingPack, setSavingPack] = useState(false);

  // Saved Custom Question Packs from Database
  const [savedPacks, setSavedPacks] = useState([]);
  const [loadingPacks, setLoadingPacks] = useState(false);

  const fileInputRef = useRef(null);
  const sentRef = useRef(new Set());

  useEffect(() => {
    if (!isOpen) {
      setGameMode('menu');
      setQuestions([]);
      setCurrentIdx(0);
      setScore(0);
      setFinished(false);
      sentRef.current = new Set();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Database-Backed Question Fetcher (No repeats across devices) ─────────
  const fetchDbQuestions = async (slug, category, count) => {
    try {
      let url = `/experiences/questions?game_slug=${slug}&category=${category}&conversation_id=${conversationId || 0}`;
      const res = await request(url);
      const fetched = (res.questions || []).map(q => ({
        id: q.id,
        q: q.question_text,
        opts: q.options || [],
        correct: q.correct_index ?? 0
      }));

      if (fetched.length > 0) {
        return fetched.slice(0, count);
      }
    } catch (e) {}
    return null;
  };

  // ─── Start Compatibility Test ─────────────────────────────────────────────
  const startCompat = async () => {
    setLoadingQs(true);
    try {
      const cat = compatMode === 'partner' ? 'Love' : 'Lifestyle';
      let qs = await fetchDbQuestions('compatibility-test', cat, questionCount);

      if (!qs || qs.length === 0) {
        const fallbackLove = [
          { id: 101, q: 'What makes you feel most loved by someone?', opts: ['Words of affirmation & sweet compliments', 'Quality uninterrupted time together', 'Thoughtful gestures & helpful support', 'Surprises & meaningful gifts'] },
          { id: 102, q: 'What is most important in a long-term romantic relationship?', opts: ['Trust & absolute honesty', 'Deep emotional communication', 'Shared life goals & values', 'Spark, chemistry & passion'] },
          { id: 103, q: 'How often do you ideally like to spend time with your partner?', opts: ['Almost every single day', 'A few times a week', 'Mostly weekends', 'A healthy mix of together and alone time'] },
          { id: 104, q: 'How do you prefer your partner to apologize after an argument?', opts: ['Say sorry directly & sincerely', 'Explain what happened & talk it out', 'Show change through actions', 'Give me space to cool down first'] },
          { id: 105, q: 'What kind of date sounds most ideal to you?', opts: ['Fancy dinner at a nice restaurant', 'Cozy movie night & cooking at home', 'Outdoor adventure or traveling', 'Simple walk and deep conversation'] },
        ];
        const fallbackFriends = [
          { id: 201, q: 'What is the best way to spend a hangout weekend?', opts: ['Road trip or outdoor trip', 'Chill movie/gaming night at home', 'Exploring food spots & cafes', 'Attending concerts or events'] },
          { id: 202, q: 'How quickly do you reply to group messages?', opts: ['Immediately within minutes', 'Within a few hours', 'Whenever I am free', 'Only when directly tagged'] },
          { id: 203, q: 'What describes your personality in a friend group?', opts: ['The Planner & organizer', 'The Funny spontaneous one', 'The Listener & advisor', 'The Chill go-with-the-flow one'] },
          { id: 204, q: 'What type of humor do you connect with most?', opts: ['Witty & sarcastic banter', 'Silly & lighthearted humor', 'Dry & observational', 'Dark humor & memes'] },
          { id: 205, q: 'How do you handle last-minute spontaneous plans?', opts: ['Love it! Ready in 5 minutes!', 'Need a bit of advance notice', 'Prefer planned schedules', 'Depends on my mood & energy'] },
        ];
        qs = (compatMode === 'partner' ? fallbackLove : fallbackFriends).slice(0, questionCount);
      }

      const payload = JSON.stringify({
        game_type: 'compat_test',
        game_id: 'compat_' + Date.now(),
        test_mode: compatMode,
        questions: qs,
        p1_id: null,
        p1_name: null,
        p1_answers: {},
        p2_id: null,
        p2_name: null,
        p2_answers: {},
        status: 'in_progress'
      });

      onSendMessage(payload);
      addToast('Compatibility Test card posted to chat! Both players can answer together.', 'success');
      onClose();
    } catch {
      addToast('Failed to start compatibility test', 'error');
    } finally {
      setLoadingQs(false);
    }
  };

  // ─── Start Quiz Challenge ────────────────────────────────────────────────
  const startQuiz = async () => {
    setLoadingQs(true);
    try {
      let qs = await fetchDbQuestions('quiz', 'All', questionCount);

      if (!qs || qs.length === 0) {
        qs = [
          { id: 9001, q: 'Which planet is known as the Red Planet?', opts: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correct: 0 },
          { id: 9002, q: 'What is the capital city of Japan?', opts: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], correct: 2 },
          { id: 9003, q: 'How many sides does a hexagon have?', opts: ['5', '6', '7', '8'], correct: 1 },
          { id: 9004, q: 'Who wrote Romeo and Juliet?', opts: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], correct: 1 },
          { id: 9005, q: 'What is the chemical symbol for Gold?', opts: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 }
        ].slice(0, questionCount);
      }

      const payload = JSON.stringify({
        game_type: 'quiz_test',
        game_id: 'quiz_' + Date.now(),
        questions: qs,
        p1_id: null,
        p1_name: null,
        p1_answers: {},
        p2_id: null,
        p2_name: null,
        p2_answers: {},
        status: 'in_progress'
      });

      onSendMessage(payload);
      addToast('Quiz Challenge posted to chat! Both players can answer together.', 'success');
      onClose();
    } catch {
      addToast('Failed to start quiz', 'error');
    } finally {
      setLoadingQs(false);
    }
  };

  // ─── Answer Handler ───────────────────────────────────────────────────────
  const handleCompatAnswer = (optionText, qIdx) => {
    if (sentRef.current.has(qIdx)) return;
    sentRef.current.add(qIdx);

    const q = questions[qIdx];
    onSendMessage(`💡 Compatibility Q${qIdx + 1} (qid:${q.id}): "${q.q}"\n➡️ My answer: "${optionText}"`);

    if (qIdx + 1 < questions.length) {
      setCurrentIdx(qIdx + 1);
    } else {
      setFinished(true);
      onSendMessage(`✅ Compatibility Test Complete! All ${questions.length} answers are above. What did you pick? 🤔`);
    }
  };

  const handleQuizAnswer = (optIdx, qIdx) => {
    if (sentRef.current.has(qIdx)) return;
    sentRef.current.add(qIdx);

    const q = questions[qIdx];
    const isCorrect = optIdx === (q.correct ?? 0);
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);

    const optText = q.opts[optIdx];
    const correctText = q.opts[q.correct ?? 0];
    const resultEmoji = isCorrect ? '✅' : '❌';

    onSendMessage(`${resultEmoji} Quiz Q${qIdx + 1} (qid:${q.id}): "${q.q}"\nI chose: "${optText}"${!isCorrect ? `\n(Correct answer: "${correctText}")` : ' — Correct!'}`);

    if (qIdx + 1 < questions.length) {
      setCurrentIdx(qIdx + 1);
    } else {
      setFinished(true);
      const pct = Math.round((newScore / questions.length) * 100);
      const grade = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good job!' : '😅 Great effort!';
      onSendMessage(`🎯 Quiz complete! Score: ${newScore}/${questions.length} (${pct}%) — ${grade}`);
    }
  };

  // ─── Interactive Game 1: Rock Paper Scissors ─────────────────────────────
  const launchRockPaperScissors = () => {
    const gameId = 'rps_' + Date.now();
    const payload = JSON.stringify({
      game_type: 'rps',
      game_id: gameId,
      p1_id: null,
      p1_name: null,
      p1_move: null,
      p2_id: null,
      p2_name: null,
      p2_move: null,
      status: 'waiting'
    });
    onSendMessage(payload);
    addToast('Rock Paper Scissors match posted to chat!', 'success');
    onClose();
  };

  // ─── Interactive Game 2: Tic-Tac-Toe ─────────────────────────────────────
  const launchTicTacToe = () => {
    const gameId = 'ttt_' + Date.now();
    const payload = JSON.stringify({
      game_type: 'tictactoe',
      game_id: gameId,
      board: Array(9).fill(null),
      turn: 'X',
      status: 'playing',
      winner: null
    });
    onSendMessage(payload);
    addToast('Tic Tac Toe match posted to chat!', 'success');
    onClose();
  };

  // ─── Custom Quiz Builder GUI ──────────────────────────────────────────────
  const addCustomQ = () => setCustomQs(prev => [...prev, { q: '', opts: ['', '', '', ''], correct: 0 }]);
  const removeCustomQ = (i) => setCustomQs(prev => prev.filter((_, idx) => idx !== i));
  const updateCustomQ = (i, field, value) => {
    setCustomQs(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };
  const updateCustomOpt = (qi, oi, value) => {
    setCustomQs(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...q.opts];
      opts[oi] = value;
      return { ...q, opts };
    }));
  };

  const saveCustomPackToDb = async () => {
    const valid = customQs.filter(q => q.q.trim() && q.opts.some(o => o.trim()));
    if (valid.length === 0) { addToast('Add at least 1 question with text & choices', 'error'); return; }
    if (!customTitle.trim()) { addToast('Please enter a Quiz Title', 'error'); return; }

    setSavingPack(true);
    try {
      const payload = {
        title: customTitle.trim(),
        category: customCategory,
        game_slug: 'quiz',
        description: `Custom Quiz Pack by user`,
        questions: valid.map(q => ({
          question_text: q.q.trim(),
          question_type: 'quiz',
          options: q.opts.filter(o => o.trim()),
          correct_index: q.correct
        }))
      };
      await request('/experiences/custom-sets', { method: 'POST', body: payload });
      addToast('Quiz Pack saved to Database!', 'success');
      startCustomQuiz();
    } catch (e) {
      addToast(e.message || 'Failed to save quiz pack', 'error');
    } finally {
      setSavingPack(false);
    }
  };

  const handleJsonImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.title) setCustomTitle(data.title);
        if (Array.isArray(data.questions)) {
          setCustomQs(data.questions.map(q => ({
            q: q.question || q.q || '',
            opts: q.options || q.opts || ['', '', '', ''],
            correct: q.correct ?? 0
          })));
          addToast(`Imported ${data.questions.length} questions from JSON!`, 'success');
        }
      } catch {
        addToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  const fetchSavedPacks = async () => {
    setLoadingPacks(true);
    try {
      const res = await request('/experiences/custom-sets?game_slug=quiz');
      setSavedPacks(res.sets || []);
      setGameMode('saved-packs');
    } catch {
      addToast('Failed to load saved quiz packs', 'error');
    } finally {
      setLoadingPacks(false);
    }
  };

  const loadPackFromDb = async (setId) => {
    setLoadingQs(true);
    try {
      const res = await request(`/experiences/questions?set_id=${setId}`);
      const fetched = (res.questions || []).map(q => ({
        id: q.id,
        q: q.question_text,
        opts: q.options || [],
        correct: q.correct_index ?? 0
      }));

      if (fetched.length === 0) throw new Error('No questions found in this pack');

      setQuestions(fetched);
      setCurrentIdx(0);
      setScore(0);
      setFinished(false);
      sentRef.current = new Set();
      setGameMode('custom-quiz');
      onSendMessage(`📝 Custom Quiz Pack Started! (${fetched.length} Questions)\nAnswer along and see your final score!`);
    } catch (e) {
      addToast(e.message || 'Failed to load pack', 'error');
    } finally {
      setLoadingQs(false);
    }
  };

  const startCustomQuiz = () => {
    const valid = customQs.filter(q => q.q.trim() && q.opts.some(o => o.trim()));
    if (valid.length === 0) { addToast('Add at least one question', 'error'); return; }
    const qs = valid.map((q, i) => ({ id: `custom_${i}`, q: q.q, opts: q.opts.filter(o => o.trim()), correct: q.correct }));
    setQuestions(qs);
    setCurrentIdx(0);
    setScore(0);
    setFinished(false);
    sentRef.current = new Set();
    setGameMode('custom-quiz');
    const title = customTitle.trim() || 'Custom Quiz';
    onSendMessage(`📝 "${title}" — Custom Quiz Started! (${qs.length} Questions)\nAnswer along with me!`);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const currentQ = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full sm:max-w-md bg-[#0E121B] sm:rounded-3xl border-t sm:border border-white/15 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden text-left">

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {gameMode !== 'menu' && (
              <button onClick={() => { setGameMode('menu'); setFinished(false); sentRef.current = new Set(); }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 mr-1 shrink-0">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <h3 className="text-sm font-bold text-white truncate">
              {gameMode === 'menu' && 'Games & Interactive Activities'}
              {gameMode === 'compat' && `💖 Compatibility — Q${currentIdx + 1}/${questions.length}`}
              {gameMode === 'quiz' && `🧠 Quiz — Q${currentIdx + 1}/${questions.length}`}
              {gameMode === 'custom-builder' && '📝 Create Custom Quiz GUI'}
              {gameMode === 'saved-packs' && '📚 Saved Quiz Packs'}
              {gameMode === 'custom-quiz' && `📝 Custom Quiz — Q${currentIdx + 1}/${questions.length}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">

          {/* ── MENU ── */}
          {gameMode === 'menu' && (
            <>
              {/* Rock Paper Scissors & Tic Tac Toe Quick Duels */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={launchRockPaperScissors}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/70 to-orange-950/70 border border-amber-500/30 hover:border-amber-400 text-left flex flex-col gap-1 transition-all group">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-all" />
                    <span className="text-xs font-bold text-white">Rock Paper Scissors</span>
                  </div>
                  <p className="text-[10px] text-amber-200/70">Secret tool lock & duel</p>
                </button>

                <button onClick={launchTicTacToe}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/70 to-slate-950/70 border border-indigo-500/30 hover:border-indigo-400 text-left flex flex-col gap-1 transition-all group">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-all" />
                    <span className="text-xs font-bold text-white">Tic-Tac-Toe</span>
                  </div>
                  <p className="text-[10px] text-indigo-200/70">3x3 Grid multiplayer duel</p>
                </button>
              </div>

              {/* Compatibility Test */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/60 to-purple-950/60 border border-pink-500/30 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <h4 className="text-sm font-bold text-white">Compatibility Test</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[['friends', '👥 Best Friends', 'Hangouts & lifestyle'], ['partner', '💖 Life Partner', 'Love & goals']].map(([val, label, sub]) => (
                    <button key={val} onClick={() => setCompatMode(val)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all font-semibold ${compatMode === val ? 'bg-pink-600 border-pink-400 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                      <span className="text-[11px]">{label}</span>
                      <span className="text-[9px] opacity-75 font-normal">{sub}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 text-xs">
                  {[5, 10, 15].map(n => (
                    <button key={n} onClick={() => setQuestionCount(n)}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${questionCount === n ? 'bg-pink-600 border-pink-400 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                      {n} Qs
                    </button>
                  ))}
                </div>
                <button onClick={startCompat} disabled={loadingQs}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  {loadingQs ? <Loader2 className="w-4 h-4 animate-spin" /> : '▶ Start Compatibility Test'}
                </button>
              </div>

              {/* Quiz Challenge */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-blue-950/60 border border-indigo-500/30 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">Quiz Challenge</h4>
                </div>
                <div className="flex gap-2 text-xs">
                  {[5, 10, 15].map(n => (
                    <button key={n} onClick={() => setQuestionCount(n)}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${questionCount === n ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                      {n} Qs
                    </button>
                  ))}
                </div>
                <button onClick={startQuiz} disabled={loadingQs}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  {loadingQs ? <Loader2 className="w-4 h-4 animate-spin" /> : '▶ Start Quiz'}
                </button>
              </div>

              {/* Custom Quiz Options */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setGameMode('custom-builder')}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 hover:border-emerald-400 transition-all text-left flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Create Custom Quiz</span>
                  </div>
                  <span className="text-[10px] text-emerald-300/70">GUI form & choices</span>
                </button>

                <button onClick={fetchSavedPacks}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-pink-950/60 border border-purple-500/30 hover:border-purple-400 transition-all text-left flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Load Saved Packs</span>
                  </div>
                  <span className="text-[10px] text-purple-300/70">Browse DB quiz packs</span>
                </button>
              </div>
            </>
          )}

          {/* ── SAVED QUIZ PACKS FROM DB ── */}
          {gameMode === 'saved-packs' && (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Available Database Quiz Packs:</h4>
              {loadingPacks ? (
                <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Loading quiz packs from DB...</span>
                </div>
              ) : savedPacks.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No saved packs found in DB yet. Create one with the GUI Builder!
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                  {savedPacks.map(pack => (
                    <button key={pack.id} onClick={() => loadPackFromDb(pack.id)}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400 hover:bg-purple-950/20 text-left flex flex-col gap-1 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{pack.title}</span>
                        <span className="text-[10px] text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-500/30">
                          by @{pack.creator_username || 'user'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">{pack.description || 'Custom question set'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPATIBILITY GAME ── */}
          {gameMode === 'compat' && !finished && currentQ && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-400 font-mono shrink-0">{currentIdx}/{questions.length}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm font-semibold text-white leading-relaxed">{currentQ.q}</p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {currentQ.opts.map((opt, i) => (
                  <button key={i} onClick={() => handleCompatAnswer(opt, currentIdx)}
                    disabled={sentRef.current.has(currentIdx)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/60 hover:bg-pink-950/30 text-left text-xs font-semibold text-white transition-all disabled:opacity-40">
                    <span className="text-pink-400 font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── QUIZ GAME ── */}
          {(gameMode === 'quiz' || gameMode === 'custom-quiz') && !finished && currentQ && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-400 font-mono shrink-0">{currentIdx}/{questions.length} • Score: {score}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm font-semibold text-white leading-relaxed">{currentQ.q}</p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {currentQ.opts.map((opt, i) => (
                  <button key={i} onClick={() => handleQuizAnswer(i, currentIdx)}
                    disabled={sentRef.current.has(currentIdx)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/60 hover:bg-indigo-950/30 text-left text-xs font-semibold text-white transition-all disabled:opacity-40">
                    <span className="text-indigo-400 font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── FINISHED STATE ── */}
          {finished && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              {(gameMode === 'quiz' || gameMode === 'custom-quiz') ? (
                <>
                  <h3 className="text-lg font-extrabold text-white">Quiz Complete! 🎉</h3>
                  <p className="text-sm text-gray-300">Final Score: <span className="text-indigo-300 font-bold">{score}/{questions.length}</span></p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-extrabold text-white">Compatibility Test Complete! 💖</h3>
                  <p className="text-sm text-gray-300">All answers sent to chat!</p>
                </>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setGameMode('menu'); setFinished(false); setCurrentIdx(0); setScore(0); sentRef.current = new Set(); }}
                  className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-white hover:bg-white/15">
                  Play Again
                </button>
                <button onClick={onClose}
                  className="px-5 py-2.5 rounded-xl btn-gradient text-xs font-bold text-white shadow-md">
                  Back to Chat
                </button>
              </div>
            </div>
          )}

          {/* ── CUSTOM QUIZ GUI BUILDER ── */}
          {gameMode === 'custom-builder' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <input
                  placeholder="Quiz Title (e.g. My Anime & Tech Trivia)..."
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Anime">Anime</option>
                    <option value="Tech">Tech</option>
                    <option value="Movies">Movies</option>
                  </select>

                  <button onClick={() => fileInputRef.current?.click()}
                    title="Import JSON"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import JSON</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleJsonImport} />
                </div>
              </div>

              {/* Question list editor */}
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {customQs.map((cq, qi) => (
                  <div key={qi} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-400 shrink-0">Q{qi + 1}</span>
                      <input
                        placeholder="Type question here..."
                        value={cq.q}
                        onChange={e => updateCustomQ(qi, 'q', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                      />
                      {customQs.length > 1 && (
                        <button onClick={() => removeCustomQ(qi)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* 4 Options with Radio Selection for Correct Answer */}
                    <div className="grid grid-cols-1 gap-1.5 pl-4">
                      {cq.opts.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCustomQ(qi, 'correct', oi)}
                            title="Mark as correct answer"
                            className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all ${cq.correct === oi ? 'bg-emerald-500 border-emerald-400' : 'border-white/30 hover:border-emerald-400'}`}
                          >
                            {cq.correct === oi && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </button>
                          <input
                            placeholder={`Option ${String.fromCharCode(65 + oi)}...`}
                            value={opt}
                            onChange={e => updateCustomOpt(qi, oi, e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addCustomQ}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/20 text-xs text-gray-300 hover:text-white hover:border-white/40 transition-all font-semibold">
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={saveCustomPackToDb} disabled={savingPack}
                  className="py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-1.5">
                  {savingPack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Save to DB</span>
                </button>

                <button onClick={startCustomQuiz}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-1">
                  <span>▶ Play Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
