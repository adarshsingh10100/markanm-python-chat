from typing import Dict, Any, List

class UserContext:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.username = data.get("username", "")
        self.display_name = data.get("display_name", "")
        self.avatar_url = data.get("avatar_url", "")

class RoomContext:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.name = data.get("name", "")

class MessageContext:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.text = data.get("text", "") or data.get("content", "")
        self.type = data.get("type", "text")

class CommandContext:
    """
    Context passed to command handlers: @bot.command("name")
    """
    def __init__(self, bot, payload: Dict[str, Any]):
        self.bot = bot
        self.raw_data = payload or {}
        self.command = payload.get("command", "").lstrip("/")
        
        # Parse command arguments
        raw_text = payload.get("text") or payload.get("message", {}).get("text", "")
        self.text = raw_text
        if "args" in payload and isinstance(payload["args"], list):
            self.args = payload["args"]
        else:
            parts = raw_text.split()
            self.args = parts[1:] if len(parts) > 1 else []

        self.user = UserContext(payload.get("user") or {})
        self.room = RoomContext(payload.get("room") or {"id": payload.get("conversation_id") or payload.get("room_id")})
        self.message = MessageContext(payload.get("message") or {})

    @property
    def room_id(self):
        return self.room.id

    async def reply(self, content: str):
        """Reply to room context"""
        if not self.room_id:
            raise ValueError("Cannot reply: missing room ID in context")
        return await self.bot.send_message(self.room_id, content)

    def __repr__(self) -> str:
        return f"<CommandContext command='{self.command}' args={self.args} room_id={self.room_id}>"
