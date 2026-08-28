import { request } from './api';

export const discoverService = {
  async getDiscoverFeed() {
    return await request('/discover', { method: 'GET' });
  },

  async search(query, type = 'all') {
    return await request(`/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`, { method: 'GET' });
  },

  async createRoom(payload) {
    return await request('/rooms', { method: 'POST', body: payload });
  },

  async getRoom(code) {
    return await request(`/rooms/${encodeURIComponent(code)}`, { method: 'GET' });
  },

  async joinRoom(code) {
    return await request(`/rooms/${encodeURIComponent(code)}/join`, { method: 'POST' });
  },

  async leaveRoom(code) {
    return await request(`/rooms/${encodeURIComponent(code)}/leave`, { method: 'POST' });
  },

  async heartbeatRoom(code) {
    try {
      return await request(`/rooms/${encodeURIComponent(code)}/heartbeat`, { method: 'POST' });
    } catch (e) {
      return null;
    }
  },

  async toggleFollowRoom(code) {
    return await request(`/rooms/${encodeURIComponent(code)}/follow`, { method: 'POST' });
  },

  async banRoomUser(code, targetUserId, reason) {
    return await request(`/rooms/${encodeURIComponent(code)}/ban`, {
      method: 'POST',
      body: { target_user_id: targetUserId, reason }
    });
  },

  async createReport(payload) {
    return await request('/reports', { method: 'POST', body: payload });
  },

  async listReports() {
    return await request('/admin/reports', { method: 'GET' });
  },

  async actionReport(reportId, action) {
    return await request('/admin/reports/action', {
      method: 'POST',
      body: { report_id: reportId, action }
    });
  },

  async blockUser(targetUserId) {
    return await request('/users/block', { method: 'POST', body: { target_user_id: targetUserId } });
  },

  async unblockUser(targetUserId) {
    return await request('/users/unblock', { method: 'POST', body: { target_user_id: targetUserId } });
  },

  async getInterests() {
    return await request('/user/interests', { method: 'GET' });
  },

  async updateInterests(interests) {
    return await request('/user/interests', { method: 'POST', body: { interests } });
  },

  async updateMood(mood) {
    return await request('/user/mood', { method: 'POST', body: { mood } });
  }
};
