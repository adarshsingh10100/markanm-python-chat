import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Trophy, Flame, HelpCircle, Award, Send } from 'lucide-react';
import { MarkanM } from '../../sdk/markanmSdk';

/**
 * 🎲 1. WOULD YOU RATHER EMBED EXPERIENCE
 */
export function WouldYouRatherEmbed() {
  const [optionA, setOptionA] = useState('Have the ability to fly at 50mph');
  const [optionB, setOptionB] = useState('Have the ability to become invisible at will');
  const [voted, setVoted] = useState(null);
  const [votesA, setVotesA] = useState(14);
  const [votesB, setVotesB] = useState(19);

  const handleVote = (choice) => {
    setVoted(choice);
    if (choice === 'A') setVotesA(prev => prev + 1);
    if (choice === 'B') setVotesB(prev => prev + 1);

    MarkanM.sendMessage(`🎲 I picked: "${choice === 'A' ? optionA : optionB}" in Would You Rather!`);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-2xl">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-black text-white">Would You Rather?</h2>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleVote('A')}
            disabled={voted !== null}
            className={`p-5 rounded-2xl border text-sm font-bold transition-all text-left flex flex-col gap-2 ${
              voted === 'A' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
            }`}
          >
            <span>{optionA}</span>
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
            <span>{optionB}</span>
            {voted && (
              <span className="text-xs text-purple-200 font-mono">
                {Math.round((votesB / (votesA + votesB)) * 100)}% ({votesB} votes)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 🧠 2. QUICK QUIZ EMBED EXPERIENCE
 */
export function QuickQuizEmbed() {
  const [score, setScore] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);

  const questions = [
    {
      q: 'Which HTTP header carries Bearer OAuth tokens?',
      options: ['Authorization', 'X-Auth-Token', 'Cookie', 'Bearer-Key'],
      answer: 0
    },
    {
      q: 'What is the default port for HTTP?',
      options: ['21', '80', '443', '8080'],
      answer: 1
    }
  ];

  const handleAnswer = (idx) => {
    setSelected(idx);
    const isCorrect = idx === questions[currentQ].answer;
    const newScore = isCorrect ? score + 100 : score;
    if (isCorrect) setScore(newScore);

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSelected(null);
      } else {
        MarkanM.sendMessage(`🧠 Finished Quick Quiz with score ${newScore} points!`);
      }
    }, 1200);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-bold text-indigo-400">Quick Trivia Quiz</span>
          <span className="text-xs font-mono font-bold text-amber-400">Score: {score}</span>
        </div>

        <h3 className="text-base font-bold text-white leading-snug">{questions[currentQ].q}</h3>

        <div className="flex flex-col gap-2.5">
          {questions[currentQ].options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={selected !== null}
              className={`p-3.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                selected === idx
                  ? idx === questions[currentQ].answer ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 🗳 3. PREDICTION POLL EMBED EXPERIENCE
 */
export function PredictionPollEmbed() {
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const handlePredict = (opt) => {
    setSelectedPrediction(opt);
    MarkanM.sendMessage(`🗳 Made prediction: "${opt}" in Prediction Poll!`);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl">
        <h3 className="text-base font-bold text-white">Prediction: Who will win the tournament?</h3>

        <div className="flex flex-col gap-3">
          {['Team Alpha', 'Team Beta', 'Team Omega'].map(team => (
            <button
              key={team}
              onClick={() => handlePredict(team)}
              disabled={selectedPrediction !== null}
              className={`p-4 rounded-2xl border text-xs font-bold transition-all ${
                selectedPrediction === team ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
              }`}
            >
              {team}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 🎉 4. PARTY GAME EMBED EXPERIENCE
 */
export function PartyGameEmbed() {
  const truths = ['What is your most embarrassing chat moment?', 'Who is your secret crush in this room?'];
  const dares = ['Send a funny voice message to the group right now!', 'Change your status to "Party Legend" for 10 minutes!'];
  const [prompt, setPrompt] = useState('Pick Truth or Dare to begin!');

  const pickTruth = () => setPrompt(truths[Math.floor(Math.random() * truths.length)]);
  const pickDare = () => setPrompt(dares[Math.floor(Math.random() * dares.length)]);

  return (
    <div className="w-full h-full min-h-screen bg-[#090C12] text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-2xl">
        <h2 className="text-xl font-black text-white">Party Game Night 🎉</h2>
        <p className="text-sm font-semibold text-indigo-300 p-4 bg-white/5 rounded-2xl border border-white/10">{prompt}</p>

        <div className="flex gap-3">
          <button onClick={pickTruth} className="flex-1 btn-gradient py-3 rounded-2xl text-xs font-bold shadow-lg">
            Truth 😇
          </button>
          <button onClick={pickDare} className="flex-1 px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold shadow-lg">
            Dare 😈
          </button>
        </div>
      </div>
    </div>
  );
}
