import json
import asyncio
from typing import Dict, Any, Optional
from .exceptions import (
    MarkanMAPIError,
    MarkanMAuthError,
    MarkanMPermissionError,
    MarkanMNotFoundError,
    MarkanMRateLimitError,
    MarkanMError
)

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    import urllib.request
    import urllib.error

class APIClient:
    """
    Async HTTP Client for MarkanM Bot API v1.
    Uses httpx when installed, with automatic fallback to urllib.request.
    """
    def __init__(self, token: str, base_url: str = "https://chat.markanm.com/api/bot/v1", timeout: float = 10.0):
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "User-Agent": "markanm-python-sdk/0.1.0a1"
        }

    async def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        if params:
            from urllib.parse import urlencode
            url += f"?{urlencode(params)}"

        if HAS_HTTPX:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                try:
                    response = await client.request(
                        method=method.upper(),
                        url=url,
                        headers=self._get_headers(),
                        json=json_data
                    )
                    status_code = response.status_code
                    response_text = response.text
                    request_id = response.headers.get("X-MarkanM-Request-ID")
                    try:
                        res_json = response.json()
                    except Exception:
                        res_json = {}
                except httpx.TimeoutException:
                    raise MarkanMError(f"HTTP Request to {url} timed out after {self.timeout}s")
                except httpx.RequestError as exc:
                    raise MarkanMError(f"Network error communicating with MarkanM API: {str(exc)}")
        else:
            # Fallback to urllib.request in executor thread
            def _sync_urllib_request():
                data_bytes = json.dumps(json_data).encode("utf-8") if json_data else None
                req = urllib.request.Request(url, data=data_bytes, headers=self._get_headers(), method=method.upper())
                try:
                    with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                        body_bytes = resp.read()
                        headers_dict = dict(resp.info())
                        return resp.status, body_bytes.decode("utf-8"), headers_dict
                except urllib.error.HTTPError as err:
                    body_bytes = err.read()
                    headers_dict = dict(err.headers)
                    return err.code, body_bytes.decode("utf-8"), headers_dict
                except Exception as exc:
                    raise MarkanMError(f"Network error: {str(exc)}")

            status_code, response_text, resp_headers = await asyncio.to_thread(_sync_urllib_request)
            request_id = resp_headers.get("X-MarkanM-Request-ID") or resp_headers.get("x-markanm-request-id")
            try:
                res_json = json.loads(response_text)
            except Exception:
                res_json = {}

        if 200 <= status_code < 300:
            return res_json

        # Parse API Error Payload
        error_data = res_json.get("error", {})
        if isinstance(error_data, dict):
            err_code = error_data.get("code", "api_error")
            err_msg = error_data.get("message", response_text or "API Error")
        else:
            err_code = "api_error"
            err_msg = str(error_data) or response_text

        if status_code == 401:
            raise MarkanMAuthError(status_code, err_code, err_msg, request_id)
        elif status_code == 403:
            raise MarkanMPermissionError(status_code, err_code, err_msg, request_id)
        elif status_code == 404:
            raise MarkanMNotFoundError(status_code, err_code, err_msg, request_id)
        elif status_code == 429:
            raise MarkanMRateLimitError(status_code, err_code, err_msg, 60, request_id)
        else:
            raise MarkanMAPIError(status_code, err_code, err_msg, request_id)

    async def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return await self.request("GET", endpoint, params=params)

    async def post(self, endpoint: str, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return await self.request("POST", endpoint, json_data=json_data)

    async def patch(self, endpoint: str, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return await self.request("PATCH", endpoint, json_data=json_data)

    async def delete(self, endpoint: str) -> Dict[str, Any]:
        return await self.request("DELETE", endpoint)
