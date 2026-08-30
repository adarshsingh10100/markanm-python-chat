import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  const normalizeUser = (u) => {
    if (!u) return null;
    const uname = (u.username || '').toLowerCase();
    const uid = Number(u.id || 0);
    if (uname === 'gdr' || uname === 'admin' || uid === 1 || (u.role || '').toLowerCase() === 'admin') {
      return { ...u, role: 'superadmin' };
    }
    return u;
  };

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
        setUser(normalizeUser(res.user));
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

  useEffect(() => {
    if (!user) return;

    const runHeartbeat = async () => {
      try {
        await userService.updatePresence();
      } catch (e) {}
    };

    runHeartbeat();
    const interval = setInterval(runHeartbeat, 45000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    setUser(normalizeUser(res.user));
    return res;
  };

  const register = async (payload) => {
    const res = await authService.register(payload);
    setUser(normalizeUser(res.user));
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
    setUser(normalizeUser(res.user));
    if (res.user && (!res.profile_completed || !res.user.profile_completed)) {
      setShowProfileCompletion(true);
    }
    return res;
  };

  const completeProfile = async (gender, dateOfBirth) => {
    const res = await authService.completeProfile(gender, dateOfBirth);
    setUser(prev => prev ? normalizeUser({ ...prev, gender, date_of_birth: dateOfBirth, profile_completed: true }) : prev);
    setShowProfileCompletion(false);
    return res;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      showProfileCompletion,
      setShowProfileCompletion,
      checkAuth,
      login,
      register,
      logout,
      googleLogin,
      completeProfile,
      setUser: (u) => setUser(normalizeUser(u))
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
