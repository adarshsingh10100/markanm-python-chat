from typing import Dict, Any, Optional

class Event:
    """
    MarkanM Platform Event Model
    """
    def __init__(self, data: Dict[str, Any]):
        self.raw_data = data or {}
        self.id = data.get("event_id") or data.get("id", "")
        self.type = data.get("event_type") or data.get("event", "")
        self.timestamp = data.get("timestamp") or data.get("created_at", "")
        self.payload = data.get("payload") if "payload" in data else data

    @property
    def event_id(self) -> str:
        """Alias for backward compatibility"""
        return self.id

    @property
    def event_type(self) -> str:
        """Alias for backward compatibility"""
        return self.type

    @property
    def created_at(self) -> str:
        """Alias for timestamp"""
        return str(self.timestamp)

    def __repr__(self) -> str:
        return f"<MarkanM Event type='{self.type}' id='{self.id}'>"
