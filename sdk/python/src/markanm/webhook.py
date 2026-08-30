import hmac
import hashlib
import time
import json
from typing import Dict, Any, Tuple
from .events import Event
from .exceptions import MarkanMWebhookError

class WebhookHandler:
    """
    HMAC-SHA256 Webhook Verification & Parsing Helper
    """
    def __init__(self, secret: str, timestamp_tolerance: int = 300):
        self.secret = secret
        self.timestamp_tolerance = timestamp_tolerance

    def parse_header(self, signature_header: str) -> Tuple[int, str]:
        """
        Parse X-MarkanM-Signature header: "t=1788000000,v1=abcdef..."
        """
        if not signature_header or not isinstance(signature_header, str):
            raise MarkanMWebhookError("Missing or invalid X-MarkanM-Signature header")

        t_val = None
        v1_val = None

        for part in signature_header.split(","):
            part = part.strip()
            if "=" in part:
                k, v = part.split("=", 1)
                if k.strip() == "t":
                    try:
                        t_val = int(v.strip())
                    except ValueError:
                        raise MarkanMWebhookError("Invalid timestamp in signature header")
                elif k.strip() == "v1":
                    v1_val = v.strip()

        if t_val is None or not v1_val:
            raise MarkanMWebhookError("Malformed X-MarkanM-Signature header. Expected format: 't=TIMESTAMP,v1=SIGNATURE'")

        return t_val, v1_val

    def verify(self, payload_body: str, signature_header: str) -> bool:
        """
        Verify HMAC-SHA256 signature and timestamp freshness
        """
        t_val, expected_sig = self.parse_header(signature_header)

        # Check timestamp tolerance for replay protection
        current_time = int(time.time())
        if abs(current_time - t_val) > self.timestamp_tolerance:
            raise MarkanMWebhookError(f"Webhook timestamp expired or out of tolerance window ({abs(current_time - t_val)}s > {self.timestamp_tolerance}s)")

        # Compute HMAC signature
        signed_payload = f"{t_val}.{payload_body}".encode("utf-8")
        computed_sig = hmac.new(
            self.secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(computed_sig, expected_sig):
            raise MarkanMWebhookError("Invalid HMAC-SHA256 webhook signature")

        return True

    def process_event(self, payload_body: str, signature_header: str) -> Event:
        """
        Verify signature and parse into typed Event model
        """
        self.verify(payload_body, signature_header)
        try:
            data = json.loads(payload_body)
        except json.JSONDecodeError as exc:
            raise MarkanMWebhookError(f"Invalid JSON payload in webhook body: {str(exc)}")

        return Event(data)
