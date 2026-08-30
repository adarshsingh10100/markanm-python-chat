import { request } from './api';

export const adminService = {
  async getStats() {
    return request('/admin/api/stats');
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/api/users?${query}`);
  },

  async getUserDetail(id) {
    return request(`/admin/api/users/${id}`);
  },

  async suspendUser(id, data) {
    return request(`/admin/api/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async banUser(id, data) {
    return request(`/admin/api/users/${id}/ban`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async restoreUser(id) {
    return request(`/admin/api/users/${id}/restore`, {
      method: 'POST'
    });
  },

  async impersonateUser(id, data) {
    return request(`/admin/api/users/${id}/impersonate`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async endImpersonation() {
    return request('/admin/api/impersonate/end', {
      method: 'POST'
    });
  },

  async getActivityLogs(page = 1) {
    return request(`/admin/api/logs/activity?page=${page}`);
  },

  async getSecurityLogs() {
    return request('/admin/api/logs/security');
  },

  async getDatabaseTables() {
    return request('/admin/api/database/tables');
  },

  async getDatabaseTableRows(table, page = 1) {
    return request(`/admin/api/database/tables/${table}?page=${page}`);
  },

  async rotateAiKey(data) {
    return request('/admin/api/settings/ai-keys', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async toggleCharacterStatus(id, action) {
    return request(`/admin/api/characters/${id}/${action}`, {
      method: 'POST'
    });
  }
};
