import { request } from './api';

export const experienceService = {
  // Public directory listing
  getDirectory: async (category = '', search = '', filter = 'trending') => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('q', search);
    if (filter) params.append('filter', filter);
    return await request(`/experiences?${params.toString()}`);
  },

  // Get single experience details
  getBySlug: async (slug) => {
    return await request(`/experiences/${slug}`);
  },

  // Install experience
  install: async (expId, conversationId = null) => {
    return await request(`/experiences/${expId}/install`, {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId })
    });
  },

  // Uninstall experience
  uninstall: async (expId) => {
    return await request(`/experiences/${expId}/uninstall`, { method: 'DELETE' });
  },

  // List user installed experiences
  getUserExperiences: async () => {
    return await request('/user/experiences');
  },

  // Create live session
  createSession: async (expId, conversationId = null, initialState = null) => {
    return await request('/v1/experiences/sessions', {
      method: 'POST',
      body: JSON.stringify({
        experience_id: expId,
        conversation_id: conversationId,
        initial_state: initialState
      })
    });
  },

  // Get session state & members
  getSessionState: async (sessionCode) => {
    return await request(`/v1/experiences/sessions/${sessionCode}`);
  },

  // Join session
  joinSession: async (sessionCode) => {
    return await request(`/v1/experiences/sessions/${sessionCode}/join`, { method: 'POST' });
  },

  // Sync state & score
  updateSessionState: async (sessionCode, state, score = null) => {
    return await request(`/v1/experiences/sessions/${sessionCode}/state`, {
      method: 'POST',
      body: JSON.stringify({ state, score })
    });
  },

  // Review experience
  submitReview: async (expId, rating, comment = '') => {
    return await request(`/experiences/${expId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
  },

  // Developer submit experience
  createExperience: async (data) => {
    return await request('/developer/experiences', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Admin review experience status
  adminReview: async (expId, status) => {
    return await request(`/admin/experiences/${expId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  // Execute bot slash command
  executeBotCommand: async (botUsername, command, conversationId = null) => {
    return await request('/bots/commands/execute', {
      method: 'POST',
      body: JSON.stringify({
        bot_username: botUsername,
        command,
        conversation_id: conversationId
      })
    });
  }
};
