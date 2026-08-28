import React from 'react';
import { Radio, Compass, Gamepad2, Sparkles, ArrowRight } from 'lucide-react';

export function ComingSoonSection() {
  const upcomingFeatures = [
    {
      title: 'Live Conversations',
      update: 'UPDATE 2',
      icon: Radio,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300',
      description: 'Discoverable public audio & text rooms for real-time community broadcasts.'
    },
    {
      title: 'Interactive Experiences',
      update: 'UPDATE 3',
      icon: Gamepad2,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300',
      description: 'Social mini-games, interactive polls, debates, and time capsules within chats.'
    },
    {
      title: 'Platform & Login with MarkanM',
      update: 'UPDATE 4 & 5',
      icon: Compass,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-300',
      description: 'Developer SDK, OAuth identity provider, custom bots, and mini-app ecosystem.'
    }
  ];

  return (
    <div className="w-full mt-8 p-6 glass-panel rounded-3xl border border-white/10 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white tracking-wide">Coming Next on MarkanM</h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          Vision Roadmap
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {upcomingFeatures.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`p-4 rounded-2xl bg-gradient-to-br border transition-all duration-300 relative group overflow-hidden ${item.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-black/40 backdrop-blur-md">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">{item.update}</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
              <p className="text-xs text-gray-300/80 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
