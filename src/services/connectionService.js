import { request } from './api';

export const connectionService = {
  async getConnections() {
    return await request('/connections', { method: 'GET' });
  },

  async sendRequest(targetUserId) {
    return await request('/connections/request', { method: 'POST', body: { target_user_id: targetUserId } });
  },

  async acceptRequest(connectionId) {
    return await request('/connections/accept', { method: 'POST', body: { connection_id: connectionId } });
  },

  async rejectRequest(connectionId) {
    return await request('/connections/reject', { method: 'POST', body: { connection_id: connectionId } });
  },

  async removeConnection(connectionId) {
    return await request(`/connections/${connectionId}`, { method: 'DELETE' });
  }
};
