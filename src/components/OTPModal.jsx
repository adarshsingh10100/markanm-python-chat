import React, { useState, useRef, useEffect } from 'react';
import { Mail, CheckCircle2, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function OTPModal({ isOpen, email, demoCode = '', onClose, redirectPath = '/dashboard' }) {
  const { addToast } = useToast();
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval = null;
    if (isOpen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, resendTimer]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (newOtp.every(digit => digit !== '') && value) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtp(digits);
      digits.forEach((d, i) => {
        if (inputRefs.current[i]) inputRefs.current[i].value = d;
      });
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeToVerify) => {
    const code = typeof codeToVerify === 'string' ? codeToVerify : otp.join('');
    if (!code || code.length !== 6) {
      addToast('Please enter the complete 6-digit verification code.', 'error');
      return;
    }

    setVerifying(true);
    try {
      const res = await authService.verifyOTP(email, code);
      addToast('Email verified successfully! Welcome to MarkanM Chat.', 'success');
      await checkAuth();
      if (onClose) onClose();
      navigate(redirectPath);
    } catch (err) {
      addToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      await authService.resendOTP(email);
      addToast('A new 6-digit code has been sent to your email!', 'success');
      setResendTimer(60);
    } catch (err) {
      addToast(err.message || 'Failed to resend code', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-1">Verify Your Email</h2>
        <p className="text-xs text-gray-400 max-w-xs mb-6">
          We sent a 6-digit security code to <span className="text-indigo-300 font-semibold">{email}</span>.
        </p>

        {/* 6-Digit Pin Input Boxes */}
        <div className="flex items-center justify-center gap-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => inputRefs.current[idx] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              className="w-11 h-13 text-center text-xl font-bold bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleVerify()}
          disabled={verifying}
          className="w-full btn-gradient py-3.5 rounded-2xl text-xs font-bold transition-all shadow-xl hover:scale-[1.01]"
        >
          {verifying ? 'Verifying Code...' : 'Verify & Continue'}
        </button>

        {/* Resend Timer */}
        <div className="mt-6 flex items-center gap-2 text-xs">
          <span className="text-gray-400">Didn't receive code?</span>
          <button
            onClick={handleResend}
            disabled={resendTimer > 0 || resending}
            className={`font-semibold flex items-center gap-1 transition-colors ${
              resendTimer > 0 || resending
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}</span>
          </button>
        </div>

        {/* Demo fallback helper notice */}
        {demoCode && (
          <div className="mt-4 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300">
            <span>Dev Helper Code: </span>
            <strong className="font-mono text-white text-xs">{demoCode}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
