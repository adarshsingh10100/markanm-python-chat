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
