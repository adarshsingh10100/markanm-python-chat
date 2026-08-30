import os
from markanm import Bot

# Fetch bot token securely from environment variable
token = os.environ.get("MARKANM_BOT_TOKEN", "mkbot_sample_token")
bot = Bot(token)

@bot.command("hello")
async def hello_handler(ctx):
    await ctx.reply("Hello 👋 Welcome to MarkanM Chat!")

@bot.command("start")
async def start_handler(ctx):
    await ctx.reply("🚀 Bot activated and ready!")

if __name__ == "__main__":
    bot.run_polling()
