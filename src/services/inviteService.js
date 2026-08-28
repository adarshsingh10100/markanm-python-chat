import { request } from './api';

export const inviteService = {
  async createInvite(groupConvId, maxUses = null, expiresInDays = null) {
    return await request(`/groups/${groupConvId}/invites`, {
      method: 'POST',
      body: { max_uses: maxUses, expires_in_days: expiresInDays }
    });
  },

  async getInvitePreview(code) {
    return await request(`/invites/${encodeURIComponent(code)}`, { method: 'GET' });
  },

  async joinGroup(code) {
    return await request(`/invites/${encodeURIComponent(code)}/join`, { method: 'POST' });
  },

  async disableInvite(inviteId) {
    return await request(`/invites/${inviteId}/disable`, { method: 'POST' });
  }
};
