import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OTPModal } from '../components/OTPModal';

export function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Modal state for unverified accounts trying to log in
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [demoCode, setDemoCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginInput.trim() || !password) {
      addToast('Username/email and password are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ login: loginInput.trim(), password });
      addToast('Welcome back to MarkanM Chat!', 'success');
      navigate(redirectPath);
    } catch (err) {
      if (err.details?.requires_otp) {
        setUnverifiedEmail(err.details.email || loginInput);
        setDemoCode(err.details.otp_demo || '');
        setShowOTPModal(true);
        addToast(err.message || 'Please verify your email code to continue.', 'info');
      } else {
        addToast(err.message || 'Login failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Log in to MarkanM</h1>
          <p className="text-xs text-gray-400 mt-1">Connect with friends, groups, and global conversations.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="alex or alex@example.com"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gradient py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 mt-2 shadow-lg"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
            Register here
          </Link>
        </p>

        {/* OTP Verification Modal for unverified accounts */}
        <OTPModal
          isOpen={showOTPModal}
          email={unverifiedEmail}
          demoCode={demoCode}
          onClose={() => setShowOTPModal(false)}
          redirectPath={redirectPath}
        />
      </div>
    </div>
  );
}
