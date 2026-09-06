import hmac
import hashlib
import json
import base64
import time
from typing import Optional, Dict, Any

AUTH_SECRET_KEY = "drishtikon-retinal-ai-screening-secret-key-2026"

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = int(time.time()) + 86400 * 14  # 14 days expiration
    raw_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw_bytes).decode("utf-8").rstrip("=")
    sig = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{sig}"

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        if not token or "." not in token:
            return None
        b64_payload, sig = token.split(".", 1)
        expected_sig = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        rem = len(b64_payload) % 4
        padded = b64_payload + ("=" * (4 - rem) if rem else "")
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
