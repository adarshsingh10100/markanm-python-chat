import React from 'react';
import { X, Sparkles, CheckCircle2, Clock, Zap } from 'lucide-react';
import { ROADMAP_CONFIG } from '../config/roadmapConfig';

export function RoadmapModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const { currentUpdateNumber, totalUpdates, stages } = ROADMAP_CONFIG;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-indigo-500/30 p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">MarkanM Product Roadmap</h2>
              <p className="text-xs text-indigo-300 font-semibold">
                Stage {currentUpdateNumber} of {totalUpdates} Major Updates • {totalUpdates - currentUpdateNumber} remaining
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Stage Indicator Bar */}
        <div className="my-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-extrabold text-white">
            <span>Overall Product Stage Progress</span>
            <span className="text-indigo-400">{currentUpdateNumber} of {totalUpdates} Updates</span>
          </div>

          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${(currentUpdateNumber / totalUpdates) * 100}%` }}
            />
          </div>
        </div>

        {/* Timeline Stages */}
        <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
          {stages.map(stage => {
            const isCompleted = stage.status === 'completed';
            const isInProgress = stage.status === 'in_progress';

            return (
              <div
                key={stage.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 relative overflow-hidden ${
                  isInProgress
                    ? 'bg-indigo-600/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/5 border-white/10 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-400 font-mono">{stage.number}</span>
                    <h3 className="text-sm font-extrabold text-white">{stage.title}</h3>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      isInProgress
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {stage.badge}
                  </span>
                </div>

                <p className="text-xs font-semibold text-indigo-200">{stage.subtitle}</p>
                <p className="text-[11px] text-gray-300 leading-relaxed">{stage.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
          <span>MarkanM Chat v0.3.0 • Update 3</span>
          <button
            onClick={onClose}
            className="btn-gradient px-5 py-2 rounded-xl font-bold text-white text-xs"
          >
            Close Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}
