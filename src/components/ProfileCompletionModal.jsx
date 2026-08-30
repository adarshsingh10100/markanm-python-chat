import React, { useState } from 'react';
import { X, User, Calendar, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'trans', label: 'Trans / Non-binary', emoji: '🏳️‍⚧️' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🤍' },
];

export function ProfileCompletionModal({ isOpen }) {
  const { completeProfile, dismissProfileCompletion, user } = useAuth();
  const { addToast } = useToast();

  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = gender, 2 = DOB

  if (!isOpen) return null;

  const handleGenderSelect = (val) => {
    setGender(val);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gender) {
      addToast('Please select a gender option.', 'error');
      return;
    }
    setLoading(true);
    try {
      await completeProfile(gender, dob);
      addToast('Profile updated! Welcome to MarkanM 🎉', 'success');
    } catch (err) {
      addToast(err.message || 'Could not save profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent pointer-events-none rounded-3xl" />

        {/* Skip button */}
        <button
          onClick={dismissProfileCompletion}
          className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 mb-3">
              <User className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-white">
              {step === 1 ? 'Tell us about yourself' : 'When were you born?'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {step === 1
                ? `Welcome, ${user?.display_name?.split(' ')[0] || 'there'}! This helps personalise your experience.`
                : 'Your date of birth helps with age-appropriate content.'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-6 h-1.5 rounded-full bg-indigo-500" />
            <div className={`w-6 h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-indigo-500' : 'bg-white/10'}`} />
          </div>

          {step === 1 ? (
            /* Gender Selection */
            <div className="flex flex-col gap-2.5">
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleGenderSelect(opt.value)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                    gender === opt.value
                      ? 'bg-indigo-600/25 border-indigo-500/60 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Date of Birth */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  style={{ colorScheme: 'dark' }}
                />
                <p className="text-[10px] text-gray-500 mt-1">You must be at least 13 years old. Optional but recommended.</p>
              </div>

              <div className="text-xs text-gray-500 bg-white/5 rounded-2xl p-3 border border-white/8">
                <p className="flex items-center gap-1.5"><Heart className="w-3 h-3 text-pink-400" /> Selected: <span className="text-white font-medium">{GENDER_OPTIONS.find(g => g.value === gender)?.label}</span></p>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-2xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold btn-gradient transition-all disabled:opacity-70 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Complete Profile 🎉'
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSubmit({ preventDefault: () => {} })}
                className="text-xs text-gray-500 hover:text-gray-400 text-center transition-colors mt-1"
              >
                Skip date of birth
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
