import time
import threading
from functools import wraps
from flask import request, jsonify


class RateLimiter:
    """Thread-safe Token Bucket Rate Limiter with automatic stale-entry cleanup."""

    # Entries not accessed for this many seconds are purged to prevent memory leak
    _STALE_THRESHOLD = 300  # 5 minutes

    def __init__(self, rate: int = 10, per: int = 60):
        self.rate  = rate
        self.per   = per
        self.tokens: dict = {}
        self.lock  = threading.Lock()
        self._request_count = 0
        self._CLEANUP_INTERVAL = 100  # purge stale entries every N requests

    def _cleanup_stale(self, now: float) -> None:
        """Remove entries that haven't been seen recently (called inside lock)."""
        stale = [
            k for k, v in self.tokens.items()
            if now - v["last_updated"] > self._STALE_THRESHOLD
        ]
        for k in stale:
            del self.tokens[k]

    def _get_tokens(self, key: str, now: float) -> float:
        """Refill and return available tokens for key. Must be called inside lock."""
        if key not in self.tokens:
            self.tokens[key] = {"tokens": self.rate, "last_updated": now}
            return float(self.rate)

        elapsed = now - self.tokens[key]["last_updated"]
        refill  = elapsed * (self.rate / self.per)
        self.tokens[key]["tokens"] = min(
            float(self.rate),
            self.tokens[key]["tokens"] + refill,
        )
        self.tokens[key]["last_updated"] = now
        return self.tokens[key]["tokens"]

    def check(self, key: str) -> tuple[bool, float]:
        """
        Check whether the request is allowed.

        Returns:
            (allowed: bool, retry_after_seconds: float)
            retry_after is 0.0 when allowed, estimated wait time when blocked.
        """
        now = time.time()
        with self.lock:
            self._request_count += 1
            if self._request_count % self._CLEANUP_INTERVAL == 0:
                self._cleanup_stale(now)

            available = self._get_tokens(key, now)
            if available >= 1.0:
                self.tokens[key]["tokens"] -= 1.0
                return True, 0.0

            # Estimate seconds until one token refills
            deficit       = 1.0 - available
            retry_after   = round(deficit * (self.per / self.rate), 2)
            return False, retry_after


# ---------------------------------------------------------------------------
# Global default limiter — 50 requests / minute / IP
# ---------------------------------------------------------------------------
limiter = RateLimiter(rate=50, per=60)


def limit_requests(custom_limiter: RateLimiter = None):
    """
    Flask decorator factory for rate limiting.

    Usage:
        # Default global limiter
        @app.route("/api/predict")
        @limit_requests()
        def predict(): ...

        # Custom per-route limiter
        strict = RateLimiter(rate=5, per=60)

        @app.route("/api/heavy")
        @limit_requests(strict)
        def heavy(): ...
    """
    _limiter = custom_limiter or limiter

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Prefer X-Forwarded-For when behind a reverse proxy (nginx/caddy)
            key     = (
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
                or request.remote_addr
                or "unknown"
            )
            allowed, retry_after = _limiter.check(key)

            if not allowed:
                response = jsonify({
                    "success": False,
                    "error":   "Rate limit exceeded. Please try again later.",
                    "retry_after_seconds": retry_after,
                })
                response.status_code = 429
                # RFC 7231 §7.1.3 — Retry-After header
                response.headers["Retry-After"]            = str(int(retry_after) + 1)
                response.headers["X-RateLimit-Limit"]      = str(_limiter.rate)
                response.headers["X-RateLimit-Remaining"]  = "0"
                return response

            resp = f(*args, **kwargs)

            # Attach informational headers to successful responses too
            with _limiter.lock:
                remaining = _limiter.tokens.get(key, {}).get("tokens", _limiter.rate)

            if hasattr(resp, "headers"):
                resp.headers["X-RateLimit-Limit"]     = str(_limiter.rate)
                resp.headers["X-RateLimit-Remaining"] = str(int(remaining))

            return resp

        return decorated_function
    return decorator