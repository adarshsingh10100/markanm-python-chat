class CommandContext:
    def __init__(self, bot, event_data):
        self.bot = bot
        self.raw_data = event_data
        self.command = event_data.get("command", "")
        self.args = event_data.get("args", [])
        self.room_id = event_data.get("room", {}).get("id")
        self.user = event_data.get("user", {})
        self.message = event_data.get("message", {})

    async def reply(self, content):
        """Reply to the message or room"""
        return await self.bot.send_message(self.room_id, content)
