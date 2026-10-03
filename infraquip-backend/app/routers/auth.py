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
    VerifyOtpRequest, ResetPasswordRequest,
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

    # Check 24-hour expiration if temporary password was issued
    if current_user.temp_password_expires_at:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        exp = current_user.temp_password_expires_at
        if not exp.tzinfo:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            raise HTTPException(
                status_code=400,
                detail="Your temporary password has expired (valid for 24 hours). Please use 'Forgot Password' on the login screen to receive an OTP reset code.",
            )

    # Update password in Supabase Auth
    supabase = get_supabase()
    try:
        supabase.auth.admin.update_user_by_id(
            str(current_user.auth_uid),
            {"password": payload.new_password},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Password update failed: {e}")

    # Clear the must_change_password flag & expiry, mark verified & reset failed attempts
    current_user.must_change_password = False
    current_user.temp_password_expires_at = None
    current_user.is_verified = True
    current_user.failed_login_attempts = 0
    await db.commit()

    return {"message": "Password updated successfully."}


# ── POST /auth/pre-login-check ────────────────────────────────
class PreLoginCheckRequest(BaseModel):
    email: str


@router.post("/pre-login-check", status_code=status.HTTP_200_OK)
async def pre_login_check(payload: PreLoginCheckRequest, db: DBSession):
    """Check if account is blocked before login attempt."""
    email_clean = str(payload.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()

    if not user:
        return {"blocked": False, "attempts_remaining": 4, "is_verified": False}

    if user.is_banned:
        return {
            "blocked": True,
            "attempts_remaining": 0,
            "is_verified": user.is_verified,
            "message": "This account is blocked due to security reasons. Please request account reactivation.",
        }

    attempts_left = max(0, 4 - (user.failed_login_attempts or 0))
    return {
        "blocked": False,
        "attempts_remaining": attempts_left,
        "is_verified": user.is_verified,
    }


# ── POST /auth/login-failed ───────────────────────────────────
class LoginFailedRequest(BaseModel):
    email: str


@router.post("/login-failed", status_code=status.HTTP_200_OK)
async def login_failed(payload: LoginFailedRequest, db: DBSession):
    """Increment failed login attempts (max 4). Block account if attempts exhausted."""
    email_clean = str(payload.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()

    if not user:
        return {
            "blocked": False,
            "attempts_remaining": None,
            "message": "Incorrect credentials. Please try again.",
        }

    if user.is_banned:
        return {
            "blocked": True,
            "attempts_remaining": 0,
            "message": "This account has been blocked due to multiple failed login attempts. Please request account reactivation.",
        }

    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1

    if user.failed_login_attempts >= 4:
        user.is_banned = True
        user.failed_login_attempts = 4
        await db.commit()
        return {
            "blocked": True,
            "attempts_remaining": 0,
            "message": "Your account has been blocked after 4 failed password attempts. You can request account reactivation using your registered email.",
        }

    attempts_left = 4 - user.failed_login_attempts
    await db.commit()
    return {
        "blocked": False,
        "attempts_remaining": attempts_left,
        "message": f"Incorrect password. You have {attempts_left} attempt{'s' if attempts_left != 1 else ''} remaining before your account is blocked.",
    }


# ── POST /auth/login-success ──────────────────────────────────
class LoginSuccessRequest(BaseModel):
    email: str


@router.post("/login-success", status_code=status.HTTP_200_OK)
async def login_success(payload: LoginSuccessRequest, db: DBSession):
    """Handle successful login: activate/verify user, reset failed attempts counter."""
    from datetime import datetime, timezone
    email_clean = str(payload.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()

    if not user:
        return {"success": True, "must_change_password": False, "is_verified": True}

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is blocked. Please request account reactivation.",
        )

    # Check 24-hour expiration of temporary password if applicable
    if user.temp_password_expires_at:
        now = datetime.now(timezone.utc)
        exp = user.temp_password_expires_at
        if not exp.tzinfo:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your temporary password has expired (valid for 24 hours). Please use 'Forgot Password' or request reactivation.",
            )

    # First login / valid login sets user to verified and resets failed attempts
    user.is_verified = True
    user.failed_login_attempts = 0
    await db.commit()

    return {
        "success": True,
        "must_change_password": user.must_change_password,
        "is_verified": user.is_verified,
    }


# ── POST /auth/request-reactivation ───────────────────────────
class ReactivationRequestPayload(BaseModel):
    email: str


@router.post("/request-reactivation", status_code=status.HTTP_200_OK)
async def request_reactivation(
    payload: ReactivationRequestPayload,
    background_tasks: BackgroundTasks,
    db: DBSession,
):
    """Send OTP for account reactivation verification to user's registered email."""
    import secrets
    from datetime import datetime, timezone, timedelta
    from app.models.account_reactivation_otp import AccountReactivationOTP
    from app.services.email_service import send_account_reactivation_otp_email

    email_clean = str(payload.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()

    if not user:
        return {"message": "If an account exists, a 6-digit reactivation verification code has been sent to your email."}

    if not user.is_banned and (user.failed_login_attempts or 0) < 4:
        return {"message": "Your account is active. You can log in directly or reset your password if forgotten."}

    # Generate 6-digit numeric OTP
    otp_code = "".join(secrets.choice("0123456789") for _ in range(6))

    # Invalidate prior unused OTPs
    prior_otps = await db.execute(
        select(AccountReactivationOTP).where(
            AccountReactivationOTP.email == email_clean,
            AccountReactivationOTP.is_used == False,
        )
    )
    for prior in prior_otps.scalars().all():
        prior.is_used = True

    # 10 minute expiration
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp_entry = AccountReactivationOTP(
        id=uuid.uuid4(),
        email=email_clean,
        otp=otp_code,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(otp_entry)
    await db.commit()

    # Dispatch email in background
    background_tasks.add_task(
        send_account_reactivation_otp_email,
        email_clean,
        otp_code,
        user.full_name,
    )

    return {"message": "If an account exists, a 6-digit reactivation verification code has been sent to your email."}


# ── POST /auth/verify-reactivation-otp ─────────────────────────
class VerifyReactivationOtpPayload(BaseModel):
    email: str
    otp: str
    message: str | None = None


@router.post("/verify-reactivation-otp", status_code=status.HTTP_200_OK)
async def verify_reactivation_otp(
    payload: VerifyReactivationOtpPayload,
    db: DBSession,
):
    """Verify OTP and submit reactivation request to Admin."""
    from datetime import datetime, timezone
    from app.models.account_reactivation_otp import AccountReactivationOTP

    email_clean = str(payload.email).strip().lower()
    result = await db.execute(
        select(AccountReactivationOTP)
        .where(
            AccountReactivationOTP.email == email_clean,
            AccountReactivationOTP.otp == payload.otp.strip(),
            AccountReactivationOTP.is_used == False,
        )
        .order_by(AccountReactivationOTP.created_at.desc())
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record or not otp_record.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one.",
        )

    # Find user
    user_result = await db.execute(select(User).where(User.email == email_clean))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Mark OTP used and set reactivation request on user
    otp_record.is_used = True
    user.reactivation_requested = True
    user.reactivation_requested_at = datetime.now(timezone.utc)
    if payload.message:
        user.reactivation_message = payload.message

    await db.commit()

    return {
        "success": True,
        "message": "Your identity has been verified and your reactivation request has been sent to the Admin. You will receive an email with your credentials once approved.",
    }


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
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
):
    """Generate and email a 6-digit OTP for password reset."""
    email_clean = str(payload.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()

    if user:
        import secrets
        from datetime import datetime, timezone, timedelta
        from app.models.password_reset_otp import PasswordResetOTP
        from app.services.email_service import send_password_reset_otp_email

        # Generate a secure 6-digit numeric OTP
        otp_code = "".join(secrets.choice("0123456789") for _ in range(6))

        # Invalidate any prior unused OTPs for this email
        prior_otps = await db.execute(
            select(PasswordResetOTP).where(
                PasswordResetOTP.email == email_clean,
                PasswordResetOTP.is_used == False,
            )
        )
        for prior in prior_otps.scalars().all():
            prior.is_used = True

        # Store new OTP valid for 10 minutes
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        otp_entry = PasswordResetOTP(
            id=uuid.uuid4(),
            email=email_clean,
            otp=otp_code,
            expires_at=expires_at,
            is_used=False,
        )
        db.add(otp_entry)
        await db.commit()

        # Send OTP email
        background_tasks.add_task(
            send_password_reset_otp_email,
            email_clean,
            otp_code,
            user.full_name,
        )

    # Always return 200 to prevent email enumeration
    return {"message": "If an account exists, a 6-digit verification code has been sent to your email."}


# ── POST /auth/verify-reset-otp ────────────────────────────────
@router.post("/verify-reset-otp", status_code=status.HTTP_200_OK)
async def verify_reset_otp(
    payload: VerifyOtpRequest,
    db: DBSession,
):
    """Verify if OTP is valid and not expired."""
    from app.models.password_reset_otp import PasswordResetOTP
    email_clean = str(payload.email).strip().lower()
    result = await db.execute(
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.email == email_clean,
            PasswordResetOTP.otp == payload.otp.strip(),
            PasswordResetOTP.is_used == False,
        )
        .order_by(PasswordResetOTP.created_at.desc())
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record or not otp_record.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one.",
        )

    return {"valid": True, "message": "Verification code is valid."}


# ── POST /auth/reset-password ──────────────────────────────────
@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    payload: ResetPasswordRequest,
    db: DBSession,
):
    """Verify OTP and reset user's password in Supabase Auth & database."""
    import re
    from app.models.password_reset_otp import PasswordResetOTP
    email_clean = str(payload.email).strip().lower()

    # 1. Validate password rules
    if payload.confirm_password and payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", payload.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", payload.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", payload.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")

    # 2. Check and validate OTP
    result = await db.execute(
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.email == email_clean,
            PasswordResetOTP.otp == payload.otp.strip(),
            PasswordResetOTP.is_used == False,
        )
        .order_by(PasswordResetOTP.created_at.desc())
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record or not otp_record.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one.",
        )

    # 3. Find User
    user_result = await db.execute(select(User).where(User.email == email_clean))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # 4. Update in Supabase Auth
    supabase = get_supabase()
    supabase_uid = str(user.auth_uid) if user.auth_uid else None

    if supabase_uid:
        try:
            supabase.auth.admin.update_user_by_id(
                supabase_uid,
                {"password": payload.new_password},
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to update password: {e}")
    else:
        try:
            resp = supabase.auth.admin.create_user({
                "email": user.email,
                "password": payload.new_password,
                "email_confirm": True,
            })
            user.auth_uid = uuid.UUID(resp.user.id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to update password: {e}")

    # 5. Mark OTP as used and clear must_change_password
    otp_record.is_used = True
    user.must_change_password = False
    await db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}


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
