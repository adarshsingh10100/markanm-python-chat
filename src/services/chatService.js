import { request } from './api';

export const chatService = {
  async getConversations() {
    return await request('/conversations', { method: 'GET' });
  },

  async getConversationDetails(id) {
    return await request(`/conversations/${id}`, { method: 'GET' });
  },

  async createDirectChat(targetUserId) {
    return await request('/conversations/direct', { method: 'POST', body: { target_user_id: targetUserId } });
  },

  // Alias to ensure backwards and forwards compatibility
  async createDirectConversation(targetUserId) {
    return await this.createDirectChat(targetUserId);
  },

  async createGroupChat(name, description, avatarUrl, memberIds) {
    return await request('/conversations/group', {
      method: 'POST',
      body: { name, description, avatar_url: avatarUrl, member_ids: memberIds }
    });
  },

  async updateGroup(id, name, description, avatarUrl) {
    return await request(`/conversations/${id}`, {
      method: 'PATCH',
      body: { name, description, avatar_url: avatarUrl }
    });
  },

  async addMember(convId, targetUserId) {
    return await request(`/conversations/${convId}/members`, { method: 'POST', body: { target_user_id: targetUserId } });
  },

  async removeMember(convId, targetUserId) {
    return await request(`/conversations/${convId}/members/${targetUserId}`, { method: 'DELETE' });
  },

  async leaveGroup(convId) {
    return await request(`/conversations/${convId}/leave`, { method: 'POST' });
  },

  async getMessages(convId, sinceId = 0, beforeId = 0) {
    let url = `/conversations/${convId}/messages?`;
    if (sinceId > 0) url += `since_id=${sinceId}&`;
    if (beforeId > 0) url += `before_id=${beforeId}&`;
    return await request(url, { method: 'GET' });
  },

  async sendMessage(convId, content, replyToId = null, messageType = 'text', metadata = null) {
    let cleanReplyToId = null;
    if (typeof replyToId === 'number' && replyToId > 0) {
      cleanReplyToId = replyToId;
    } else if (typeof replyToId === 'string' && /^\d+$/.test(replyToId) && parseInt(replyToId, 10) > 0) {
      cleanReplyToId = parseInt(replyToId, 10);
    }

    let actualType = messageType;
    if (typeof replyToId === 'string' && ['text', 'image', 'video', 'gif', 'sticker', 'poll'].includes(replyToId)) {
      actualType = replyToId;
      cleanReplyToId = null;
    }

    return await request(`/conversations/${convId}/messages`, {
      method: 'POST',
      body: {
        content,
        reply_to_id: cleanReplyToId,
        message_type: actualType,
        type: actualType,
        metadata
      }
    });
  },

  async editMessage(messageId, content) {
    return await request(`/messages/${messageId}`, { method: 'PATCH', body: { content } });
  },

  async deleteMessage(messageId) {
    return await request(`/messages/${messageId}`, { method: 'DELETE' });
  },

  async toggleReaction(messageId, emoji) {
    return await request(`/messages/${messageId}/reactions`, { method: 'POST', body: { emoji } });
  },

  async updateTypingStatus(convId, isTyping) {
    return await request(`/conversations/${convId}/typing`, { method: 'POST', body: { is_typing: isTyping } });
  }
};
