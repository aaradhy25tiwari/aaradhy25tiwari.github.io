"""
Auth Router — Account request flow, Login (via Supabase), Me, Change Password, Forgot/Reset
Registration is gated: users submit a request; admin approves and sends temp credentials.
"""
import uuid
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from supabase import create_client, Client

from app.config import settings
from app.database import AsyncSessionLocal
from app.deps import CurrentUser, DBSession
from app.models.user import User, UserRole, VendorProfile, CustomerProfile, BrokerProfile
from app.models.subscription import Subscription, SubscriptionPlan
from app.schemas.user import (
    RegisterRequest, ForgotPasswordRequest,
    UserResponse, UpdateUserPreferencesRequest,
    UpdateVendorProfileRequest, UpdateCustomerProfileRequest,
    UpdateBrokerProfileRequest,
)

router = APIRouter()


def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# ── POST /auth/request-account ───────────────────────────────
# Registration is now gated — users submit a request via /account-requests
# This route is kept for backwards compatibility but returns a helpful error
@router.post("/register", status_code=status.HTTP_410_GONE)
async def register_deprecated():
    """Deprecated. Use POST /account-requests to request access."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Direct registration is disabled. Please request access at /request-access.",
    )


# ── POST /auth/change-password ────────────────────────────────
class ChangePasswordRequest(BaseModel):
    new_password: str
    confirm_password: str


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Force-change password. Clears must_change_password flag on success."""
    from pydantic import BaseModel as _BM
    import re

    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", payload.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not re.search(r"[0-9]", payload.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")

    # Update password in Supabase Auth
    supabase = get_supabase()
    try:
        supabase.auth.admin.update_user_by_id(
            str(current_user.auth_uid),
            {"password": payload.new_password},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Password update failed: {e}")

    # Clear the must_change_password flag
    current_user.must_change_password = False
    await db.commit()

    return {"message": "Password updated successfully."}


# ── GET /auth/me ───────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser, db: DBSession):
    """Return the authenticated user's full profile."""
    # Eagerly load relationships via a fresh query with joinedload
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.vendor_profile),
            selectinload(User.customer_profile),
            selectinload(User.broker_profile),
            selectinload(User.subscriptions).selectinload(Subscription.plan),
        )
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return user


# ── POST /auth/forgot-password ─────────────────────────────────
@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(payload: ForgotPasswordRequest):
    """Send password reset email via Supabase Auth."""
    supabase = get_supabase()
    try:
        supabase.auth.reset_password_email(
            payload.email,
            options={"redirect_to": f"{settings.ALLOWED_ORIGINS.split(',')[0]}/reset-password"},
        )
    except Exception:
        pass  # Always return 200 to avoid email enumeration
    return {"message": "If an account exists, a reset email has been sent."}


# ── PUT /auth/me ───────────────────────────────────────────────
@router.put("/me", response_model=UserResponse)
async def update_me(
    payload: UpdateUserPreferencesRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update user display preferences and basic info."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.dark_mode_preference is not None:
        current_user.dark_mode_preference = payload.dark_mode_preference
    if payload.text_size_preference is not None:
        current_user.text_size_preference = payload.text_size_preference
    await db.commit()
    await db.refresh(current_user)
    return current_user


# ── PUT /auth/me/vendor-profile ────────────────────────────────
@router.put("/me/vendor-profile", response_model=UserResponse)
async def update_vendor_profile(
    payload: UpdateVendorProfileRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update vendor profile fields."""
    if current_user.role != UserRole.vendor:
        raise HTTPException(status_code=403, detail="Vendor access required")

    result = await db.execute(
        select(VendorProfile).where(VendorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    return await get_me(current_user, db)


# ── PUT /auth/me/broker-profile ───────────────────────────────
@router.put("/me/broker-profile", response_model=UserResponse)
async def update_broker_profile(
    payload: UpdateBrokerProfileRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update broker profile fields."""
    if current_user.role != UserRole.broker:
        raise HTTPException(status_code=403, detail="Broker access required")

    result = await db.execute(
        select(BrokerProfile).where(BrokerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Broker profile not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    return await get_me(current_user, db)


# ── PUT /auth/me/customer-profile ─────────────────────────────
@router.put("/me/customer-profile", response_model=UserResponse)
async def update_customer_profile(
    payload: UpdateCustomerProfileRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update customer profile fields."""
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Customer access required")

    result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Customer profile not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    return await get_me(current_user, db)
