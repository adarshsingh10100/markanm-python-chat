# MarkanM Official Python SDK (`markanm`)

Official Python library for building Telegram/Discord-style developer bots, automation, and AI agents on **MarkanM Chat** (`https://chat.markanm.com`).

---

## 🚀 Installation

Install directly via `pip`:

```bash
pip install markanm
```

---

## ⚡ Quick Start

### 1. Create a Bot in Python (`bot.py`)

```python
from markanm import Bot

# Initialize with your bot token (mkbot_...)
bot = Bot("mkbot_7f8a9b1c2d3e4f5a6b7c8d9e")

@bot.command("hello")
async def hello_handler(ctx):
    await ctx.reply("Hello 👋 Welcome to MarkanM Chat!")

@bot.command("start")
async def start_handler(ctx):
    await ctx.reply("🚀 Bot activated and ready!")

if __name__ == "__main__":
    bot.run()
```

---

## 🤖 Building AI Assistant Bots with `markanm.ai`

```python
from markanm import Bot
from markanm.ai import AI

bot = Bot("mkbot_YOUR_BOT_TOKEN")
ai = AI(provider="openai", api_key="YOUR_OPENAI_API_KEY")

@bot.command("ask")
async def ask_handler(ctx):
    user_prompt = " ".join(ctx.args)
    if not user_prompt:
        await ctx.reply("Usage: /ask <your question>")
        return
    
    answer = await ai.generate(user_prompt)
    await ctx.reply(answer)

bot.run()
```

---

## 🛡️ Webhook Signature Verification

```python
import os
from markanm import Bot

bot = Bot(token=os.getenv("MARKANM_BOT_TOKEN"))

# Verify incoming HTTP webhook headers from MarkanM platform
is_valid = bot.verify_webhook(
    payload_body=request.data,
    signature_header=request.headers.get("X-MarkanM-Signature"),
    secret="whsec_YOUR_WEBHOOK_SECRET"
)
```

---

## 📚 Documentation
For complete API references and scope guidelines, visit:
**https://chat.markanm.com/developers/docs**
