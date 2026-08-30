import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OTPModal } from '../components/OTPModal';

const GOOGLE_CLIENT_ID = '755697154434-6epavkdgts6c0vaa2iqo69pmpkd4nqdf.apps.googleusercontent.com';

export function LoginPage() {
  const { login, googleLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // OTP Modal state for unverified accounts
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [demoCode, setDemoCode] = useState('');

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    return () => {
      try { document.head.removeChild(script); } catch (e) {}
    };
  }, []);

  const handleGoogleCredential = async (response) => {
    if (!response.credential) return;
    setGoogleLoading(true);
    try {
      await googleLogin(response.credential);
      addToast('Welcome to MarkanM Chat!', 'success');
      navigate(redirectPath);
    } catch (err) {
      addToast(err.message || 'Google sign-in failed. Please try again.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleButtonClick = () => {
    if (!window.google) {
      addToast('Google sign-in is loading, please wait a moment.', 'info');
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: render the button modal
        window.google.accounts.id.renderButton(
          document.getElementById('google-btn-container'),
          { theme: 'filled_black', size: 'large', width: 360, text: 'continue_with' }
        );
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginInput.trim() || !password) {
      addToast('Username/email and password are required', 'error');
      return;
    }

    setLoading(true);
    try {
      await login({ login: loginInput.trim(), password });
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
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Log in to MarkanM</h1>
            <p className="text-xs text-gray-400 mt-1">Connect with friends, groups, and global conversations.</p>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleButtonClick}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl text-sm font-semibold text-white transition-all duration-200 mb-4 disabled:opacity-60"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>
          {/* Hidden container for Google button fallback */}
          <div id="google-btn-container" className="hidden" />

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 font-medium">or sign in with password</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login Form */}
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
                  className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-11 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>

      {/* OTP Verification Modal for unverified accounts */}
      <OTPModal
        isOpen={showOTPModal}
        email={unverifiedEmail}
        demoCode={demoCode}
        onClose={() => setShowOTPModal(false)}
        redirectPath={redirectPath}
      />
    </div>
  );
}
