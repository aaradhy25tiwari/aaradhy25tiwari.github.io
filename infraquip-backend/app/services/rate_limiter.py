"""
Rate Limiter — Sliding window counter via Redis/Upstash
Implements per-IP and per-user rate limiting.
"""
import logging
from datetime import datetime
from typing import Optional
from app.config import settings
from app.services.cache_service import _get_client

logger = logging.getLogger(__name__)


async def check_rate_limit(
    key: str,
    max_requests: int = 100,
    window_seconds: int = 60,
) -> tuple[bool, int, int]:
    """
    Check if a key (IP or user_id) has exceeded the rate limit.
    Returns: (allowed, current_count, limit)
    Uses a sliding window counter stored in Redis.
    """
    client = _get_client()
    if not client:
        return True, 0, max_requests

    now = int(datetime.utcnow().timestamp())
    window_key = f"ratelimit:{key}:{now // window_seconds}"

    try:
        current = await client.get(window_key)
        count = int(current) if current else 0

        if count >= max_requests:
            return False, count, max_requests

        await client.incr(window_key)
        if count == 0:
            await client.expire(window_key, window_seconds + 1)

        return True, count + 1, max_requests

    except Exception as e:
        logger.warning(f"Rate limit check failed for {key}: {e}")
        return True, 0, max_requests


async def check_login_rate_limit(ip: str) -> tuple[bool, int, int]:
    """Stricter rate limit for login attempts."""
    return await check_rate_limit(
        key=f"login:{ip}",
        max_requests=settings.LOGIN_RATE_LIMIT,
        window_seconds=settings.LOGIN_LOCKOUT_MINUTES * 60,
    )
