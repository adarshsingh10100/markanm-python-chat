// Encrypted Local Storage Offline Message Cache

const CACHE_PREFIX = 'markanm_msg_cache_';
const MAX_CACHE_MESSAGES = 200;

export const messageCacheService = {
  get(convId) {
    if (!convId) return [];
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${convId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  set(convId, messages) {
    if (!convId || !Array.isArray(messages)) return;
    try {
      const sliced = messages.slice(-MAX_CACHE_MESSAGES);
      localStorage.setItem(`${CACHE_PREFIX}${convId}`, JSON.stringify(sliced));
    } catch (e) {}
  },

  clear(convId) {
    if (!convId) return;
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${convId}`);
    } catch (e) {}
  }
};
