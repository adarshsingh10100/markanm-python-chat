import json
import asyncio
from typing import Optional
from .exceptions import MarkanMError, _mask_sensitive

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    import urllib.request
    import urllib.error

class AI:
    """
    AI Integration Layer for MarkanM Developer Bots.
    Allows developers to integrate OpenAI or custom HTTP AI model endpoints using their own credentials.
    """
    def __init__(self, provider: str = "openai", api_key: str = "", model: str = "gpt-3.5-turbo", base_url: Optional[str] = None):
        self.provider = provider.lower().strip()
        self.api_key = api_key
        self.model = model
        self.base_url = base_url or "https://api.openai.com/v1"

    async def generate(self, prompt: str, system_prompt: str = "You are a helpful MarkanM Bot assistant.") -> str:
        """
        Generate text response from configured AI provider
        """
        if not prompt or not isinstance(prompt, str):
            raise MarkanMError("Prompt must be a non-empty string")

        if self.provider == "openai":
            if not self.api_key:
                raise MarkanMError("OpenAI API Key is required for OpenAI AI provider")

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

            if HAS_HTTPX:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    try:
                        res = await client.post(f"{self.base_url.rstrip('/')}/chat/completions", json=payload, headers=headers)
                        if res.is_success:
                            data = res.json()
                            return data["choices"][0]["message"]["content"].strip()
                        else:
                            raise MarkanMError(f"AI Provider HTTP {res.status_code}: {res.text}")
                    except Exception as exc:
                        raise MarkanMError(f"AI Provider request failed: {_mask_sensitive(str(exc))}")
            else:
                def _sync_ai_request():
                    req_data = json.dumps(payload).encode("utf-8")
                    req = urllib.request.Request(f"{self.base_url.rstrip('/')}/chat/completions", data=req_data, headers=headers, method="POST")
                    try:
                        with urllib.request.urlopen(req, timeout=15) as resp:
                            res_text = resp.read().decode("utf-8")
                            data = json.loads(res_text)
                            return data["choices"][0]["message"]["content"].strip()
                    except Exception as exc:
                        raise MarkanMError(f"AI Provider request failed: {_mask_sensitive(str(exc))}")

                return await asyncio.to_thread(_sync_ai_request)

        raise MarkanMError(f"Unsupported AI provider '{self.provider}'. Supported providers: 'openai'")
