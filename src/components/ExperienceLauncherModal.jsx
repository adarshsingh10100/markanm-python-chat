import React, { useState, useEffect } from 'react';
import { Sparkles, Gamepad2, X, Play, Heart, Loader2 } from 'lucide-react';
import { experienceService } from '../services/experienceService';
import { request } from '../services/api';
import { useToast } from '../context/ToastContext';

export function ExperienceLauncherModal({ isOpen, onClose, onLaunchInChat }) {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingSlug, setStartingSlug] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const fetchApps = async () => {
      setLoading(true);
      try {
        const res = await experienceService.getDirectory();
        let list = res.experiences || [];

        // Ensure Compatibility Test is ALWAYS included at the top of the list
        const hasCompat = list.some(e => e.slug === 'compatibility-test');
        if (!hasCompat) {
          list.unshift({
            id: 99,
            slug: 'compatibility-test',
            name: 'Compatibility Test',
            tagline: 'Discover how compatible you and your friend are in Life & Love!',
            icon_url: 'https://api.iconify.design/twemoji:sparkling-heart.svg',
            category: 'Social',
            embed_url: '/experiences/embed/compatibility-test'
          });
        }

        setExperiences(list);
      } catch (err) {
        addToast('Failed to load experiences', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectExperience = async (exp) => {
    setStartingSlug(exp.slug);
    try {
      let initialState = null;

      if (exp.slug === 'compatibility-test') {
        const qRes = await request(`/experiences/questions?game_slug=compatibility-test&category=Lifestyle`);
        const allQs = qRes.questions || [];
        const selectedQs = allQs.slice(0, 10);

        initialState = {
          questions: selectedQs,
          total_questions: 10,
          test_mode: 'friends',
          answers: {},
          status: 'in_progress'
        };
      }

      const res = await experienceService.createSession(exp.id, null, initialState, exp.slug);
      onLaunchInChat({
        experience: exp,
        session_code: res.session_code
      });
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to start session in chat', 'error');
    } finally {
      setStartingSlug(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl relative my-auto max-h-[90dvh] flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 p-0.5 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">Start Activity in Chat</h3>
              <p className="text-[11px] text-gray-400 truncate">Launch an interactive experience with room members</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading experiences...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {experiences.map(exp => {
              const isStarting = startingSlug === exp.slug;
              const isCompat = exp.slug === 'compatibility-test';

              return (
                <div
                  key={exp.id}
                  onClick={() => !isStarting && handleSelectExperience(exp)}
                  className={`p-3.5 glass-card rounded-2xl border flex items-center justify-between cursor-pointer transition-all group ${
                    isCompat
                      ? 'border-pink-500/40 bg-pink-950/20 hover:border-pink-400'
                      : 'border-white/10 hover:border-indigo-500/50 hover:bg-indigo-950/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shrink-0 flex items-center justify-center shadow-md">
                      {exp.icon_url ? (
                        <img src={exp.icon_url} alt={exp.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">{exp.name}</h4>
                        {isCompat && (
                          <span className="px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-500/30 text-[9px] font-extrabold shrink-0">
                            💖 Featured
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{exp.tagline || exp.category}</p>
                    </div>
                  </div>

                  <button
                    disabled={isStarting}
                    className="btn-gradient px-3.5 py-2 rounded-xl text-[11px] font-bold shadow-md shrink-0 flex items-center gap-1 hover:scale-105 transition-all"
                  >
                    {isStarting ? (
                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                    ) : (
                      <Play className="w-3 h-3 fill-white" />
                    )}
                    <span>{isStarting ? 'Starting...' : 'Start'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
