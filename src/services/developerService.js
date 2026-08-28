import { request } from './api';

export const developerService = {
  async toggleDeveloperStatus(enabled, companyName = '', websiteUrl = '') {
    return await request('/developer/toggle-status', {
      method: 'POST',
      body: { enabled, company_name: companyName, website_url: websiteUrl }
    });
  },

  async activateDeveloper(companyName = '', websiteUrl = '') {
    return await this.toggleDeveloperStatus(true, companyName, websiteUrl);
  },

  async getApps() {
    return await request('/developer/apps', { method: 'GET' });
  },

  async createApp(payload) {
    return await request('/developer/apps', {
      method: 'POST',
      body: payload
    });
  },

  async getAppDetails(appId) {
    return await request(`/developer/apps/${appId}`, { method: 'GET' });
  },

  async updateApp(appId, payload) {
    return await request(`/developer/apps/${appId}`, {
      method: 'PATCH',
      body: payload
    });
  },

  async rotateSecret(appId) {
    return await request(`/developer/apps/${appId}/rotate-secret`, { method: 'POST' });
  },

  async deleteApp(appId) {
    return await request(`/developer/apps/${appId}`, { method: 'DELETE' });
  },

  async getAppUsage(appId) {
    return await request(`/developer/apps/${appId}/usage`, { method: 'GET' });
  },

  async saveWebhook(appId, url, events) {
    return await request(`/developer/apps/${appId}/webhooks`, {
      method: 'POST',
      body: { url, events }
    });
  },

  async testWebhook(webhookId) {
    return await request(`/developer/webhooks/${webhookId}/test`, { method: 'POST' });
  },

  // OAuth 2.0 Client & Consent Calls
  async getAuthorizeInfo(clientId, redirectUri, scope = '', state = '') {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state
    });
    return await request(`/oauth/authorize-info?${params.toString()}`, { method: 'GET' });
  },

  async authorizeApp(clientId, redirectUri, scope = '', state = '', codeChallenge = '', codeChallengeMethod = 'S256') {
    return await request('/oauth/authorize', {
      method: 'POST',
      body: {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod
      }
    });
  },

  async exchangeToken(clientId, clientSecret, code, redirectUri, codeVerifier = '') {
    return await request('/oauth/token', {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      }
    });
  },

  async getConnectedApps() {
    return await request('/user/connected-apps', { method: 'GET' });
  },

  async revokeAppAccess(appId) {
    return await request(`/user/connected-apps/${appId}/revoke`, { method: 'POST' });
  }
};
