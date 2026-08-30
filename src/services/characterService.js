import { request } from './api';

export const characterService = {
  /**
   * Fetch character catalogue
   */
  async getCatalog(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/characters?${query}`);
  },

  /**
   * Fetch single character details by slug or ID
   */
  async getBySlug(slug) {
    return request(`/characters/${slug}`);
  },

  async getMyCharacters() {
    return request('/characters/my-characters');
  },

  /**
   * Create custom character
   */
  async createCharacter(data) {
    return request('/characters', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Update custom character
   */
  async updateCharacter(id, data) {
    return request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Retrain character knowledge base
   */
  async retrainCharacter(id, data) {
    return request(`/characters/${id}/retrain`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Delete custom character
   */
  async deleteCharacter(id) {
    return request(`/characters/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Start 1-on-1 DM chat with character
   */
  async startChat(charIdentifier) {
    return request(`/characters/${charIdentifier}/start-chat`, {
      method: 'POST'
    });
  },

  /**
   * Trigger AI chat reply generation
   */
  async generateChatReply(conversationId, characterId = null) {
    return request('/characters/chat-reply', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        character_id: characterId
      })
    });
  },

  /**
   * Toggle favorite character
   */
  async toggleFavorite(characterId) {
    return request(`/characters/${characterId}/favorite`, {
      method: 'POST'
    });
  },

  /**
   * Get character memories for current user
   */
  async getMemories(characterId) {
    return request(`/characters/${characterId}/memories`);
  },

  /**
   * Import batch from AniList
   */
  async importAniList(page = 1, perPage = 25) {
    return request('/admin/characters/import-anilist', {
      method: 'POST',
      body: JSON.stringify({ page, per_page: perPage })
    });
  },

  /**
   * Get images in character image bank
   */
  async getCharacterImages(characterId) {
    return request(`/characters/${characterId}/images`);
  },

  /**
   * Upload image to character image bank
   */
  async uploadCharacterImage(characterId, imageData) {
    return request(`/characters/${characterId}/images`, {
      method: 'POST',
      body: JSON.stringify(imageData)
    });
  },

  /**
   * Get admin image moderation list
   */
  async getAdminImageModeration(status = 'all') {
    return request(`/admin/character-images?status=${status}`);
  },

  /**
   * Update admin image status
   */
  async updateAdminImageStatus(imageId, statusData) {
    return request(`/admin/character-images/${imageId}`, {
      method: 'POST',
      body: JSON.stringify(statusData)
    });
  }
};
