import { request } from './api';

export const userService = {
  async searchUsers(query) {
    return await request(`/users/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
  },

  async getProfile(username) {
    return await request(`/users/@${encodeURIComponent(username)}`, { method: 'GET' });
  },

  async updateProfile(payload) {
    return await request('/users/profile', { method: 'PATCH', body: payload });
  },

  async uploadAvatar(formData) {
    return await request('/users/avatar', { method: 'POST', body: formData });
  },

  async uploadBanner(formData) {
    return await request('/users/banner', { method: 'POST', body: formData });
  },

  async inviteByEmail(email) {
    return await request('/users/invite-email', { method: 'POST', body: { email } });
  },

  async getBots() {
    return await request('/bots', { method: 'GET' });
  },

  async heartbeat() {
    return await request('/presence/heartbeat', { method: 'POST' });
  },

  async getAiKeys() {
    return await request('/settings/ai-keys', { method: 'GET' });
  },

  async saveAiKey(provider, apiKey) {
    return await request('/settings/ai-keys', { method: 'POST', body: { provider, api_key: apiKey } });
  },

  async deleteAiKey(provider) {
    return await request(`/settings/ai-keys/${encodeURIComponent(provider)}`, { method: 'DELETE' });
  }
};
