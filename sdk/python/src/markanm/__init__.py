"""
MarkanM Official Python SDK (v0.1.0-alpha)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Official Python library for building developer bots, automation, and AI agents on MarkanM Chat.
"""

__version__ = "0.1.0a1"
__author__ = "MarkanM Developer Team"

from .bot import Bot
from .context import CommandContext
from .events import Event
from .webhook import WebhookHandler
from .ai import AI
from .exceptions import (
    MarkanMError,
    MarkanMAPIError,
    MarkanMAuthError,
    MarkanMPermissionError,
    MarkanMNotFoundError,
    MarkanMRateLimitError,
    MarkanMWebhookError,
    MarkanMValidationError
)

__all__ = [
    "Bot",
    "CommandContext",
    "Event",
    "WebhookHandler",
    "AI",
    "MarkanMError",
    "MarkanMAPIError",
    "MarkanMAuthError",
    "MarkanMPermissionError",
    "MarkanMNotFoundError",
    "MarkanMRateLimitError",
    "MarkanMWebhookError",
    "MarkanMValidationError"
]
