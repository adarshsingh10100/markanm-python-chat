// Central API Request Wrapper with Network Failure & Weak Internet Handling

const API_BASE_URL = import.meta.env.VITE_API_URL || '/backend/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('markanm_token');

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (netErr) {
    const isOffline = !navigator.onLine;
    const errorMsg = isOffline
      ? '⚠️ You are currently offline. Please check your internet connection.'
      : '📡 Weak internet connection detected. Retrying automatically...';

    // Notify NetworkStatusBanner component
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('network-status-change', {
        detail: { isOffline, isWeak: !isOffline, message: errorMsg }
      }));
    }

    const err = new Error(errorMsg);
    err.isNetworkError = true;
    err.isOffline = isOffline;
    throw err;
  }

  const rawText = await response.text();
  let data = {};
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    const textSnippet = rawText.replace(/<[^>]*>?/gm, '').trim().substring(0, 150);
    data = {
      success: false,
      error: textSnippet || (response.ok ? 'Unexpected response format' : `Server Error (${response.status})`)
    };
  }

  if (!response.ok || data.success === false) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data.details || null;
    throw err;
  }

  return data;
}
