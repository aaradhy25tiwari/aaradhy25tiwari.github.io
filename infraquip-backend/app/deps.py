"""
FastAPI Dependency Injection — Auth, DB, Role Guards
"""
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


# ── JWT Verification via Supabase ─────────────────────────────

async def verify_supabase_token(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verify Supabase JWT and return the authenticated User from our DB."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Verify token with Supabase Auth API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_ANON_KEY,
                },
                timeout=10.0,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        supabase_user = response.json()
        auth_uid = supabase_user.get("id")

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
        )

    # Look up our app user by Supabase auth UID
    result = await db.execute(
        select(User).where(User.auth_uid == auth_uid)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please register.",
        )

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact support.",
        )

    return user


# ── Optional auth (guest-friendly endpoints) ──────────────────

async def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Returns User if authenticated, None for guests."""
    if not credentials:
        return None
    try:
        return await verify_supabase_token(credentials, db)
    except HTTPException:
        return None


# ── Role Guards ───────────────────────────────────────────────

async def require_vendor(
    current_user: User = Depends(verify_supabase_token),
) -> User:
    if current_user.role != UserRole.vendor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor access required",
        )
    return current_user


async def require_customer(
    current_user: User = Depends(verify_supabase_token),
) -> User:
    if current_user.role != UserRole.customer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    return current_user


async def require_broker(
    current_user: User = Depends(verify_supabase_token),
) -> User:
    if current_user.role != UserRole.broker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Broker access required",
        )
    return current_user


async def require_customer_or_broker(
    current_user: User = Depends(verify_supabase_token),
) -> User:
    """Allow customers AND brokers to use buyer-style endpoints (enquire, wishlist)."""
    if current_user.role not in (UserRole.customer, UserRole.broker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer or broker access required",
        )
    return current_user


async def require_admin(
    current_user: User = Depends(verify_supabase_token),
) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ── Type aliases for clean signatures ─────────────────────────
CurrentUser = Annotated[User, Depends(verify_supabase_token)]
OptionalUser = Annotated[Optional[User], Depends(get_optional_user)]
VendorUser = Annotated[User, Depends(require_vendor)]
CustomerUser = Annotated[User, Depends(require_customer)]
BrokerUser = Annotated[User, Depends(require_broker)]
CustomerOrBrokerUser = Annotated[User, Depends(require_customer_or_broker)]
AdminUser = Annotated[User, Depends(require_admin)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
