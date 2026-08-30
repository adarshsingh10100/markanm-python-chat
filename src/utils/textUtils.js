/**
 * Utility function to safely decode HTML entities like &#039; or &amp; to plain text
 */
export function decodeHTML(str) {
  if (!str) return '';
  const parser = new DOMParser();
  const decoded = parser.parseFromString(`<!doctype html><body>${str}`, 'text/html').body.textContent;
  return decoded || str;
}

/**
 * Format conversation last message preview nicely for sidebars and lists
 */
export function formatMessagePreview(lastMsg, fallbackDesc = '') {
  if (!lastMsg) return fallbackDesc || 'No messages yet';

  const type = lastMsg.type || lastMsg.message_type;
  const content = lastMsg.content || '';

  if (type === 'poll') {
    try {
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      return `📊 Poll: ${decodeHTML(data?.question || 'Live Poll')}`;
    } catch (e) {
      return '📊 Live Poll';
    }
  }

  if (type === 'gif') return '🎞 GIF';
  if (type === 'sticker') return '🎨 Sticker';
  if (type === 'image') return '📷 Photo';
  if (type === 'video') return '🎥 Video';
  if (type === 'audio' || type === 'voice') return '🎵 Voice Message';
  if (type === 'file') return '📁 Attachment';

  if (typeof content === 'string' && content.startsWith('{"poll_id"')) {
    try {
      const data = JSON.parse(content);
      return `📊 Poll: ${decodeHTML(data?.question || 'Live Poll')}`;
    } catch (e) {
      return '📊 Live Poll';
    }
  }

  return decodeHTML(content);
}

/**
 * Safely parse server timestamps (MySQL "YYYY-MM-DD HH:MM:SS" or ISO strings) into valid Date object in UTC
 */
export function parseServerDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  let s = String(dateStr).trim();
  // If MySQL format "YYYY-MM-DD HH:MM:SS", convert to "YYYY-MM-DDTHH:MM:SSZ" (UTC)
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(' ', 'T');
    // Check if the time part lacks timezone indicators like Z, +05:30, or -04:00
    if (!s.endsWith('Z') && !s.slice(10).includes('+') && !s.slice(10).includes('-')) {
      s += 'Z';
    }
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format timestamp in user's detected timezone (from IP geo).
 * Falls back to 'Asia/Kolkata' (IST) if not provided.
 *
 * @param {string|Date} dateStr  — ISO date string or Date object
 * @param {string} [timezone]   — IANA timezone e.g. 'Asia/Kolkata', 'America/New_York'
 */
export function formatTime(dateStr, timezone = 'Asia/Kolkata') {
  const date = parseServerDate(dateStr);
  if (!date) return '';
  const tz = timezone || 'Asia/Kolkata';
  return date.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format full date in user's timezone (e.g. "Today", "Aug 29", "Jan 5, 2025")
 *
 * @param {string|Date} dateStr
 * @param {string} [timezone]
 */
export function formatDate(dateStr, timezone = 'Asia/Kolkata') {
  const date = parseServerDate(dateStr);
  if (!date) return '';
  const tz = timezone || 'Asia/Kolkata';

  // Check if it's today in user's timezone
  const nowStr = new Date().toLocaleDateString('en-US', { timeZone: tz });
  const dateLocalStr = date.toLocaleDateString('en-US', { timeZone: tz });

  if (nowStr === dateLocalStr) {
    return formatTime(date, tz);
  }

  return date.toLocaleDateString('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date divider bubble for chat timeline (WhatsApp / Telegram style)
 * Returns "Today", "Yesterday", weekday name ("Monday"), or "Aug 29, 2026".
 */
export function formatDateDivider(dateStr, timezone = 'Asia/Kolkata') {
  const date = parseServerDate(dateStr);
  if (!date) return '';
  const tz = timezone || 'Asia/Kolkata';

  const now = new Date();
  const todayLocal = now.toLocaleDateString('en-US', { timeZone: tz });
  const msgLocal = date.toLocaleDateString('en-US', { timeZone: tz });

  if (todayLocal === msgLocal) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yestLocal = yesterday.toLocaleDateString('en-US', { timeZone: tz });
  if (yestLocal === msgLocal) {
    return 'Yesterday';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Get a flag emoji for a country code (e.g. 'IN' → '🇮🇳')
 * Uses Unicode regional indicator symbol letters
 *
 * @param {string} countryCode — 2-letter ISO country code
 */
export function countryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';
  const code = countryCode.toUpperCase();
  return String.fromCodePoint(
    ...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

/**
 * @deprecated Use formatTime(dateStr, timezone) instead
 */
export function formatTimeIST(dateStr) {
  return formatTime(dateStr, 'Asia/Kolkata');
}
