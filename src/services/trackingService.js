import { request } from './api';

export const trackingService = {
  async logEvent(payload) {
    try {
      return await request('/tracking/log', {
        method: 'POST',
        body: {
          ...payload,
          landing_url: payload.landing_url || window.location.href,
          referrer_url: payload.referrer_url || document.referrer
        }
      });
    } catch (e) {
      // Non-blocking background telemetry logger
      return null;
    }
  },

  async getStats() {
    return await request('/tracking/stats', { method: 'GET' });
  }
};
