"""
Rate Limiting System — Tiered Rate Limits, Per-IP & Per-Account Tracking, and Exponential Backoff
"""
import time
import asyncio
from typing import Dict, List, Optional, Tuple
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from app.config import settings


# ── Client IP & Identifier Extraction ─────────────────────────
def get_client_ip(request: Request) -> str:
    """Extract real client IP considering forward headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


def get_authenticated_user_key(request: Request) -> str:
    """Key function for authenticated endpoints (uses user auth token / UID or IP fallback)."""
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
        if len(token) > 20:
            # Use hash / prefix of token as user key
            return f"user:{token[:24]}"
    return f"ip:{get_client_ip(request)}"


# ── Exponential Backoff Rate Limiter for Auth Routes ──────────
class ExponentialBackoffTracker:
    """
    Tracks request attempts per-IP and per-account with sliding-window exponential backoff.
    Instead of hard lockout, users/IPs encounter progressively increasing cooldown delays:
    - 1st threshold breach: 15s cooldown (configurable base)
    - 2nd threshold breach: 30s cooldown
    - 3rd threshold breach: 60s cooldown
    - 4th threshold breach: 120s cooldown (up to max cap, e.g. 15 mins)
    """

    def __init__(self):
        # Key -> list of float timestamps
        self._attempts: Dict[str, List[float]] = {}
        # Key -> (cooldown_until_timestamp, violation_level)
        self._cooldowns: Dict[str, Tuple[float, int]] = {}
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()

    async def _cleanup_stale(self, now: float):
        """Periodically purge expired entries every 5 minutes."""
        if now - self._last_cleanup < 300:
            return
        self._last_cleanup = now
        window = settings.AUTH_BACKOFF_WINDOW_SECONDS
        
        # Clean attempts
        keys_to_delete = []
        for k, timestamps in self._attempts.items():
            valid = [t for t in timestamps if now - t < window * 2]
            if not valid:
                keys_to_delete.append(k)
            else:
                self._attempts[k] = valid
        for k in keys_to_delete:
            del self._attempts[k]

        # Clean cooldowns
        cd_keys_to_delete = [k for k, (until, _) in self._cooldowns.items() if now > until + 3600]
        for k in cd_keys_to_delete:
            del self._cooldowns[k]

    async def check_and_record(
        self,
        key: str,
        key_type: str,
        limit_threshold: int,
    ):
        """
        Check if key is rate-limited with exponential backoff.
        Raises HTTPException(429) if in cooldown or threshold exceeded.
        """
        now = time.time()
        async with self._lock:
            await self._cleanup_stale(now)

            # 1. Check active cooldown
            if key in self._cooldowns:
                cooldown_until, violation_level = self._cooldowns[key]
                if now < cooldown_until:
                    retry_after = max(1, int(cooldown_until - now))
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "message": f"Too many requests for {key_type}. Cooldown in effect. Please try again in {retry_after} seconds.",
                            "retry_after": retry_after,
                            "type": "rate_limit_exceeded",
                            "limit_type": f"{key_type}_exponential_backoff",
                            "backoff_level": violation_level,
                        },
                        headers={"Retry-After": str(retry_after)},
                    )
                else:
                    # Cooldown expired; keep violation level for a while or reduce
                    pass

            # 2. Check sliding window attempts
            window = settings.AUTH_BACKOFF_WINDOW_SECONDS
            timestamps = self._attempts.get(key, [])
            # Filter to active window
            recent = [t for t in timestamps if now - t <= window]
            recent.append(now)
            self._attempts[key] = recent

            # 3. If attempts exceed limit, compute exponential backoff
            if len(recent) > limit_threshold:
                prior_level = self._cooldowns.get(key, (0, 0))[1]
                violation_level = prior_level + 1
                base = settings.AUTH_BACKOFF_BASE_SECONDS
                factor = settings.AUTH_BACKOFF_FACTOR
                max_sec = settings.AUTH_BACKOFF_MAX_SECONDS

                # Calculate backoff duration: base * (factor ^ (violation_level - 1))
                backoff_seconds = min(max_sec, base * (factor ** (violation_level - 1)))
                cooldown_until = now + backoff_seconds
                self._cooldowns[key] = (cooldown_until, violation_level)

                retry_after = int(backoff_seconds)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "message": f"Rate limit exceeded for {key_type}. Please wait {retry_after} seconds before trying again.",
                        "retry_after": retry_after,
                        "type": "rate_limit_exceeded",
                        "limit_type": f"{key_type}_exponential_backoff",
                        "backoff_level": violation_level,
                    },
                    headers={"Retry-After": str(retry_after)},
                )

    async def reset_key(self, key: str):
        """Reset attempts and cooldowns on successful action (e.g. valid login)."""
        async with self._lock:
            self._attempts.pop(key, None)
            self._cooldowns.pop(key, None)


# Singleton tracker
auth_backoff_tracker = ExponentialBackoffTracker()


# ── Dependency for Auth Routes (IP + Account Exponential Backoff) ──
async def check_auth_rate_limit(
    request: Request,
    account_identifier: Optional[str] = None,
):
    """
    Applies strict dual-layer rate limiting:
    1. Per-IP threshold with exponential backoff
    2. Per-Account threshold with exponential backoff (if email/identifier provided)
    """
    client_ip = get_client_ip(request)

    # 1. Check IP limit
    await auth_backoff_tracker.check_and_record(
        key=f"ip:{client_ip}",
        key_type="IP address",
        limit_threshold=settings.RATE_LIMIT_AUTH_PER_IP,
    )

    # 2. Check Account limit (if email is known)
    if account_identifier:
        clean_account = str(account_identifier).strip().lower()
        if clean_account:
            await auth_backoff_tracker.check_and_record(
                key=f"account:{clean_account}",
                key_type="account",
                limit_threshold=settings.RATE_LIMIT_AUTH_PER_ACCOUNT,
            )


# ── SlowAPI Limiter Instance ──────────────────────────────────
limiter = Limiter(
    key_func=get_client_ip,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
)


# ── Custom Rate Limit Exceeded Exception Handler ──────────────
def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Formatted JSON response when SlowAPI rate limit is hit."""
    retry_after = getattr(exc, "retry_after", 60)
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}. Please try again in {retry_after} seconds.",
            "retry_after": retry_after,
            "type": "rate_limit_exceeded",
        },
        headers={"Retry-After": str(retry_after)},
    )
