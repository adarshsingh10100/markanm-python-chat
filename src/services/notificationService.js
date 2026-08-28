import { request } from './api';

export const notificationService = {
  async getNotifications() {
    return await request('/notifications', { method: 'GET' });
  },

  async markRead(notificationId) {
    return await request('/notifications/read', { method: 'POST', body: { notification_id: notificationId } });
  },

  async markAllRead() {
    return await request('/notifications/read-all', { method: 'POST' });
  }
};
