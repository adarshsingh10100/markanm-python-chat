"""
MarkanM Official Python SDK
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Python SDK for MarkanM Chat Bot Platform & REST API.
"""

__version__ = "0.1.0"
__author__ = "MarkanM Developer Team"

from .bot import Bot
from .context import CommandContext
from .events import Event
from .ai import AI

__all__ = ["Bot", "CommandContext", "Event", "AI"]
