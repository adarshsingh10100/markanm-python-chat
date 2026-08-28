export const PRODUCT_ROADMAP = {
  currentUpdate: 5,
  totalUpdates: 5,
  isInitialRoadmapCompleted: true,

  platformExpansion: {
    name: 'PLATFORM EXPANSION — BOT PLATFORM & MULTI-LANGUAGE SDK',
    tagline: 'Telegram/Discord-style Bot Ecosystem & Official SDKs',
    status: 'completed',
    features: [
      'Telegram/Discord-style Developer Bot Engine (@BotUsername)',
      'Secure Bot Tokens (mkbot_...) with 1-click rotation & token hashing',
      'Granular Permission Scopes & Privacy Mode ON by default',
      'Public Bot REST API v1 (/api/bot/v1/...) with Bearer Auth',
      'Signed HMAC-SHA256 Webhooks & Delivery Logs Dashboard',
      'Official PyPI Python SDK (pip install markanm)',
      'Official npm JavaScript SDK (npm install @markanm/bot)',
      'Official Packagist PHP SDK (composer require markanm/bot)',
      'Interactive Bot Cards & Clickable Buttons (button.clicked payload)',
      'AI Assistant Integration Layer (markanm.ai.AI)'
    ]
  },

  updates: [
    {
      id: 1,
      name: 'UPDATE 1 — FOUNDATION',
      tagline: 'Private communication and identity',
      status: 'completed',
      features: [
        'User Authentication (Email / OTP / Password)',
        'User Profiles (Avatar, Banner, Bio, Verification)',
        'Direct Messaging & Group Chats',
        'Real-time Notifications & Unread Badges',
        'Shareable Group Invite Links & Access Control'
      ]
    },
    {
      id: 2,
      name: 'UPDATE 2 — DISCOVER',
      tagline: 'Discoverable social conversations & Live Rooms',
      status: 'completed',
      features: [
        'Global Discover Feed & Category Filters',
        'Live Public Rooms & Voice/Text Lounges',
        'Interest-based discovery & Trending Topics',
        'Room Sharing, Moderation & Report System'
      ]
    },
    {
      id: 3,
      name: 'UPDATE 3 — EXPERIENCE',
      tagline: 'Rich social communication & Experience polish',
      status: 'completed',
      features: [
        'Global Sticker & GIF Search Libraries (Tenor / Giphy API)',
        'Interactive Poll Creation & Live Voting',
        'Saved Messages / Bookmarks Manager',
        'Encrypted Professional Chat URLs (@username / hash slugs)',
        'Dynamic Chat Themes & Auto-scroll Protection'
      ]
    },
    {
      id: 4,
      name: 'UPDATE 4 — CONNECT',
      tagline: 'Developer infrastructure & OAuth 2.0 Platform',
      status: 'completed',
      features: [
        'Developer Mode Settings & App Workspace',
        'Login with MarkanM OAuth 2.0 (Authorization Code + PKCE)',
        'Public Developer REST API v1 (/api/v1/me)',
        'Granular Permission Scopes & Connected Apps Manager',
        'API Rate Limiting (60 req/min) & Signed HMAC Webhooks'
      ]
    },
    {
      id: 5,
      name: 'UPDATE 5 — PLATFORM',
      tagline: 'Apps, Bots, Experiences & Developer Ecosystem',
      status: 'completed',
      features: [
        'MarkanM Experience Directory (/experiences)',
        'In-Chat Experience Launcher (+ -> 🎮 Experiences)',
        'MarkanM Experience JS SDK (MarkanM.js) & Sandbox Container',
        'Live Experience Sessions (SES_...) & State Sync',
        'First-Party Built-In Experiences (Would You Rather, Quiz, Poll, Party Game)',
        'Developer App Publishing & Admin Approval Workflow',
        'Bot Slash Commands Router (@Bot /command)'
      ]
    }
  ]
};

export const ROADMAP_CONFIG = PRODUCT_ROADMAP;
