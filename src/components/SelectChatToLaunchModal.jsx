import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, MessageSquare, Play, Sparkles, Loader2, Users, Heart } from 'lucide-react';
import { chatService } from '../services/chatService';
import { experienceService } from '../services/experienceService';
import { request } from '../services/api';
import { Avatar } from './Avatar';
import { useToast } from '../context/ToastContext';

export function SelectChatToLaunchModal({ isOpen, onClose, experience, onLaunchSuccess }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Host Configuration Options (for Compatibility Test / Games)
  const [testMode, setTestMode] = useState('friends'); // 'friends' | 'partner'
  const [questionCount, setQuestionCount] = useState(10); // 5 | 10 | 15

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await chatService.getConversations();
      setConversations(res.conversations || []);
      if (res.conversations && res.conversations.length > 0) {
        setSelectedConvId(res.conversations[0].id);
      }
    } catch (e) {
      addToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !experience) return null;

  const filtered = conversations.filter(c => {
    const title = c.type === 'direct' ? c.counterpart?.display_name || c.counterpart?.username : c.title;
    return title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleLaunch = async () => {
    if (!selectedConvId) return;
    setSubmitting(true);
    try {
      const selectedConv = conversations.find(c => c.id === selectedConvId);

      let payload = null;

      if (experience.slug === 'rock-paper-scissors') {
        payload = JSON.stringify({
          game_type: 'rps',
          game_id: 'rps_' + Date.now(),
          p1_id: null,
          p1_name: null,
          p1_move: null,
          p2_id: null,
          p2_name: null,
          p2_move: null,
          status: 'waiting'
        });
      } else if (experience.slug === 'tic-tac-toe') {
        payload = JSON.stringify({
          game_type: 'tictactoe',
          game_id: 'ttt_' + Date.now(),
          p1_id: null,
          p1_name: null,
          p2_id: null,
          p2_name: null,
          board: Array(9).fill(null),
          turn: 'X',
          status: 'playing',
          winner: null
        });
      } else if (experience.slug === 'compatibility-test') {
        const catParam = testMode === 'partner' ? 'Love' : 'Lifestyle';
        let selectedQs = [];
        try {
          const qRes = await request(`/experiences/questions?game_slug=compatibility-test&category=${catParam}&conversation_id=${selectedConvId}`);
          selectedQs = (qRes.questions || []).map(q => ({ id: q.id, q: q.question_text, opts: q.options })).slice(0, questionCount);
        } catch (e) {}

        if (selectedQs.length === 0) {
          const fallbackLove = [
            { id: 101, q: "What makes you feel most loved by someone?", opts: ["Words of affirmation & sweet compliments", "Quality uninterrupted time together", "Thoughtful gestures & helpful support", "Surprises & meaningful gifts"] },
            { id: 102, q: "What is most important in a long-term romantic relationship?", opts: ["Trust & absolute honesty", "Deep emotional communication", "Shared life goals & values", "Spark, chemistry & passion"] },
            { id: 103, q: "How often do you ideally like to spend time with your partner?", opts: ["Almost every single day", "A few times a week", "Mostly weekends", "A healthy mix of together and alone time"] },
            { id: 104, q: "How do you prefer your partner to apologize after an argument?", opts: ["Say sorry directly & sincerely", "Explain what happened & talk it out", "Show change through actions", "Give me space to cool down first"] },
            { id: 105, q: "What kind of date sounds most ideal to you?", opts: ["Fancy dinner out at a nice restaurant", "Cozy movie night & cooking at home", "Outdoor adventure or traveling", "Simple walk and deep conversation"] }
          ];
          const fallbackFriends = [
            { id: 201, q: "What is the best way to spend a hangout weekend with friends?", opts: ["Road trip or outdoor trip", "Chill movie/gaming night at home", "Exploring food spots & cafes", "Attending concerts or events"] },
            { id: 202, q: "How quickly do you reply to group messages?", opts: ["Immediately within minutes", "Within a few hours", "Whenever I am free", "Only when directly tagged"] },
            { id: 203, q: "What describes your personality in a friend group?", opts: ["The Planner & organizer", "The Funny spontaneous one", "The Listener & advisor", "The Chill go-with-the-flow one"] },
            { id: 204, q: "What type of humor do you connect with most?", opts: ["Witty & sarcastic banter", "Silly & lighthearted humor", "Dry & observational", "Dark humor & memes"] },
            { id: 205, q: "How do you handle last-minute spontaneous hangout plans?", opts: ["Love it! I'm ready in 5 minutes!", "Need a bit of advance notice", "Prefer planned schedules", "Depends on my mood & energy"] }
          ];
          selectedQs = (testMode === 'partner' ? fallbackLove : fallbackFriends).slice(0, questionCount);
        }

        payload = JSON.stringify({
          game_type: 'compat_test',
          game_id: 'compat_' + Date.now(),
          test_mode: testMode,
          questions: selectedQs,
          p1_id: null,
          p1_name: null,
          p1_answers: {},
          p2_id: null,
          p2_name: null,
          p2_answers: {},
          status: 'in_progress'
        });
      } else if (experience.slug === 'quick-quiz') {
        let selectedQs = [];
        try {
          const qRes = await request(`/experiences/questions?game_slug=quiz&category=All&conversation_id=${selectedConvId}`);
          selectedQs = (qRes.questions || []).map(q => ({ id: q.id, q: q.question_text, opts: q.options, correct: q.correct_index ?? 0 })).slice(0, questionCount);
        } catch (e) {}

        if (selectedQs.length === 0) {
          selectedQs = [
            { id: 9001, q: 'Which planet is known as the Red Planet?', opts: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correct: 0 },
            { id: 9002, q: 'What is the capital city of Japan?', opts: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], correct: 2 },
            { id: 9003, q: 'How many sides does a hexagon have?', opts: ['5', '6', '7', '8'], correct: 1 },
            { id: 9004, q: 'Who wrote Romeo and Juliet?', opts: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], correct: 1 },
            { id: 9005, q: 'What is the chemical symbol for Gold?', opts: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 }
          ].slice(0, questionCount);
        }

        payload = JSON.stringify({
          game_type: 'quiz_test',
          game_id: 'quiz_' + Date.now(),
          questions: selectedQs,
          p1_id: null,
          p1_name: null,
          p1_answers: {},
          p2_id: null,
          p2_name: null,
          p2_answers: {},
          status: 'in_progress'
        });
      } else {
        payload = `🎮 Started Activity: ${experience.name}!`;
      }

      await chatService.sendMessage(selectedConvId, payload);

      addToast(`Game posted to chat!`, 'success');
      onClose();

      const targetPath = selectedConv?.type === 'direct' && selectedConv?.counterpart?.username
        ? `/chat/@${selectedConv.counterpart.username}`
        : `/chat`;

      navigate(targetPath, {
        state: {
          activeExp: experience,
          convId: selectedConvId
        }
      });

      if (onLaunchSuccess) {
        onLaunchSuccess(experience, sessionCode);
      }
    } catch (err) {
      addToast(err.message || 'Failed to launch activity', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isCompat = experience.slug === 'compatibility-test';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl relative text-left flex flex-col gap-3.5 my-auto max-h-[92dvh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-white truncate">Configure & Start Activity</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Experience Preview Header */}
        <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-2xl flex items-center gap-3 shrink-0">
          <img src={experience.icon_url} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shrink-0" />
          <div className="flex flex-col min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{experience.name}</h4>
            <p className="text-[10px] text-indigo-300 truncate">{experience.tagline}</p>
          </div>
        </div>

        {/* HOST GAME CONFIGURATION (Compatibility Test) */}
        {isCompat && (
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 shrink-0">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">1. Select Relationship Type:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTestMode('friends')}
                  className={`p-2.5 rounded-xl border text-left font-bold flex flex-col gap-0.5 transition-all ${
                    testMode === 'friends' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px]">👥 Best Friends</span>
                  <span className="text-[9px] opacity-75 font-normal">Hangout & habits</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTestMode('partner')}
                  className={`p-2.5 rounded-xl border text-left font-bold flex flex-col gap-0.5 transition-all ${
                    testMode === 'partner' ? 'bg-pink-600 border-pink-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px]">💖 Life Partner</span>
                  <span className="text-[9px] opacity-75 font-normal">Love & long-term goals</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">2. Select Round Length:</label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      questionCount === cnt
                        ? 'bg-pink-600 border-pink-400 text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search friends or groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Conversation List */}
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading your chats...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No active conversations found. Start a conversation in Chats first!
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-40 sm:max-h-48 overflow-y-auto pr-1">
            {filtered.map(conv => {
              const title = conv.type === 'direct'
                ? conv.counterpart?.display_name || conv.counterpart?.username
                : conv.title;
              const isSelected = selectedConvId === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Avatar
                    src={conv.type === 'direct' ? conv.counterpart?.avatar_url : conv.icon_url}
                    name={title}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold truncate">{title}</h5>
                    <span className="text-[10px] text-gray-400 capitalize">{conv.type} chat</span>
                  </div>
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!selectedConvId || submitting}
            className="btn-gradient px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>Launch Activity in Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
