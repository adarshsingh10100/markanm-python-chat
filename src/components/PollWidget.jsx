import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import { request } from '../services/api';
import { useToast } from '../context/ToastContext';

export function PollWidget({ pollId, initialQuestion }) {
  const { addToast } = useToast();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingOptionId, setVotingOptionId] = useState(null);

  const fetchPoll = async () => {
    try {
      const res = await request(`/polls/${pollId}`, { method: 'GET' });
      setPoll(res.poll);
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pollId) {
      fetchPoll();
    }
  }, [pollId]);

  const handleVote = async (optionId) => {
    setVotingOptionId(optionId);
    try {
      await request(`/polls/${pollId}/vote`, {
        method: 'POST',
        body: { option_id: optionId }
      });
      fetchPoll();
    } catch (err) {
      addToast(err.message || 'Failed to submit vote', 'error');
    } finally {
      setVotingOptionId(null);
    }
  };

  if (loading && !poll) {
    return (
      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-gray-400 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-purple-400 animate-pulse" />
        <span>Loading Poll...</span>
      </div>
    );
  }

  const question = poll?.question || initialQuestion || 'Poll Question';
  const options = poll?.options || [];
  const totalVoters = poll?.total_voters || 0;
  const myVotedOptionIds = poll?.my_voted_option_ids || [];

  return (
    <div className="p-4 glass-card rounded-2xl border border-purple-500/30 bg-purple-950/20 max-w-sm w-full my-1 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Live Poll</span>
        </span>
        <span className="text-[10px] font-semibold text-gray-400">{totalVoters} {totalVoters === 1 ? 'vote' : 'votes'}</span>
      </div>

      <h4 className="text-xs font-bold text-white leading-snug">{question}</h4>

      <div className="flex flex-col gap-2">
        {options.map(opt => {
          const isVoted = myVotedOptionIds.includes(opt.id);
          const percent = totalVoters > 0 ? Math.round((opt.vote_count / totalVoters) * 100) : 0;

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={votingOptionId === opt.id}
              className={`p-2.5 rounded-xl border text-left relative overflow-hidden transition-all group ${
                isVoted
                  ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
              }`}
            >
              {/* Progress fill bar */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-purple-500/20 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />

              <div className="relative z-10 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 min-w-0 pr-2">
                  {isVoted && <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                  <span className="truncate">{opt.option_text}</span>
                </span>
                <span className="text-[10px] font-extrabold text-purple-300 shrink-0">{percent}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
