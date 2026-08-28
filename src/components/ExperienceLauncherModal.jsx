import React, { useState, useEffect } from 'react';
import { Sparkles, Gamepad2, X, Play, Plus, CheckCircle2 } from 'lucide-react';
import { experienceService } from '../services/experienceService';
import { useToast } from '../context/ToastContext';

export function ExperienceLauncherModal({ isOpen, onClose, onLaunchInChat }) {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const fetchApps = async () => {
      setLoading(true);
      try {
        const res = await experienceService.getDirectory();
        setExperiences(res.experiences || []);
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
    try {
      const res = await experienceService.createSession(exp.id);
      onLaunchInChat({
        experience: exp,
        session_code: res.session_code
      });
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to start session in chat', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-6 shadow-2xl relative my-8 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 p-0.5 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Start Activity in Chat</h3>
              <p className="text-[11px] text-gray-400">Launch an interactive experience with room members</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading experiences...</div>
        ) : (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1 scrollbar-none">
            {experiences.map(exp => (
              <div
                key={exp.id}
                onClick={() => handleSelectExperience(exp)}
                className="p-3.5 glass-card rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 p-0.5 shrink-0 flex items-center justify-center">
                    {exp.icon_url ? (
                      <img src={exp.icon_url} alt={exp.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">{exp.name}</h4>
                    <p className="text-[11px] text-gray-400 truncate">{exp.tagline || exp.category}</p>
                  </div>
                </div>

                <button className="btn-gradient px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-md shrink-0 flex items-center gap-1">
                  <Play className="w-3 h-3 fill-white" />
                  <span>Start</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
