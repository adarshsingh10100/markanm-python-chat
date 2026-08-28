/**
 * MarkanM Experience SDK v1.0
 * Official Client SDK for MarkanM Chat Experiences & Mini Apps
 */
class MarkanMExperienceSDK {
  constructor() {
    this.sessionCode = null;
    this.user = null;
    this.listeners = {};
    this.isInitialized = false;

    // Listen for postMessage events from MarkanM Parent Window
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => this._handleParentMessage(event));
    }
  }

  /**
   * Initialize Experience SDK session
   */
  init(config = {}) {
    return new Promise((resolve) => {
      this.sessionCode = config.sessionCode || null;

      this._postToParent({ type: 'MARKANM_INIT', sessionCode: this.sessionCode });

      this.on('init_response', (data) => {
        this.user = data.user || null;
        this.isInitialized = true;
        resolve(data);
      });
    });
  }

  /**
   * Get current authenticated user details
   */
  getUser() {
    return this.user;
  }

  /**
   * Update live session state and score
   */
  updateState(state, score = null) {
    this._postToParent({
      type: 'MARKANM_UPDATE_STATE',
      sessionCode: this.sessionCode,
      state,
      score
    });
  }

  /**
   * Send an interactive chat message back to the conversation
   */
  sendMessage(content) {
    this._postToParent({
      type: 'MARKANM_SEND_MESSAGE',
      content
    });
  }

  /**
   * Close the experience sandbox
   */
  close() {
    this._postToParent({ type: 'MARKANM_CLOSE' });
  }

  /**
   * Subscribe to SDK events (e.g. 'state_updated', 'user_joined')
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  _postToParent(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }

  _handleParentMessage(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'MARKANM_INIT_RESPONSE') {
      this.user = data.user;
      if (this.listeners['init_response']) {
        this.listeners['init_response'].forEach(cb => cb(data));
      }
    } else if (data.type === 'MARKANM_STATE_UPDATED') {
      if (this.listeners['state_updated']) {
        this.listeners['state_updated'].forEach(cb => cb(data.state));
      }
    }
  }
}

export const MarkanM = new MarkanMExperienceSDK();
if (typeof window !== 'undefined') {
  window.MarkanM = MarkanM;
}
