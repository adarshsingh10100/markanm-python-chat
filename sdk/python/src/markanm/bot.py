import asyncio
import inspect
import signal
import sys
from typing import Callable, Dict, List, Any, Optional
from .client import APIClient
from .context import CommandContext
from .events import Event
from .webhook import WebhookHandler
from .exceptions import MarkanMError, _mask_sensitive

class Bot:
    """
    Official MarkanM Bot Client (v0.1.0-alpha)
    """
    def __init__(
        self,
        token: str,
        base_url: str = "https://chat.markanm.com/api/bot/v1",
        timeout: float = 10.0,
        webhook_secret: Optional[str] = None
    ):
        if not token or not isinstance(token, str):
            raise MarkanMError("Bot token must be a non-empty string starting with 'mkbot_...'")

        self.token = token
        self.client = APIClient(token=token, base_url=base_url, timeout=timeout)
        self.webhook_secret = webhook_secret
        self.commands: Dict[str, Callable] = {}
        self.listeners: Dict[str, List[Callable]] = {}
        self._is_running = False

    def command(self, name: str):
        """
        Decorator to register a bot command handler.
        Usage:
            @bot.command("hello")
            async def hello_handler(ctx):
                await ctx.reply("Hello 👋")
        """
        clean_name = name.lstrip("/").strip().lower()
        def decorator(func: Callable):
            self.commands[clean_name] = func
            return func
        return decorator

    def on(self, event_type: str):
        """
        Decorator to register an event listener. Supports multiple listeners per event.
        Usage:
            @bot.on("message.created")
            async def on_message(evt):
                print(evt.type)
        """
        clean_type = event_type.strip()
        def decorator(func: Callable):
            if clean_type not in self.listeners:
                self.listeners[clean_type] = []
            self.listeners[clean_type].append(func)
            return func
        return decorator

    async def get_me() -> Dict[str, Any]:
        """Fetch bot's profile"""
        return await self.client.get("/me")

    async def get_room(self, room_id: str) -> Dict[str, Any]:
        """Fetch room details"""
        return await self.client.get(f"/rooms/{room_id}")

    async def get_room_members(self, room_id: str) -> Dict[str, Any]:
        """Fetch room members"""
        return await self.client.get(f"/rooms/{room_id}/members")

    async def send_message(self, room_id: str, text: str, card: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send a text or interactive card message to a room"""
        payload = {"text": text}
        if card:
            payload["card"] = card
            payload["type"] = "card"
        return await self.client.post(f"/rooms/{room_id}/messages", json_data=payload)

    async def reply(self, message_id: str, text: str) -> Dict[str, Any]:
        """Reply directly to a message"""
        return await self.client.post(f"/messages/{message_id}/reply", json_data={"text": text})

    async def react(self, message_id: str, emoji: str = "👍") -> Dict[str, Any]:
        """Toggle emoji reaction on a message"""
        return await self.client.post(f"/messages/{message_id}/react", json_data={"emoji": emoji})

    async def delete_message(self, message_id: str) -> Dict[str, Any]:
        """Delete a message"""
        return await self.client.delete(f"/messages/{message_id}")

    async def dispatch_event(self, event: Event):
        """
        Dispatch incoming Event to registered event listeners & command handlers
        """
        evt_type = event.type

        # 1. Execute general event listeners
        if evt_type in self.listeners:
            for listener in self.listeners[evt_type]:
                await self._invoke_handler(listener, event)

        # 2. Execute command handler if event is 'command.received'
        if evt_type == "command.received" or (isinstance(event.payload, dict) and "command" in event.payload):
            cmd_payload = event.payload if isinstance(event.payload, dict) else {}
            cmd_name = str(cmd_payload.get("command", "")).lstrip("/").strip().lower()

            if cmd_name in self.commands:
                ctx = CommandContext(self, cmd_payload)
                handler = self.commands[cmd_name]
                await self._invoke_handler(handler, ctx)

    async def _invoke_handler(self, handler: Callable, arg: Any):
        """Helper to invoke sync or async handler safely"""
        try:
            if inspect.iscoroutinefunction(handler):
                await handler(arg)
            else:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, handler, arg)
        except Exception as exc:
            safe_msg = _mask_sensitive(str(exc))
            print(f"⚠️ Error executing handler {handler.__name__}: {safe_msg}")

    def verify_webhook(self, payload_body: str, signature_header: str, secret: Optional[str] = None) -> bool:
        """
        Verify incoming webhook signature
        """
        sec = secret or self.webhook_secret
        if not sec:
            raise MarkanMError("Webhook secret must be specified to verify signatures")
        handler = WebhookHandler(secret=sec)
        return handler.verify(payload_body, signature_header)

    async def handle_webhook(self, payload_body: str, signature_header: str, secret: Optional[str] = None) -> Event:
        """
        Verify signature, parse Event, and dispatch to handlers
        """
        sec = secret or self.webhook_secret
        if not sec:
            raise MarkanMError("Webhook secret must be specified to process webhooks")

        wh_handler = WebhookHandler(secret=sec)
        event = wh_handler.process_event(payload_body, signature_header)
        await self.dispatch_event(event)
        return event

    def run_polling(self, interval: float = 2.0):
        """
        Run development polling event loop
        """
        print(f"🤖 MarkanM Bot running in development polling mode (interval: {interval}s)...")
        self._is_running = True
        loop = asyncio.get_event_loop()

        try:
            loop.run_until_complete(self._polling_loop(interval))
        except (KeyboardInterrupt, SystemExit):
            print("\n🛑 Shutting down MarkanM Bot...")
        finally:
            self._is_running = False

    def run(self, mode: str = "polling", interval: float = 2.0):
        """
        Main entry point (alias for run_polling in alpha)
        """
        if mode == "polling":
            self.run_polling(interval=interval)
        else:
            raise MarkanMError(f"Unsupported run mode '{mode}'. For webhooks, use framework Integration or bot.handle_webhook()")

    async def _polling_loop(self, interval: float):
        while self._is_running:
            try:
                res = await self.client.post("/polling")
                events_data = res.get("events", [])
                for evt_raw in events_data:
                    event = Event(evt_raw)
                    await self.dispatch_event(event)
            except MarkanMError as err:
                print(f"⚠️ MarkanM Polling Error: {err.message}")
            except Exception as exc:
                print(f"⚠️ Unexpected Polling Error: {_mask_sensitive(str(exc))}")

            await asyncio.sleep(interval)
