"""
Redis/Upstash Cache Service — Search result caching, rate limiting counters
"""
import json
import logging
from typing import Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

_redis_client = None


def _get_client():
    """Lazy-init Redis client (Upstash REST or local Redis)."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        try:
            from upstash_redis import Redis
            _redis_client = Redis(
                url=settings.UPSTASH_REDIS_REST_URL,
                token=settings.UPSTASH_REDIS_REST_TOKEN,
            )
            logger.info("Connected to Upstash Redis")
        except Exception as e:
            logger.warning(f"Upstash Redis unavailable, caching disabled: {e}")
            _redis_client = None
    elif settings.REDIS_URL:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info("Connected to local Redis")
        except Exception as e:
            logger.warning(f"Local Redis unavailable, caching disabled: {e}")
            _redis_client = None
    else:
        logger.info("No Redis configured — caching disabled")

    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    """Get cached value by key. Returns parsed JSON or None."""
    client = _get_client()
    if not client:
        return None
    try:
        val = await client.get(key)
        if val:
            return json.loads(val)
    except Exception as e:
        logger.debug(f"Cache GET failed for {key}: {e}")
    return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> None:
    """Set cached value with TTL."""
    client = _get_client()
    if not client:
        return
    try:
        await client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception as e:
        logger.debug(f"Cache SET failed for {key}: {e}")


async def cache_delete(pattern: str) -> None:
    """Delete all keys matching pattern (e.g. 'search:*')."""
    client = _get_client()
    if not client:
        return
    try:
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
    except Exception as e:
        logger.debug(f"Cache DELETE failed for {pattern}: {e}")


def build_search_cache_key(params: dict) -> str:
    """Build a deterministic cache key from search parameters."""
    normalized = {k: str(v) for k, v in sorted(params.items()) if v is not None}
    return "search:" + ":".join(f"{k}={v}" for k, v in normalized.items())
