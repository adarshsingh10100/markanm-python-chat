# Official Python Hello Bot Example
from markanm import Bot

bot = Bot("mkbot_7f8a9b1c2d3e4f5a6b7c8d9e")

@bot.command("hello")
async def hello(ctx):
    await ctx.reply("Hello 👋! I am a bot built with the official markanm Python SDK!")

if __name__ == "__main__":
    bot.run()
