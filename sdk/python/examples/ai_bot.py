import os
from markanm import Bot
from markanm.ai import AI

bot_token = os.environ.get("MARKANM_BOT_TOKEN", "mkbot_sample_token")
openai_key = os.environ.get("OPENAI_API_KEY", "")

bot = Bot(bot_token)
ai = AI(provider="openai", api_key=openai_key)

@bot.command("ask")
async def ask_handler(ctx):
    prompt = " ".join(ctx.args)
    if not prompt:
        await ctx.reply("Usage: /ask <your question>")
        return

    answer = await ai.generate(prompt)
    await ctx.reply(answer)

if __name__ == "__main__":
    bot.run_polling()
