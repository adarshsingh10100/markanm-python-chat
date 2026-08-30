import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('markanm_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authService.getMe();
      if (res.user) {
        setUser(res.user);
        // Show profile completion for Google users who haven't filled in details yet
        if (res.user.google_id && !res.user.profile_completed) {
          setShowProfileCompletion(true);
        }
      } else {
        setUser(null);
      }
    } catch {
      localStorage.removeItem('markanm_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    setUser(res.user);
    return res;
  };

  const register = async (payload) => {
    const res = await authService.register(payload);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setShowProfileCompletion(false);
    }
  };

  const googleLogin = async (credential) => {
    const res = await authService.googleLogin(credential);
    setUser(res.user);
    // If new Google user without profile completion, show the modal
    if (res.user && (!res.profile_completed || !res.user.profile_completed)) {
      setShowProfileCompletion(true);
    }
    return res;
  };

  const completeProfile = async (gender, dateOfBirth) => {
    const res = await authService.completeProfile(gender, dateOfBirth);
    setUser(prev => prev ? { ...prev, gender, date_of_birth: dateOfBirth, profile_completed: true } : prev);
    setShowProfileCompletion(false);
    return res;
  };

  const updateUserProfile = (updatedFields) => {
    setUser(prev => prev ? { ...prev, ...updatedFields } : prev);
  };

  const dismissProfileCompletion = () => setShowProfileCompletion(false);

  // Derived geo/timezone values
  const userTimezone = user?.timezone || 'Asia/Kolkata';
  const userCountryCode = user?.country_code || null;
  const userCountryName = user?.country_name || null;
  const userCity = user?.city || null;

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, checkAuth, updateUserProfile,
      googleLogin, completeProfile,
      showProfileCompletion, dismissProfileCompletion,
      userTimezone, userCountryCode, userCountryName, userCity
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
