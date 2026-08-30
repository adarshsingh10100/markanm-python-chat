import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, Trophy, Flame, HelpCircle, Award, Send, Mic,
  Keyboard, RefreshCw, Loader2, Play, X, Plus, FolderPlus, Globe, Lock, Users, Vote
} from 'lucide-react';
import { MarkanM } from '../../sdk/markanmSdk';
import { request } from '../../services/api';

const CATEGORIES = ['All', 'Romance', 'Coding', 'Love', 'Sports', 'Tech', 'Pop Culture', 'Party'];

/**
 * 🎲 1. WOULD YOU RATHER EMBED EXPERIENCE
 */
export function WouldYouRatherEmbed() {
  const [category, setCategory] = useState('All');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [askedIds, setAskedIds] = useState([]);
  const [voted, setVoted] = useState(null);
  const [votesA, setVotesA] = useState(14);
  const [votesB, setVotesB] = useState(19);

  const [loading, setLoading] = useState(true);
  const [postAnswerState, setPostAnswerState] = useState('idle'); // 'idle' | 'submitting' | 'done'

  const fetchFreshQuestions = async (cat = category) => {
    setLoading(true);
    setPostAnswerState('idle');
    try {
      const excludeStr = askedIds.join(',');
      const res = await request(`/experiences/questions?game_slug=would-you-rather&category=${cat}&exclude=${excludeStr}`);
      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        setCurrentIdx(0);
        setVoted(null);
      }
    } catch (e) {
      setQuestions([
        {
          id: 1,
          question_text: 'Would You Rather...',
          options: ['Read minds for one year', 'Control time for one year']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreshQuestions(category);
  }, [category]);

  const currentQ = questions[currentIdx] || {
    id: 1,
    question_text: 'Would You Rather...',
    options: ['Read minds for one year', 'Control time for one year']
  };

  const handleVote = (choice) => {
    setVoted(choice);
    if (choice === 'A') setVotesA(prev => prev + 1);
    if (choice === 'B') setVotesB(prev => prev + 1);

    const selectedText = choice === 'A' ? currentQ.options[0] : currentQ.options[1];
    MarkanM.sendMessage(`🎲 [WOULD YOU RATHER]: I picked "${selectedText}"!`);

    if (currentQ.id && !askedIds.includes(currentQ.id)) {
      setAskedIds(prev => [...prev, currentQ.id]);
    }

    setPostAnswerState('submitting');
    setTimeout(() => {
      setPostAnswerState('done');
    }, 1000);
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setVoted(null);
      setPostAnswerState('idle');
    } else {
      fetchFreshQuestions(category);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-black text-white">Would You Rather?</h2>
          </div>

          <button
            onClick={handleNextQuestion}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Next
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-xl shrink-0 transition-all ${
                category === cat ? 'bg-indigo-600 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-xs text-gray-400 font-semibold animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading unasked questions...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleVote('A')}
              disabled={voted !== null}
              className={`p-5 rounded-2xl border text-sm font-bold transition-all text-left flex flex-col gap-2 ${
                voted === 'A' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
              }`}
            >
              <span>{currentQ.options?.[0] || 'Option A'}</span>
              {voted && (
                <span className="text-xs text-indigo-200 font-mono">
                  {Math.round((votesA / (votesA + votesB)) * 100)}% ({votesA} votes)
                </span>
              )}
            </button>

            <div className="text-xs font-black text-gray-500 uppercase tracking-widest">— OR —</div>

            <button
              onClick={() => handleVote('B')}
              disabled={voted !== null}
              className={`p-5 rounded-2xl border text-sm font-bold transition-all text-left flex flex-col gap-2 ${
                voted === 'B' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
              }`}
            >
              <span>{currentQ.options?.[1] || 'Option B'}</span>
              {voted && (
                <span className="text-xs text-purple-200 font-mono">
                  {Math.round((votesB / (votesA + votesB)) * 100)}% ({votesB} votes)
                </span>
              )}
            </button>
          </div>
        )}

        {postAnswerState === 'submitting' && (
          <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-300 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Posting response to chat...</span>
          </div>
        )}

        {postAnswerState === 'done' && (
          <div className="p-4 bg-white/5 border border-white/15 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Answer Posted to Chat!</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNextQuestion}
                className="flex-1 btn-gradient py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Next Question</span>
              </button>
              <button
                onClick={() => window.parent.postMessage({ type: 'MARKANM_SDK_CLOSE' }, '*')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 🧠 2. QUICK QUIZ EMBED EXPERIENCE
 */
export function QuickQuizEmbed() {
  const [category, setCategory] = useState('All');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [askedIds, setAskedIds] = useState([]);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postAnswerState, setPostAnswerState] = useState('idle');

  const fetchFreshTrivia = async (cat = category) => {
    setLoading(true);
    setPostAnswerState('idle');
    try {
      const excludeStr = askedIds.join(',');
      const res = await request(`/experiences/questions?game_slug=quick-quiz&category=${cat}&exclude=${excludeStr}`);
      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        setCurrentIdx(0);
        setSelected(null);
      }
    } catch (e) {
      setQuestions([
        {
          id: 1,
          question_text: 'What does HTML stand for in web development?',
          options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Mark Language', 'Home Tool Markup Language'],
          correct_index: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreshTrivia(category);
  }, [category]);

  const currentQ = questions[currentIdx] || {
    id: 1,
    question_text: 'What does HTML stand for in web development?',
    options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Mark Language', 'Home Tool Markup Language'],
    correct_index: 0
  };

  const handleAnswer = (idx) => {
    setSelected(idx);
    const isCorrect = idx === currentQ.correct_index;
    const newScore = isCorrect ? score + 100 : score;
    if (isCorrect) setScore(newScore);

    if (currentQ.id && !askedIds.includes(currentQ.id)) {
      setAskedIds(prev => [...prev, currentQ.id]);
    }

    setPostAnswerState('submitting');
    setTimeout(() => {
      setPostAnswerState('done');
      if (currentIdx === questions.length - 1) {
        MarkanM.sendMessage(`🧠 Finished Quick Quiz round with total score ${newScore} points!`);
      }
    }, 1000);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setPostAnswerState('idle');
    } else {
      fetchFreshTrivia(category);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-bold text-indigo-400">Quick Trivia Quiz</span>
          <span className="text-xs font-mono font-bold text-amber-400">Score: {score}</span>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-xl shrink-0 transition-all ${
                category === cat ? 'bg-indigo-600 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-xs text-gray-400 font-semibold animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Fetching fresh unasked trivia...</span>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-white leading-snug">{currentQ.question_text}</h3>

            <div className="flex flex-col gap-2.5">
              {currentQ.options?.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selected !== null}
                  className={`p-3.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    selected === idx
                      ? idx === currentQ.correct_index ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {postAnswerState === 'submitting' && (
          <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-300 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Checking answer...</span>
          </div>
        )}

        {postAnswerState === 'done' && (
          <div className="p-4 bg-white/5 border border-white/15 rounded-2xl flex items-center gap-2">
            <button
              onClick={handleNext}
              className="flex-1 btn-gradient py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Next Question</span>
            </button>
            <button
              onClick={() => window.parent.postMessage({ type: 'MARKANM_SDK_CLOSE' }, '*')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 🗳 3. PREDICTION POLL EMBED EXPERIENCE
 * Features Dynamic Prompts & Next Prediction Engine!
 */
export function PredictionPollEmbed() {
  const [category, setCategory] = useState('All');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [askedIds, setAskedIds] = useState([]);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postAnswerState, setPostAnswerState] = useState('idle');

  const fetchFreshPredictions = async (cat = category) => {
    setLoading(true);
    setPostAnswerState('idle');
    try {
      const excludeStr = askedIds.join(',');
      const res = await request(`/experiences/questions?game_slug=prediction-poll&category=${cat}&exclude=${excludeStr}`);
      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        setCurrentIdx(0);
        setSelectedPrediction(null);
      }
    } catch (e) {
      setQuestions([
        {
          id: 1,
          question_text: 'Will Artificial Intelligence write 80% of software code by 2028?',
          options: ['Yes, AI will write most software', 'No, human engineers will lead']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreshPredictions(category);
  }, [category]);

  const currentQ = questions[currentIdx] || {
    id: 1,
    question_text: 'Will Artificial Intelligence write 80% of software code by 2028?',
    options: ['Yes, AI will write most software', 'No, human engineers will lead']
  };

  const handlePredict = (opt) => {
    setSelectedPrediction(opt);
    MarkanM.sendMessage(`🗳 Made prediction: "${opt}" in Prediction Poll!`);

    if (currentQ.id && !askedIds.includes(currentQ.id)) {
      setAskedIds(prev => [...prev, currentQ.id]);
    }

    setPostAnswerState('submitting');
    setTimeout(() => {
      setPostAnswerState('done');
    }, 1000);
  };

  const handleNextPrediction = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedPrediction(null);
      setPostAnswerState('idle');
    } else {
      fetchFreshPredictions(category);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Prediction Poll</h2>
          </div>

          <button
            onClick={handleNextPrediction}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Next
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-xl shrink-0 transition-all ${
                category === cat ? 'bg-indigo-600 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-xs text-gray-400 font-semibold animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Fetching next prediction prompt...</span>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-white leading-snug">{currentQ.question_text}</h3>

            <div className="flex flex-col gap-3">
              {currentQ.options?.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePredict(opt)}
                  disabled={selectedPrediction !== null}
                  className={`p-4 rounded-2xl border text-xs font-bold transition-all ${
                    selectedPrediction === opt ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {postAnswerState === 'submitting' && (
          <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-300 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Posting prediction to chat...</span>
          </div>
        )}

        {postAnswerState === 'done' && (
          <div className="p-4 bg-white/5 border border-white/15 rounded-2xl flex items-center gap-2">
            <button
              onClick={handleNextPrediction}
              className="flex-1 btn-gradient py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Next Prediction
            </button>
            <button
              onClick={() => window.parent.postMessage({ type: 'MARKANM_SDK_CLOSE' }, '*')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 🎉 4. TRUTH OR DARE EMBED EXPERIENCE
 */
export function PartyGameEmbed() {
  const [category, setCategory] = useState('All');
  const [mode, setMode] = useState('type');
  const [currentType, setCurrentType] = useState('truth');
  const [prompt, setPrompt] = useState('Select Truth or Dare to begin!');
  const [askedIds, setAskedIds] = useState([]);
  const [typedResponse, setTypedResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [postAnswerState, setPostAnswerState] = useState('idle');

  const [customSets, setCustomSets] = useState([]);
  const [activeSetId, setActiveSetId] = useState(null);
  const [isCreatePackOpen, setIsCreatePackOpen] = useState(false);
  const [newPackTitle, setNewPackTitle] = useState('');
  const [newPackCat, setNewPackCat] = useState('Party');
  const [newPackQs, setNewPackQs] = useState([{ question_text: '', question_type: 'truth' }]);

  const fetchCustomPacks = async () => {
    try {
      const res = await request('/experiences/custom-sets?game_slug=party-game');
      setCustomSets(res.sets || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchCustomPacks();
  }, []);

  const fetchPrompt = async (type, cat = category, setId = activeSetId) => {
    setCurrentType(type);
    setTypedResponse('');
    setLoading(true);
    setPostAnswerState('idle');

    try {
      const excludeStr = askedIds.join(',');
      let url = `/experiences/questions?game_slug=party-game&type=${type}&category=${cat}&exclude=${excludeStr}`;
      if (setId) url += `&set_id=${setId}`;

      const res = await request(url);
      if (res.questions && res.questions.length > 0) {
        const q = res.questions[0];
        setPrompt(q.question_text);
        setAskedIds(prev => [...prev, q.id]);
      } else {
        setPrompt(type === 'truth' ? 'What is your most embarrassing chat moment?' : 'Send a funny voice message right now!');
      }
    } catch (e) {
      setPrompt(type === 'truth' ? 'What is your most embarrassing chat moment?' : 'Send a funny voice message right now!');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTypedAnswer = (e) => {
    e.preventDefault();
    if (!typedResponse.trim()) return;

    const label = currentType.toUpperCase();
    MarkanM.sendMessage(`🎉 [TRUTH OR DARE - ${label}]:\nQ: "${prompt}"\n👉 Answer: ${typedResponse.trim()}`);

    setPostAnswerState('submitting');
    setTimeout(() => {
      setPostAnswerState('done');
    }, 1000);
  };

  const handleVoiceCallCompleted = () => {
    const label = currentType.toUpperCase();
    MarkanM.sendMessage(`🎙️ [TRUTH OR DARE - ${label}]:\nQ: "${prompt}"\n✅ Completed on Voice Call!`);

    setPostAnswerState('submitting');
    setTimeout(() => {
      setPostAnswerState('done');
    }, 1000);
  };

  const handleCreatePackSubmit = async (e) => {
    e.preventDefault();
    if (!newPackTitle.trim() || newPackQs.filter(q => q.question_text.trim()).length === 0) {
      return;
    }

    try {
      await request('/experiences/custom-sets', {
        method: 'POST',
        body: JSON.stringify({
          title: newPackTitle,
          category: newPackCat,
          game_slug: 'party-game',
          is_public: true,
          questions: newPackQs.filter(q => q.question_text.trim())
        })
      });
      setIsCreatePackOpen(false);
      fetchCustomPacks();
    } catch (err) {}
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Truth or Dare</h2>
          </div>

          <button
            onClick={() => setIsCreatePackOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center gap-1 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" /> Create Pack
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setActiveSetId(null); fetchPrompt(currentType, cat, null); }}
              className={`px-3 py-1 rounded-xl shrink-0 transition-all ${
                category === cat && !activeSetId ? 'bg-indigo-600 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Community Packs Selector */}
        {customSets.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold uppercase text-purple-400 shrink-0">Community Packs:</span>
            {customSets.map(set => (
              <button
                key={set.id}
                onClick={() => { setActiveSetId(set.id); fetchPrompt(currentType, category, set.id); }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all ${
                  activeSetId === set.id ? 'bg-purple-600 text-white font-bold' : 'bg-white/5 text-gray-300 hover:text-white'
                }`}
              >
                📦 {set.title} ({set.question_count})
              </button>
            ))}
          </div>
        )}

        {/* Mode Switcher */}
        <div className="flex items-center justify-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setMode('type')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              mode === 'type' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" /> Type Answer
          </button>

          <button
            onClick={() => setMode('call')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              mode === 'call' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> On Voice Call
          </button>
        </div>

        {/* Truth vs Dare Pickers */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fetchPrompt('truth')}
            className="py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4" /> Pick TRUTH
          </button>
          <button
            onClick={() => fetchPrompt('dare')}
            className="py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5"
          >
            <Flame className="w-4 h-4" /> Pick DARE
          </button>
        </div>

        {/* Question Display Card */}
        {loading ? (
          <div className="py-6 text-xs text-gray-400 font-semibold animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading unasked challenge...</span>
          </div>
        ) : (
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              {currentType.toUpperCase()} CHALLENGE
            </span>
            <p className="text-sm font-bold text-gray-100 leading-relaxed">"{prompt}"</p>
          </div>
        )}

        {/* Response Inputs */}
        {postAnswerState === 'idle' && (
          mode === 'type' ? (
            <form onSubmit={handleSendTypedAnswer} className="flex flex-col gap-3">
              <textarea
                rows={3}
                placeholder={currentType === 'truth' ? "Type your honest answer here..." : "Type your proof or dare response..."}
                value={typedResponse}
                onChange={(e) => setTypedResponse(e.target.value)}
                className="w-full p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
              <button
                type="submit"
                disabled={!typedResponse.trim()}
                className="btn-gradient py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Submit Answer to Chat
              </button>
            </form>
          ) : (
            <button
              onClick={handleVoiceCallCompleted}
              className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-xl flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> I Answered / Performed on Voice Call!
            </button>
          )
        )}

        {postAnswerState === 'submitting' && (
          <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-300 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Posting response to chat...</span>
          </div>
        )}

        {postAnswerState === 'done' && (
          <div className="p-4 bg-white/5 border border-white/15 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Response Posted to Chat!</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchPrompt(currentType)}
                className="flex-1 btn-gradient py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Next Challenge</span>
              </button>
              <button
                onClick={() => window.parent.postMessage({ type: 'MARKANM_SDK_CLOSE' }, '*')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE CUSTOM PACK MODAL */}
      {isCreatePackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-white/15 p-6 shadow-2xl relative my-8 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Create Custom Truth & Dare Pack</h3>
              <button onClick={() => setIsCreatePackOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackSubmit} className="flex flex-col gap-4 mt-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Pack Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Late Night Secrets, Dev Humor"
                  value={newPackTitle}
                  onChange={(e) => setNewPackTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Category</label>
                <select
                  value={newPackCat}
                  onChange={(e) => setNewPackCat(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c} className="bg-[#0B0E14] text-white">{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-gray-300 font-semibold">Questions / Truths & Dares</label>
                {newPackQs.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={q.question_type}
                      onChange={(e) => {
                        const copy = [...newPackQs];
                        copy[idx].question_type = e.target.value;
                        setNewPackQs(copy);
                      }}
                      className="px-2 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    >
                      <option value="truth" className="bg-[#0B0E14]">Truth</option>
                      <option value="dare" className="bg-[#0B0E14]">Dare</option>
                    </select>

                    <input
                      type="text"
                      placeholder={`Question #${idx + 1}...`}
                      value={q.question_text}
                      onChange={(e) => {
                        const copy = [...newPackQs];
                        copy[idx].question_text = e.target.value;
                        setNewPackQs(copy);
                      }}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setNewPackQs(prev => [...prev, { question_text: '', question_type: 'truth' }])}
                  className="py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-indigo-400 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Question
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreatePackOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gradient px-5 py-2 rounded-xl text-xs font-bold shadow-lg"
                >
                  Publish Pack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 💖 5. COMPATIBILITY TEST EMBED EXPERIENCE
 * Features:
 * - Select 5, 10, or 15 Questions
 * - Synchronized Turn Locking (Both must answer before advancing)
 * - Answers Hidden until the end (No cheating / no spoilers)
 * - Interactive End-of-Game Compatibility Score & Graph Report
 */
const DEFAULT_LOVE_QUESTIONS = [
  { id: 101, question_text: "What makes you feel most loved by someone?", options: ["Words of affirmation & sweet compliments", "Quality uninterrupted time together", "Thoughtful gestures & helpful support", "Surprises & meaningful gifts"] },
  { id: 102, question_text: "What is most important in a long-term romantic relationship?", options: ["Trust & absolute honesty", "Deep emotional communication", "Shared life goals & values", "Spark, chemistry & passion"] },
  { id: 103, question_text: "How often do you ideally like to spend time with your partner?", options: ["Almost every single day", "A few times a week", "Mostly weekends", "A healthy mix of together and alone time"] },
  { id: 104, question_text: "How do you prefer your partner to apologize after an argument?", options: ["Say sorry directly & sincerely", "Explain what happened & talk it out", "Show change through actions", "Give me space to cool down first"] },
  { id: 105, question_text: "What kind of date sounds most ideal to you?", options: ["Fancy dinner out at a nice restaurant", "Cozy movie night & cooking at home", "Outdoor adventure or traveling", "Simple walk and deep conversation"] },
  { id: 106, question_text: "What is your biggest relationship dealbreaker?", options: ["Dishonesty & secrecy", "Lack of effort or attention", "Disrespect or rudeness", "Poor communication"] },
  { id: 107, question_text: "How much personal independent space should partners have?", options: ["Very little, we do everything together", "Some personal hobby time", "A lot of independent time", "Whatever naturally feels right"] },
  { id: 108, question_text: "What would make you feel most secure in a relationship?", options: ["Consistent daily communication", "Unquestionable loyalty", "Emotional openness & vulnerability", "Shared long-term future plans"] },
  { id: 109, question_text: "Would you rather have a partner who is very similar to you or different?", options: ["Very similar in personalities", "Mostly similar with minor differences", "Balanced differences that complement", "Very different & spontaneous"] },
  { id: 110, question_text: "What matters most during difficult emotional times?", options: ["Emotional comfort & listening", "Practical help & solutions", "Giving space until ready", "Figuring it out together"] }
];

const DEFAULT_FRIEND_QUESTIONS = [
  { id: 201, question_text: "What is the best way to spend a hangout weekend with friends?", options: ["Road trip or outdoor trip", "Chill movie/gaming night at home", "Exploring food spots & cafes", "Attending concerts or events"] },
  { id: 202, question_text: "How quickly do you reply to group messages?", options: ["Immediately within minutes", "Within a few hours", "Whenever I am free", "Only when directly tagged"] },
  { id: 203, question_text: "What describes your personality in a friend group?", options: ["The Planner & organizer", "The Funny spontaneous one", "The Listener & advisor", "The Chill go-with-the-flow one"] },
  { id: 204, question_text: "What type of humor do you connect with most?", options: ["Witty & sarcastic banter", "Silly & lighthearted humor", "Dry & observational", "Dark humor & memes"] },
  { id: 205, question_text: "How do you handle last-minute spontaneous hangout plans?", options: ["Love it! I'm ready in 5 minutes!", "Need a bit of advance notice", "Prefer planned schedules", "Depends on my mood & energy"] },
  { id: 206, question_text: "What do you value most in a close friendship?", options: ["Loyalty & having my back", "Honesty & straightforwardness", "Fun memories & shared laughs", "Being able to talk about anything"] },
  { id: 207, question_text: "What would you do if your friend was having a tough day?", options: ["Go visit them with food/treats", "Text/call to listen to them", "Give them space and check in later", "Distract them with something fun"] },
  { id: 208, question_text: "What describes your ideal trip style?", options: ["Packed itinerary with every spot planned", "Relaxing with no strict timetable", "Action-packed budget backpacking", "Luxury & comfort first"] },
  { id: 209, question_text: "How do you handle disagreements with friends?", options: ["Talk it out calmly and directly", "Let it pass & move on naturally", "Take time to think before bringing it up", "Crack a joke to break tension"] },
  { id: 210, question_text: "What is your approach to sharing food/belongings with friends?", options: ["What's mine is yours!", "Happy to share if asked", "Prefer to keep things separate", "Only with my absolute best friends"] }
];

export function CompatibilityTestEmbed() {
  const [loading, setLoading] = useState(true);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [myProgressIdx, setMyProgressIdx] = useState(0);
  const [testMode, setTestMode] = useState('friends');
  const [hostSetupMode, setHostSetupMode] = useState('friends');
  const [checkingResult, setCheckingResult] = useState(false);
  const [latestState, setLatestState] = useState(null);

  // Extract session code and user ID from URL
  const sessionCode = window.location.search.match(/session_code=([A-Z0-9_]+)/)?.[1] || 'COMPAT_SESSION';
  const urlUserId = window.location.search.match(/user_id=([0-9]+)/)?.[1] || '';
  const urlUsername = window.location.search.match(/user=([a-zA-Z0-9_]+)/)?.[1] || '';

  const [userInfo, setUserInfo] = useState({ id: urlUserId, username: urlUsername });

  useEffect(() => {
    // Fetch logged in user if ID wasn't in URL
    request('/auth/me')
      .then(res => {
        if (res.user) {
          setUserInfo({ id: String(res.user.id), username: res.user.username });
        }
      })
      .catch(() => {});
    loadSessionOnce();
  }, []);

  // Auto-poll session state every 3 seconds so results reveal automatically when friend finishes
  useEffect(() => {
    if (!sessionCode || sessionCode === 'COMPAT_SESSION') return;
    const timer = setInterval(() => {
      request(`/experiences/sessions/${sessionCode}`)
        .then(res => {
          if (res.session) {
            setSessionMeta(res.session);
            const rawState = res.session.state || res.session.state_json;
            if (rawState) {
              const state = typeof rawState === 'string' ? JSON.parse(rawState) : rawState;
              setLatestState(state);
              setSessionState(state);
            }
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [sessionCode]);

  const loadSessionOnce = async () => {
    setLoading(true);
    let loadedQs = [];
    let loadedMode = 'friends';

    // Calculate answered count
    const myUid = userInfo.id || urlUserId || 'me';
    let myAnsCount = 0;

    try {
      const res = await request(`/experiences/sessions/${sessionCode}`);
      if (res.session) {
        setSessionMeta(res.session);
        const rawState = res.session.state || res.session.state_json;
        if (rawState) {
          const parsedState = typeof rawState === 'string' ? JSON.parse(rawState) : rawState;
          setSessionState(parsedState);
          setLatestState(parsedState);
          if (parsedState.questions && parsedState.questions.length > 0) {
            loadedQs = parsedState.questions;
            loadedMode = parsedState.test_mode || 'friends';
          }
          if (parsedState.answers && parsedState.answers[myUid]) {
            myAnsCount = Object.keys(parsedState.answers[myUid]).length;
          }
        }
      }
    } catch (e) {}

    // Fallback: If session had no questions or API failed, fetch or use default set
    if (loadedQs.length === 0) {
      const catParam = loadedMode === 'partner' ? 'Love' : 'Lifestyle';
      try {
        const qRes = await request(`/experiences/questions?game_slug=compatibility-test&category=${catParam}`);
        if (qRes.questions && qRes.questions.length > 0) {
          loadedQs = qRes.questions.slice(0, 10);
        }
      } catch (e) {}
    }

    if (loadedQs.length === 0) {
      loadedQs = loadedMode === 'partner' ? DEFAULT_LOVE_QUESTIONS : DEFAULT_FRIEND_QUESTIONS;
    }

    setQuestions(loadedQs);
    setTestMode(loadedMode);
    setMyProgressIdx(myAnsCount);
    setLoading(false);
  };

  const refreshState = async () => {
    setCheckingResult(true);
    try {
      const res = await request(`/experiences/sessions/${sessionCode}`);
      if (res.session) {
        setSessionMeta(res.session);
        const rawState = res.session.state || res.session.state_json;
        if (rawState) {
          const state = typeof rawState === 'string' ? JSON.parse(rawState) : rawState;
          setLatestState(state);
          setSessionState(state);
          if (state.questions && state.questions.length > 0) {
            setQuestions(state.questions);
          }
        }
      }
    } catch (e) {}
    setCheckingResult(false);
  };

  const handleStartGame = async (count, mode = hostSetupMode) => {
    setLoading(true);
    try {
      const catParam = mode === 'partner' ? 'Love' : 'Lifestyle';
      const res = await request(`/experiences/questions?game_slug=compatibility-test&category=${catParam}`);
      let selectedQs = (res.questions || []).slice(0, count);
      if (selectedQs.length === 0) {
        const pool = mode === 'partner' ? DEFAULT_LOVE_QUESTIONS : DEFAULT_FRIEND_QUESTIONS;
        selectedQs = pool.slice(0, count);
      }

      setQuestions(selectedQs);
      setTestMode(mode);
      setMyProgressIdx(0);

      const newState = {
        questions: selectedQs,
        total_questions: selectedQs.length,
        test_mode: mode,
        answers: {},
        status: 'in_progress'
      };
      setSessionState(newState);
      setLatestState(newState);

      await request(`/experiences/sessions/${sessionCode}/state`, {
        method: 'POST',
        body: JSON.stringify({ state: newState })
      });
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (optionText) => {
    const myUid = userInfo.id || urlUserId || 'me';
    const qIndexToSubmit = myProgressIdx;
    setMyProgressIdx(prev => prev + 1);

    try {
      await request(`/experiences/sessions/${sessionCode}/state`, {
        method: 'POST',
        body: JSON.stringify({
          state: {
            answer: {
              q_index: qIndexToSubmit,
              choice: optionText,
              user_id: myUid
            }
          }
        })
      });
    } catch (e) {}
  };

  const effectiveUserId = userInfo.id || urlUserId;
  const isHost = sessionMeta ? (
    (effectiveUserId && String(sessionMeta.creator_id) === String(effectiveUserId)) ||
    (userInfo.username && sessionMeta.creator_username === userInfo.username)
  ) : false;

  const sessionStarted = questions.length > 0;
  const iHaveFinishedAll = sessionStarted && myProgressIdx >= questions.length;

  const isCompleted = (
    sessionMeta?.status === 'ended' ||
    latestState?.status === 'completed' ||
    sessionState?.status === 'completed' ||
    (
      latestState?.p1_answers && latestState?.p2_answers &&
      Object.keys(latestState.p1_answers).length >= (questions.length || 5) &&
      Object.keys(latestState.p2_answers).length >= (questions.length || 5)
    ) ||
    (
      latestState?.answers &&
      Object.keys(latestState.answers).length >= 2 &&
      Object.values(latestState.answers).every(ans => Object.keys(ans).length >= (questions.length || 5))
    )
  );

  const computeReport = () => {
    const total = questions.length || 10;
    let u1Ans = latestState?.p1_answers || {};
    let u2Ans = latestState?.p2_answers || {};

    if (Object.keys(u1Ans).length === 0 || Object.keys(u2Ans).length === 0) {
      const keys = Object.keys(latestState?.answers || {});
      if (keys.length >= 2) {
        u1Ans = latestState.answers[keys[0]] || {};
        u2Ans = latestState.answers[keys[1]] || {};
      }
    }

    let matches = 0;
    for (let i = 0; i < total; i++) {
      const a1 = u1Ans[String(i)] || u1Ans[i];
      const a2 = u2Ans[String(i)] || u2Ans[i];
      if (a1 && a2 && String(a1).trim() === String(a2).trim()) {
        matches++;
      }
    }
    const percent = Math.round((matches / Math.max(1, total)) * 100);
    return { percent, matches, total };
  };

  const report = isCompleted ? computeReport() : null;
  const modeLabel = testMode === 'partner' ? '💖 Romantic Partner' : '👥 Best Friends';

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-4 flex flex-col items-center justify-center text-center">
      <div className="w-full max-w-md bg-[#111622] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Compatibility Test</h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
            {modeLabel}
          </span>
        </div>

        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400 font-medium">Syncing Test State...</span>
          </div>
        )}

        {/* HOST SETUP SCREEN — shown only if no questions exist and current user is host */}
        {!loading && !sessionStarted && isHost && sessionMeta?.status !== 'expired' && (
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-1 text-left">
              <h3 className="text-base font-bold text-white">Start Compatibility Test</h3>
              <p className="text-xs text-gray-400">Choose mode & how many questions you want to answer together!</p>
            </div>

            {/* Mode selection: Friends vs Romantic Partner */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHostSetupMode('friends')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                  hostSetupMode === 'friends'
                    ? 'bg-pink-600/30 border-pink-500 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">👥</span>
                <span>Best Friends</span>
              </button>

              <button
                type="button"
                onClick={() => setHostSetupMode('partner')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                  hostSetupMode === 'partner'
                    ? 'bg-pink-600/30 border-pink-500 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">💖</span>
                <span>Romantic Partner</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-300 text-left">Question Length</span>
              <div className="grid grid-cols-3 gap-3">
                {[5, 10, 15].map((count) => (
                  <button
                    key={count}
                    onClick={() => handleStartGame(count, hostSetupMode)}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-600/40 to-purple-600/40 border border-pink-500/40 hover:from-pink-600/60 hover:to-purple-600/60 transition-all text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md"
                  >
                    <span className="text-base font-black">{count}</span>
                    <span className="text-[10px] text-gray-400">Questions</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GUEST WAITING SCREEN — shown when no questions loaded and is guest (or still determining) */}
        {!loading && !sessionStarted && !isHost && sessionMeta?.status !== 'expired' && (
          <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center animate-pulse">
              <Sparkles className="w-8 h-8 text-pink-400" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white">Waiting for Host...</h3>
              <p className="text-xs text-gray-400 max-w-xs">
                The host hasn't started the test yet. Check back when they've sent a test invitation!
              </p>
            </div>
          </div>
        )}

        {/* EXPIRED SESSION ALERT */}
        {!loading && sessionMeta?.status === 'expired' && (
          <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white">Activity Expired</h3>
              <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                This game invitation has expired because a newer activity was started in the chat room. Please join the latest game invitation message!
              </p>
            </div>
            <button
              onClick={() => window.parent.postMessage({ type: 'MARKANM_SDK_CLOSE' }, '*')}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-white"
            >
              Close Activity
            </button>
          </div>
        )}

        {/* 2. QUESTION SCREEN */}
        {!loading && sessionStarted && !iHaveFinishedAll && !isCompleted && sessionMeta?.status !== 'expired' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-bold text-gray-400">
              <span>Question {myProgressIdx + 1} of {questions.length}</span>
              <div className="w-28 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 transition-all duration-500"
                  style={{ width: `${((myProgressIdx) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <h3 className="text-base font-bold text-white leading-snug text-left">
              {questions[myProgressIdx]?.question_text || 'Loading question...'}
            </h3>

            <div className="flex flex-col gap-2.5">
              {questions[myProgressIdx]?.options?.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt)}
                  className="p-4 rounded-2xl border text-xs font-semibold text-left transition-all bg-white/5 border-white/10 hover:bg-pink-600/30 hover:border-pink-400 text-gray-200"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. MY TEST DONE — waiting for friend (Locked State) */}
        {!loading && sessionStarted && iHaveFinishedAll && !isCompleted && sessionMeta?.status !== 'expired' && (
          <div className="py-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white">Your Answers Are Locked! 🔒</h3>
              <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                You've answered all {questions.length} questions. Your choices are locked securely and cannot be changed.
              </p>
              <div className="mt-3 p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-xs text-pink-300 font-semibold">Waiting for partner to complete test...</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. COMPATIBILITY REPORT */}
        {!loading && isCompleted && report && (
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center shadow-xl border-4 border-white/20">
                <span className="text-2xl font-black text-white">{report.percent}%</span>
              </div>
              <h3 className="text-lg font-black text-white">
                {report.percent >= 80 ? '💖 Perfect Soulmates!' : report.percent >= 50 ? '✨ Great Synergy!' : '⚡ Opposites Attract!'}
              </h3>
              <p className="text-xs text-gray-400">
                You matched on {report.matches} out of {report.total} questions!
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 text-left">
              <h4 className="text-xs font-bold uppercase tracking-widest text-pink-400">Compatibility Breakdown</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                  <span>Overall Agreement</span>
                  <span className="font-mono text-pink-400 font-bold">{report.percent}%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-1000"
                    style={{ width: `${report.percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1 text-left">
              {questions.map((q, idx) => {
                const a1 = report.u1Ans?.[String(idx)];
                const a2 = report.u2Ans?.[String(idx)];
                const isMatch = a1 && a2 && a1 === a2;
                return (
                  <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1 text-xs">
                    <span className="font-bold text-gray-200">Q{idx + 1}: {q.question_text}</span>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 gap-2">
                      <span className="truncate">P1: {a1 || '—'}</span>
                      <span className="truncate">P2: {a2 || '—'}</span>
                      <span className={`font-bold shrink-0 ${isMatch ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isMatch ? 'Match ✓' : 'Diff ✗'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => window.parent.postMessage({ type: 'MARKANM_SDK_CLOSE' }, '*')}
              className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Close Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

