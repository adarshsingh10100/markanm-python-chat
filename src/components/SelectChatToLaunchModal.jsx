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

      // Pre-fetch synchronized question set for game experiences
      let initialState = null;
      let modeLabel = '';

      if (experience.slug === 'compatibility-test') {
        const catParam = testMode === 'partner' ? 'Love' : 'Lifestyle';
        modeLabel = testMode === 'partner' ? '💖 Romantic Partner' : '👥 Best Friends';

        let selectedQs = [];
        try {
          const qRes = await request(`/experiences/questions?game_slug=compatibility-test&category=${catParam}`);
          selectedQs = (qRes.questions || []).slice(0, questionCount);
        } catch (e) {}

        if (selectedQs.length === 0) {
          const fallbackLove = [
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

          const fallbackFriends = [
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

          const pool = testMode === 'partner' ? fallbackLove : fallbackFriends;
          selectedQs = pool.slice(0, questionCount);
        }

        initialState = {
          questions: selectedQs,
          total_questions: selectedQs.length,
          test_mode: testMode,
          answers: {},
          status: 'in_progress'
        };
      }

      const res = await experienceService.createSession(experience.id, selectedConvId, initialState, experience.slug);
      const sessionCode = res.session_code;

      // Post invitation message directly into chat room
      const msgText = experience.slug === 'compatibility-test'
        ? `🎮 Compatibility Test Started (${questionCount} Questions - ${modeLabel})! Session #${sessionCode}`
        : `🎮 Started Activity: ${experience.name}! Session #${sessionCode}`;

      await chatService.sendMessage(selectedConvId, msgText);

      addToast(`Activity launched in chat!`, 'success');
      onClose();

      const targetPath = selectedConv?.type === 'direct' && selectedConv?.counterpart?.username
        ? `/chat/@${selectedConv.counterpart.username}`
        : `/chat`;

      navigate(targetPath, {
        state: {
          activeExp: experience,
          sessionCode: sessionCode,
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
