import asyncio
from markanm.ai import AI
from markanm.exceptions import MarkanMError

async def test_unsupported_ai_provider():
    ai = AI(provider="unsupported_provider", api_key="test_key")
    caught = False
    try:
        await ai.generate("Hello")
    except MarkanMError as exc:
        caught = True
        assert "Unsupported AI provider" in str(exc)
    
    assert caught is True, "Expected MarkanMError for unsupported AI provider"
