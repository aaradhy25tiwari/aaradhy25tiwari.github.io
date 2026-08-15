"""
Account Requests Router — Gated registration & admin approval queue
"""
import uuid
import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.deps import AdminUser, DBSession
from app.models.account_request import AccountRequest, AccountRequestStatus
from app.models.user import User, UserRole, VendorProfile, CustomerProfile, BrokerProfile
from app.models.subscription import Subscription, SubscriptionPlan
from app.config import settings
from app.services.email_service import (
    send_account_request_received_email,
    send_account_approved_email,
    send_account_rejected_email,
)
from typing import Literal

router = APIRouter()


# ── Pydantic schemas ───────────────────────────────────────────

class AccountRequestCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None    
    role: Literal["customer", "vendor", "broker"] = "customer"
    company_name: str | None = None
    city: str | None = None
    gstin_pan: str | None = None
    message: str | None = None


class RejectPayload(BaseModel):
    reason: str


class AccountRequestOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None
    role: str
    company_name: str | None
    city: str | None
    gstin_pan: str | None
    message: str | None
    status: str
    rejection_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountRequestListResponse(BaseModel):
    items: list[AccountRequestOut]
    total: int
    page: int
    per_page: int
    total_pages: int


def _gen_temp_password(length: int = 14) -> str:
    """Generate a readable temporary password: letters + digits, no ambiguous chars."""
    alphabet = string.ascii_letters.replace("l", "").replace("O", "").replace("I", "") + string.digits
    # Ensure at least 1 uppercase, 1 lowercase, 1 digit
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.isupper() for c in pwd)
                and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd)):
            return pwd


def get_supabase():
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# ── POST /account-requests  (PUBLIC — no auth required) ────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_account_request(
    payload: AccountRequestCreate,
    background_tasks: BackgroundTasks,
    db: DBSession,
):
    """Submit a new account request for admin review."""
    # Check for duplicate email in requests
    existing_req = await db.execute(
        select(AccountRequest).where(AccountRequest.email == payload.email)
    )
    if existing_req.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account request with this email already exists.",
        )
    # Check if already a registered user
    existing_user = await db.execute(
        select(User).where(User.email == payload.email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in.",
        )

    req = AccountRequest(
        id=uuid.uuid4(),
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        company_name=payload.company_name,
        city=payload.city,
        gstin_pan=payload.gstin_pan,
        message=payload.message,
        status=AccountRequestStatus.pending,
    )
    db.add(req)
    await db.commit()

    # Send confirmation email
    background_tasks.add_task(
        send_account_request_received_email, payload.email, payload.full_name
    )

    return {"message": "Your request has been submitted. We'll email you within 24 hours."}


# ── GET /admin/account-requests ────────────────────────────────
@router.get("/admin", response_model=AccountRequestListResponse)
async def list_account_requests(
    admin: AdminUser,
    db: DBSession,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """List account requests. Admin only."""
    q = select(AccountRequest).order_by(AccountRequest.created_at.desc())
    count_q = select(func.count()).select_from(AccountRequest)

    if status_filter:
        try:
            status_enum = AccountRequestStatus(status_filter)
            q = q.where(AccountRequest.status == status_enum)
            count_q = count_q.where(AccountRequest.status == status_enum)
        except ValueError:
            pass

    total = (await db.execute(count_q)).scalar() or 0
    results = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    items = results.scalars().all()

    return AccountRequestListResponse(
        items=[AccountRequestOut(
            id=str(r.id),
            full_name=r.full_name,
            email=r.email,
            phone=r.phone,
            role=r.role,
            company_name=r.company_name,
            city=r.city,
            gstin_pan=r.gstin_pan,
            message=r.message,
            status=r.status.value if hasattr(r.status, "value") else r.status,
            rejection_reason=r.rejection_reason,
            created_at=r.created_at,
        ) for r in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=max(1, -(-total // per_page)),
    )


# ── POST /admin/account-requests/{id}/approve ──────────────────
@router.post("/admin/{request_id}/approve", status_code=status.HTTP_200_OK)
async def approve_account_request(
    request_id: str,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
    db: DBSession,
):
    """Approve a request: create Supabase user + app user with temp credentials."""
    result = await db.execute(
        select(AccountRequest).where(AccountRequest.id == uuid.UUID(request_id))
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.status != AccountRequestStatus.pending:
        raise HTTPException(status_code=400, detail=f"Request is already {req.status.value}.")

    # Check not already a user
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    # Generate temp password
    temp_password = _gen_temp_password()

    # Create Supabase Auth user
    supabase = get_supabase()
    try:
        auth_resp = supabase.auth.admin.create_user({
            "email": req.email,
            "password": temp_password,
            "email_confirm": True,  # Pre-confirm — no email verification step
            "user_metadata": {
                "full_name": req.full_name,
                "role": req.role,
            },
        })
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supabase user creation failed: {e}")

    auth_uid = auth_resp.user.id
    role_enum = {
        "vendor": UserRole.vendor,
        "broker": UserRole.broker,
    }.get(req.role, UserRole.customer)

    # Determine free plan
    plan_code = {
        UserRole.vendor: "vendor_free",
        UserRole.broker: "broker_free",
    }.get(role_enum, "customer_free")
    plan_result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.plan_code == plan_code)
    )
    free_plan = plan_result.scalar_one_or_none()

    # Create app User row
    user = User(
        id=uuid.uuid4(),
        auth_uid=uuid.UUID(auth_uid),
        email=req.email,
        full_name=req.full_name,
        phone=req.phone,
        role=role_enum,
        is_verified=True,            # Admin-vetted
        must_change_password=True,   # Force password change on first login
    )
    db.add(user)
    await db.flush()

    # Role-specific profile
    if role_enum == UserRole.vendor:
        profile = VendorProfile(
            user_id=user.id,
            company_name=req.company_name or req.full_name,
            city=req.city,
            gstin=req.gstin_pan if req.gstin_pan and len(req.gstin_pan) == 15 else None,
            pan=req.gstin_pan if req.gstin_pan and len(req.gstin_pan) == 10 else None,
        )
        db.add(profile)
    elif role_enum == UserRole.broker:
        profile = BrokerProfile(
            user_id=user.id,
            company_name=req.company_name,
            city=req.city,
            gstin=req.gstin_pan if req.gstin_pan and len(req.gstin_pan) == 15 else None,
            pan=req.gstin_pan if req.gstin_pan and len(req.gstin_pan) == 10 else None,
            description=req.message,
        )
        db.add(profile)
    else:
        profile = CustomerProfile(
            user_id=user.id,
            company_name=req.company_name,
            city=req.city,
        )
        db.add(profile)

    # Free subscription
    if free_plan:
        db.add(Subscription(user_id=user.id, plan_id=free_plan.id, status="active"))

    # Update request record
    req.status = AccountRequestStatus.approved
    req.supabase_user_id = uuid.UUID(auth_uid)
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by = admin.id

    await db.commit()

    # Send approval email with temp credentials
    background_tasks.add_task(
        send_account_approved_email,
        req.email, req.full_name, req.role, temp_password
    )

    return {"message": f"Account approved for {req.email}. Credentials email sent."}


# ── POST /admin/account-requests/{id}/reject ───────────────────
@router.post("/admin/{request_id}/reject", status_code=status.HTTP_200_OK)
async def reject_account_request(
    request_id: str,
    payload: RejectPayload,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
    db: DBSession,
):
    """Reject a request and notify applicant with reason."""
    result = await db.execute(
        select(AccountRequest).where(AccountRequest.id == uuid.UUID(request_id))
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.status != AccountRequestStatus.pending:
        raise HTTPException(status_code=400, detail=f"Request is already {req.status.value}.")

    req.status = AccountRequestStatus.rejected
    req.rejection_reason = payload.reason
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by = admin.id
    await db.commit()

    background_tasks.add_task(
        send_account_rejected_email,
        req.email, req.full_name, payload.reason
    )

    return {"message": f"Request rejected. Notification sent to {req.email}."}


# ── GET /admin/account-requests/stats ──────────────────────────
@router.get("/admin/stats")
async def account_request_stats(admin: AdminUser, db: DBSession):
    """Quick count of pending requests (for badge in sidebar)."""
    pending = (await db.execute(
        select(func.count()).select_from(AccountRequest)
        .where(AccountRequest.status == AccountRequestStatus.pending)
    )).scalar() or 0
    return {"pending": pending}
