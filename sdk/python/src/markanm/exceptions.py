import re

def _mask_sensitive(text: str) -> str:
    """Mask sensitive tokens or keys in strings"""
    if not isinstance(text, str):
        return str(text)
    text = re.sub(r'mkbot_[a-zA-Z0-9_-]+', 'mkbot_***MASKED***', text)
    text = re.sub(r'mkm_sec_[a-zA-Z0-9_-]+', 'mkm_sec_***MASKED***', text)
    text = re.sub(r'whsec_[a-zA-Z0-9_-]+', 'whsec_***MASKED***', text)
    return text

class MarkanMError(Exception):
    """Base exception class for all MarkanM SDK errors"""
    def __init__(self, message: str = "An error occurred with MarkanM SDK"):
        self.message = _mask_sensitive(message)
        super().__init__(self.message)

class MarkanMAPIError(MarkanMError):
    """Raised when MarkanM Bot API returns an HTTP error status"""
    def __init__(self, status_code: int, error_code: str, message: str, request_id: str = None):
        self.status_code = status_code
        self.error_code = error_code
        self.request_id = request_id
        msg = f"HTTP {status_code} [{error_code}]: {message}"
        if request_id:
            msg += f" (Request-ID: {request_id})"
        super().__init__(msg)

class MarkanMAuthError(MarkanMAPIError):
    """Raised on HTTP 401 Unauthorized errors"""
    pass

class MarkanMPermissionError(MarkanMAPIError):
    """Raised on HTTP 403 Forbidden scope errors"""
    pass

class MarkanMNotFoundError(MarkanMAPIError):
    """Raised on HTTP 404 Not Found errors"""
    pass

class MarkanMRateLimitError(MarkanMAPIError):
    """Raised on HTTP 429 Rate Limit Exceeded errors"""
    def __init__(self, status_code: int, error_code: str, message: str, retry_after: int = 60, request_id: str = None):
        self.retry_after = retry_after
        super().__init__(status_code, error_code, f"{message} (Retry after {retry_after}s)", request_id)

class MarkanMWebhookError(MarkanMError):
    """Raised on HMAC signature or timestamp verification failure"""
    pass

class MarkanMValidationError(MarkanMError):
    """Raised on SDK validation failure"""
    pass
