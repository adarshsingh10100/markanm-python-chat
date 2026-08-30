import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';

export function ResetPasswordPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      addToast('Invalid or missing reset token.', 'error');
    }
  }, [token, addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 6) {
      addToast('Password must be at least 6 characters.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      addToast('Password reset successfully!', 'success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      addToast(err.message || 'Failed to reset password. The link may have expired.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">New Password</h1>
            <p className="text-xs text-gray-400 mt-1">Choose a strong password for your account.</p>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-base">Password Reset!</p>
                <p className="text-gray-400 text-sm mt-1">Your password has been updated. Redirecting to login...</p>
              </div>
              <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                Go to Login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-11 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-9 pr-11 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full btn-gradient py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 mt-1 shadow-lg disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400 mt-1">
                <Link to="/login" className="text-indigo-400 font-semibold hover:underline">← Back to login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
