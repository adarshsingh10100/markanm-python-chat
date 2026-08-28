import { request } from './api';

export const authService = {
  async register(payload) {
    return await request('/auth/register', { method: 'POST', body: payload });
  },

  async verifyOTP(email, code) {
    const res = await request('/auth/verify-otp', { method: 'POST', body: { email, code, otp: code } });
    if (res.token) {
      localStorage.setItem('markanm_token', res.token);
    }
    return res;
  },

  async resendOTP(email) {
    return await request('/auth/resend-otp', { method: 'POST', body: { email } });
  },

  async login(payload) {
    const inputVal = payload.identifier || payload.login || payload.username || payload.email || '';
    const body = {
      identifier: inputVal,
      login: inputVal,
      username: inputVal,
      password: payload.password
    };
    const res = await request('/auth/login', { method: 'POST', body });
    if (res.token) {
      localStorage.setItem('markanm_token', res.token);
    }
    return res;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('markanm_token');
    }
  },

  async getMe() {
    return await request('/auth/me', { method: 'GET' });
  }
};
