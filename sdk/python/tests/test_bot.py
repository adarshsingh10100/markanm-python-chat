import asyncio
from markanm.bot import Bot
from markanm.events import Event

async def test_bot_command_and_event_dispatching():
    bot = Bot("mkbot_test_token_123456789")

    executed_command = False
    executed_listener = False

    @bot.command("start")
    async def handle_start(ctx):
        nonlocal executed_command
        executed_command = True
        assert ctx.command == "start"

    @bot.on("message.created")
    def handle_msg(evt):
        nonlocal executed_listener
        executed_listener = True
        assert evt.type == "message.created"

    # Dispatch command event
    cmd_event = Event({
        "event_id": "evt_cmd",
        "event_type": "command.received",
        "payload": {"command": "/start", "user": {"username": "alex"}, "room": {"id": 10}}
    })
    await bot.dispatch_event(cmd_event)
    assert executed_command is True

    # Dispatch message event
    msg_event = Event({
        "event_id": "evt_msg",
        "event_type": "message.created",
        "payload": {"text": "hello"}
    })
    await bot.dispatch_event(msg_event)
    assert executed_listener is True
