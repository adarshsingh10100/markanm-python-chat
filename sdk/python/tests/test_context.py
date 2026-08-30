from markanm.context import CommandContext

def test_command_context_parsing():
    payload = {
        "command": "/ask",
        "text": "/ask What is Python?",
        "user": {"id": 1, "username": "alex", "display_name": "Alex"},
        "room": {"id": 42, "name": "General Room"}
    }
    ctx = CommandContext(None, payload)
    assert ctx.command == "ask"
    assert ctx.args == ["What", "is", "Python?"]
    assert ctx.user.username == "alex"
    assert ctx.room.id == 42
    assert ctx.room_id == 42
