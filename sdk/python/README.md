# MarkanM Official Python SDK (`markanm 0.1.0a1`)

Official Python library (v0.1.0-alpha) for building developer bots, automation, and AI agents on **MarkanM Chat** (`https://chat.markanm.com`).

---

## ⚠️ Alpha Release Notice

This is **v0.1.0-alpha** (`markanm 0.1.0a1`). It is intended for testing against the MarkanM Bot API v1.

---

## 🚀 Installation

Install via `pip`:

```bash
pip install markanm
```

---

## ⚡ Quick Start

### 1. Simple Hello Bot (`hello_bot.py`)

```python
import os
from markanm import Bot

bot = Bot(os.environ["MARKANM_BOT_TOKEN"])

@bot.command("hello")
async def hello(ctx):
    await ctx.reply("Hello 👋 Welcome to MarkanM!")

@bot.command("start")
async def start(ctx):
    await ctx.reply("🚀 Bot activated and ready!")

if __name__ == "__main__":
    bot.run_polling()
```

---

### 2. Event Listeners

```python
@bot.on("message.created")
async def on_message(event):
    print(f"New message received: {event.payload}")

@bot.on("member.joined")
def on_member_joined(event):
    print(f"User joined room: {event.payload.get('user')}")
```

---

### 3. AI Assistant Bot (`ai_bot.py`)

```python
import os
from markanm import Bot
from markanm.ai import AI

bot = Bot(os.environ["MARKANM_BOT_TOKEN"])
ai = AI(provider="openai", api_key=os.environ["OPENAI_API_KEY"])

@bot.command("ask")
async def ask(ctx):
    prompt = " ".join(ctx.args)
    if not prompt:
        await ctx.reply("Usage: /ask <question>")
        return

    answer = await ai.generate(prompt)
    await ctx.reply(answer)

bot.run_polling()
```

---

### 4. Webhook Verification (Flask / FastAPI)

```python
from markanm import WebhookHandler, MarkanMWebhookError

handler = WebhookHandler(secret="whsec_YOUR_SECRET", timestamp_tolerance=300)

try:
    # Verifies HMAC-SHA256 signature header and 300s timestamp tolerance
    event = handler.process_event(request_body_text, request_headers.get("X-MarkanM-Signature"))
    print(f"Event verified: {event.id} ({event.type})")
except MarkanMWebhookError as err:
    print(f"Webhook error: {err}")
```

---

## 🧪 Testing

Run tests with `pytest`:

```bash
pytest sdk/python/tests/
```

---

## 📚 API Reference
For complete API endpoints and permission scope guidelines, visit:
**https://chat.markanm.com/developers/docs**
