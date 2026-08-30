import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';

export function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      addToast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Reset Password</h1>
            <p className="text-xs text-gray-400 mt-1">Enter your email and we'll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-base">Check your inbox!</p>
                <p className="text-gray-400 text-sm mt-1">
                  If <span className="text-indigo-300">{email}</span> is registered, you'll receive a password reset link shortly.
                </p>
              </div>
              <p className="text-xs text-gray-500">The link expires in 1 hour. Check your spam folder if you don't see it.</p>
              <Link
                to="/login"
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                ← Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 mt-1 shadow-lg disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400 mt-2">
                Remember your password?{' '}
                <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
