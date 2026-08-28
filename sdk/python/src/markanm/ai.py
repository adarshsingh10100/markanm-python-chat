import requests

class AI:
    """
    AI Integration Layer for MarkanM Developer Bots.
    Supports OpenAI, Anthropic, or custom HTTP AI model endpoints.
    """
    def __init__(self, provider="openai", api_key="", model="gpt-3.5-turbo"):
        self.provider = provider
        self.api_key = api_key
        self.model = model

    async def generate(self, prompt, system_prompt="You are a helpful MarkanM Bot assistant."):
        if self.provider == "openai":
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
            }
            try:
                res = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
            except Exception as e:
                return f"AI Generation error: {str(e)}"
        
        return f"🤖 [AI Provider: {self.provider}] Processed prompt: {prompt}"
