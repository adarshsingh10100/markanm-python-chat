import hmac
import hashlib
import time
import requests
import asyncio
from .context import CommandContext
from .events import Event

class Bot:
    def __init__(self, token, base_url="https://chat.markanm.com/api/bot/v1"):
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.commands = {}
        self.listeners = {}

    def command(self, name):
        """Decorator for registering bot slash commands"""
        def decorator(func):
            self.commands[name.lstrip("/")] = func
            return func
        return decorator

    def on(self, event_type):
        """Decorator for registering event listeners"""
        def decorator(func):
            if event_type not in self.listeners:
                self.listeners[event_type] = []
            self.listeners[event_type].append(func)
            return func
        return decorator

    async def send_message(self, room_id, text, card=None):
        """Send message to a room"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        payload = {"text": text}
        if card:
            payload["card"] = card
            payload["type"] = "card"

        res = requests.post(f"{self.base_url}/rooms/{room_id}/messages", json=payload, headers=headers)
        return res.json()

    def verify_webhook(self, payload_body, signature_header, secret):
        """Verify HMAC-SHA256 signature header"""
        if not signature_header or not secret:
            return False
        try:
            parts = dict(item.split("=") for item in signature_header.split(","))
            timestamp = parts.get("t")
            expected_sig = parts.get("v1")
            
            computed_sig = hmac.new(
                secret.encode("utf-8"),
                f"{timestamp}.{payload_body}".encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(computed_sig, expected_sig)
        except Exception:
            return False

    def run(self, mode="polling"):
        """Run bot development polling loop"""
        print(f"🤖 MarkanM Bot starting in {mode} mode...")
        loop = asyncio.get_event_loop()
        try:
            loop.run_until_complete(self._polling_loop())
        except KeyboardInterrupt:
            print("Bot stopped.")

    async def _polling_loop(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        while True:
            try:
                res = requests.post(f"{self.base_url}/polling", headers=headers, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    for evt_raw in data.get("events", []):
                        evt = Event(evt_raw)
                        await self._dispatch_event(evt)
            except Exception as e:
                pass
            await asyncio.sleep(2)

    async def _dispatch_event(self, evt):
        if evt.event_type == "command.received":
            cmd_name = evt.payload.get("command")
            if cmd_name in self.commands:
                ctx = CommandContext(self, evt.payload)
                handler = self.commands[cmd_name]
                if asyncio.iscoroutinefunction(handler):
                    await handler(ctx)
                else:
                    handler(ctx)
