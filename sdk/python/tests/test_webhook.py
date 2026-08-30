import hmac
import hashlib
import time
from markanm.webhook import WebhookHandler
from markanm.exceptions import MarkanMWebhookError

def test_webhook_verification():
    secret = "whsec_test_secret_12345"
    handler = WebhookHandler(secret=secret, timestamp_tolerance=300)

    timestamp = int(time.time())
    body = '{"event_id":"evt_1","event_type":"message.created"}'
    signed_payload = f"{timestamp}.{body}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    header = f"t={timestamp},v1={sig}"

    # Valid signature check
    assert handler.verify(body, header) is True

    # Process event check
    event = handler.process_event(body, header)
    assert event.id == "evt_1"
    assert event.type == "message.created"

def test_expired_webhook():
    secret = "whsec_test_secret_12345"
    handler = WebhookHandler(secret=secret, timestamp_tolerance=10)

    expired_timestamp = int(time.time()) - 500 # 500 seconds old
    body = '{"event_id":"evt_1"}'
    signed_payload = f"{expired_timestamp}.{body}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    header = f"t={expired_timestamp},v1={sig}"

    caught = False
    try:
        handler.verify(body, header)
    except MarkanMWebhookError as exc:
        caught = True
        assert "timestamp expired" in str(exc)

    assert caught is True, "Expected MarkanMWebhookError for expired timestamp"
