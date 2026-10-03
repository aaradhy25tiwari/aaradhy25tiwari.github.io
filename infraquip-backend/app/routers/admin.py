"""
Admin Router — Listing review queue, user management, platform stats
"""
import uuid
import math
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.deps import AdminUser, DBSession
from app.models.machine import Machine, MachineStatus
from app.models.user import User, UserRole
from app.models.enquiry import Enquiry
from app.models.analytics import PlatformAnalytics
from app.models.subscription import Subscription
from app.schemas.admin import (
    ReviewDecisionRequest, ReviewQueueResponse, ReviewQueueItem,
    AdminStatsResponse, AdminUserResponse, AdminUserListResponse,
)
from app.services.email_service import (
    send_listing_approved_email,
    send_listing_rejected_email,
    send_account_reactivated_email,
)
from app.config import settings
from app.routers.account_requests import _gen_temp_password

router = APIRouter()


# ── GET /admin/review-queue ────────────────────────────────────
@router.get("/review-queue", response_model=ReviewQueueResponse)
async def get_review_queue(
    current_user: AdminUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """List all pending listings for admin review."""
    offset = (page - 1) * per_page
    result = await db.execute(
        select(Machine)
        .options(selectinload(Machine.images), selectinload(Machine.vendor), selectinload(Machine.category))
        .where(Machine.status == MachineStatus.pending)
        .order_by(Machine.created_at.asc())
        .offset(offset).limit(per_page)
    )
    machines = result.scalars().all()
    total = (await db.execute(
        select(func.count(Machine.id)).where(Machine.status == MachineStatus.pending)
    )).scalar() or 0

    items = [
        ReviewQueueItem(
            id=str(m.id),
            slug=m.slug,
            title=m.title,
            make=m.make,
            model=m.model,
            vendor_name=m.vendor.full_name if m.vendor else "",
            city=m.city,
            state=m.state,
            submitted_at=m.created_at,
            primary_image=m.images[0].display_url if m.images else None,
            category_name=m.category.name if m.category else None,
        )
        for m in machines
    ]

    return ReviewQueueResponse(
        results=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 0,
    )


# ── POST /admin/review-queue/{listing_id} ─────────────────────
@router.post("/review-queue/{listing_id}")
async def review_listing(
    listing_id: str,
    payload: ReviewDecisionRequest,
    background_tasks: BackgroundTasks,
    current_user: AdminUser,
    db: DBSession,
):
    """Approve or reject a listing."""
    result = await db.execute(
        select(Machine)
        .options(selectinload(Machine.vendor))
        .where(Machine.id == uuid.UUID(listing_id))
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    from datetime import datetime

    if payload.action == "approve":
        machine.status = MachineStatus.approved
        machine.approved_at = datetime.utcnow()
        machine.rejection_reason = None
        await db.commit()

        if machine.vendor:
            background_tasks.add_task(
                send_listing_approved_email,
                machine.vendor.email,
                machine.vendor.full_name,
                machine.title,
                f"{settings.ALLOWED_ORIGINS.split(',')[0]}/machines/{machine.slug}",
            )
        return {"message": f"Listing '{machine.title}' approved."}

    elif payload.action == "reject":
        if not payload.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required.")
        machine.status = MachineStatus.rejected
        machine.rejection_reason = payload.rejection_reason
        await db.commit()

        if machine.vendor:
            background_tasks.add_task(
                send_listing_rejected_email,
                machine.vendor.email,
                machine.vendor.full_name,
                machine.title,
                payload.rejection_reason,
            )
        return {"message": f"Listing '{machine.title}' rejected."}

    raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'.")


# ── GET /admin/machines ─────────────────────────────────────────
@router.get("/machines")
async def get_admin_machines(
    current_user: AdminUser,
    db: DBSession,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    """List all machines across the platform for admin with filtering & actions."""
    offset = (page - 1) * per_page
    stmt = (
        select(Machine)
        .options(
            selectinload(Machine.images),
            selectinload(Machine.vendor),
            selectinload(Machine.category),
        )
        .order_by(Machine.created_at.desc())
    )
    if status and status != "all":
        try:
            stmt = stmt.where(Machine.status == MachineStatus(status))
        except ValueError:
            pass

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(per_page))
    machines = result.scalars().all()

    items = []
    for m in machines:
        primary_img = next((img for img in m.images if img.is_primary), None)
        if not primary_img and m.images:
            primary_img = m.images[0]
        items.append({
            "id": str(m.id),
            "slug": m.slug,
            "title": m.title,
            "make": m.make,
            "model": m.model,
            "year_of_manufacture": m.year_of_manufacture,
            "status": m.status.value if hasattr(m.status, "value") else str(m.status),
            "rejection_reason": m.rejection_reason,
            "vendor_name": m.vendor.full_name if m.vendor else "Unknown Vendor",
            "vendor_email": m.vendor.email if m.vendor else None,
            "city": m.city,
            "state": m.state,
            "rental_price_daily": float(m.rental_price_daily) if m.rental_price_daily else None,
            "rental_price_monthly": float(m.rental_price_monthly) if m.rental_price_monthly else None,
            "rental_price_hourly": float(m.rental_price_hourly) if m.rental_price_hourly else None,
            "rental_price_weekly": float(m.rental_price_weekly) if m.rental_price_weekly else None,
            "contact_for_price": m.contact_for_price,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "primary_image": primary_img.display_url if primary_img else None,
            "category_name": m.category.name if m.category else None,
        })

    return {
        "results": items,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


# ── GET /admin/stats ───────────────────────────────────────────
@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(current_user: AdminUser, db: DBSession):
    """Platform-wide statistics."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_listings = (await db.execute(select(func.count(Machine.id)))).scalar() or 0
    pending_review = (await db.execute(
        select(func.count(Machine.id)).where(Machine.status == MachineStatus.pending)
    )).scalar() or 0
    approved_listings = (await db.execute(
        select(func.count(Machine.id)).where(Machine.status == MachineStatus.approved)
    )).scalar() or 0
    total_vendors = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.vendor)
    )).scalar() or 0
    total_customers = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.customer)
    )).scalar() or 0
    total_brokers = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.broker)
    )).scalar() or 0
    total_enquiries = (await db.execute(select(func.count(Enquiry.id)))).scalar() or 0

    return AdminStatsResponse(
        total_users=total_users,
        total_listings=total_listings,
        pending_review=pending_review,
        approved_listings=approved_listings,
        total_vendors=total_vendors,
        total_customers=total_customers,
        total_brokers=total_brokers,
        total_enquiries=total_enquiries,
    )


# ── GET /admin/users ───────────────────────────────────────────
@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    current_user: AdminUser,
    db: DBSession,
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """List all users with optional search."""
    offset = (page - 1) * per_page
    stmt = select(User).order_by(User.created_at.desc())

    if search:
        stmt = stmt.where(
            User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(per_page))
    users = result.scalars().all()

    items = [
        AdminUserResponse(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            role=u.role.value if hasattr(u.role, "value") else u.role,
            is_verified=u.is_verified,
            is_banned=u.is_banned,
            is_active=not u.is_banned,
            failed_login_attempts=u.failed_login_attempts or 0,
            reactivation_requested=u.reactivation_requested or False,
            reactivation_requested_at=u.reactivation_requested_at,
            reactivation_message=u.reactivation_message,
            created_at=u.created_at,
        )
        for u in users
    ]

    return AdminUserListResponse(
        results=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 0,
    )

# ── GET /admin/vendors ─────────────────────────────────────────
@router.get("/vendors")
async def list_vendors(
    current_user: AdminUser,
    db: DBSession,
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """List all vendors with optional search."""
    offset = (page - 1) * per_page
    stmt = (
        select(User)
        .options(selectinload(User.vendor_profile))
        .where(User.role == UserRole.vendor)
        .order_by(User.created_at.desc())
    )

    if search:
        stmt = stmt.where(
            User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(per_page))
    vendors = result.scalars().all()

    items = []
    for u in vendors:
        items.append({
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "business_name": u.vendor_profile.company_name if u.vendor_profile else None,
            "is_verified": u.is_verified,
            "is_banned": u.is_banned,
            "failed_login_attempts": u.failed_login_attempts or 0,
            "reactivation_requested": u.reactivation_requested or False,
            "reactivation_requested_at": u.reactivation_requested_at,
            "created_at": u.created_at,
        })

    return {
        "results": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if total > 0 else 0,
    }


# ── PATCH /admin/users/{user_id}/ban ──────────────────────────
@router.patch("/users/{user_id}/ban")
async def ban_user(user_id: str, current_user: AdminUser, db: DBSession):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = not user.is_banned
    if not user.is_banned:
        user.failed_login_attempts = 0
        user.reactivation_requested = False
    await db.commit()
    return {"message": f"User {'banned' if user.is_banned else 'unbanned'}."}


# ── POST /admin/users/{user_id}/reactivate ────────────────────
@router.post("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    background_tasks: BackgroundTasks,
    current_user: AdminUser,
    db: DBSession,
):
    """Admin approves account reactivation: resets failed attempts, generates new 24h temp password, and emails user."""
    from datetime import datetime, timezone, timedelta
    from supabase import create_client

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate fresh compliant temporary password
    temp_password = _gen_temp_password()

    # Update in Supabase Auth
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    if user.auth_uid:
        try:
            supabase.auth.admin.update_user_by_id(
                str(user.auth_uid),
                {"password": temp_password},
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to update auth credentials: {e}")
    else:
        try:
            resp = supabase.auth.admin.create_user({
                "email": user.email,
                "password": temp_password,
                "email_confirm": True,
            })
            user.auth_uid = uuid.UUID(resp.user.id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to create auth credentials: {e}")

    # Unblock, reset counters, and set 24h expiration
    user.is_banned = False
    user.failed_login_attempts = 0
    user.reactivation_requested = False
    user.reactivation_requested_at = None
    user.reactivation_message = None
    user.must_change_password = True
    user.temp_password_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    # User remains unverified until they log in with the new temp password
    user.is_verified = False

    await db.commit()

    # Email new credentials to user
    background_tasks.add_task(
        send_account_reactivated_email,
        user.email,
        user.full_name,
        temp_password,
    )

    return {
        "success": True,
        "message": f"Account for {user.email} has been reactivated. A new temporary password (valid for 24 hours) has been sent to their email.",
    }


# ── GET /admin/analytics/timeseries ────────────────────────────
@router.get("/analytics/timeseries")
async def analytics_timeseries(
    current_user: AdminUser,
    db: DBSession,
    days: int = Query(30, ge=1, le=365),
):
    """Return daily platform analytics for charting."""
    from datetime import datetime, timedelta

    start_date = datetime.utcnow().date() - timedelta(days=days - 1)

    # Platform analytics (daily rollup)
    pa_result = await db.execute(
        select(PlatformAnalytics)
        .where(PlatformAnalytics.date >= start_date)
        .order_by(PlatformAnalytics.date)
    )
    pa_rows = pa_result.scalars().all()
    pa_map = {str(row.date): row for row in pa_rows}

    # Machine creation counts per day
    from sqlalchemy import cast, Date
    machine_counts = await db.execute(
        select(
            cast(Machine.created_at, Date).label("date"),
            func.count(Machine.id).label("count"),
        )
        .where(Machine.created_at >= start_date)
        .group_by(cast(Machine.created_at, Date))
        .order_by(cast(Machine.created_at, Date))
    )
    machine_daily = {str(row.date): row.count for row in machine_counts.all()}

    # User registration counts per day
    user_counts = await db.execute(
        select(
            cast(User.created_at, Date).label("date"),
            func.count(User.id).label("count"),
        )
        .where(User.created_at >= start_date)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    user_daily = {str(row.date): row.count for row in user_counts.all()}

    # Enquiry counts per day
    enquiry_counts = await db.execute(
        select(
            cast(Enquiry.created_at, Date).label("date"),
            func.count(Enquiry.id).label("count"),
        )
        .where(Enquiry.created_at >= start_date)
        .group_by(cast(Enquiry.created_at, Date))
        .order_by(cast(Enquiry.created_at, Date))
    )
    enquiry_daily = {str(row.date): row.count for row in enquiry_counts.all()}

    # Build time series
    timeseries = []
    for i in range(days):
        d = (start_date + timedelta(days=i)).isoformat()
        pa = pa_map.get(d)
        timeseries.append({
            "date": d,
            "dau": pa.dau if pa else 0,
            "new_users": pa.new_users if pa else user_daily.get(d, 0),
            "new_listings": pa.new_listings if pa else machine_daily.get(d, 0),
            "total_enquiries": pa.total_enquiries if pa else enquiry_daily.get(d, 0),
            "total_revenue": float(pa.total_revenue) if pa and pa.total_revenue else 0,
        })

    # Active subscriptions count
    active_subs = (await db.execute(
        select(func.count()).select_from(Subscription)
        .where(Subscription.status == "active")
    )).scalar() or 0

    return {
        "timeseries": timeseries,
        "totals": {
            "total_users": (await db.execute(select(func.count(User.id)))).scalar() or 0,
            "total_vendors": (await db.execute(select(func.count(User.id)).where(User.role == UserRole.vendor))).scalar() or 0,
            "total_listings": (await db.execute(select(func.count(Machine.id)))).scalar() or 0,
            "approved_listings": (await db.execute(select(func.count(Machine.id)).where(Machine.status == MachineStatus.approved))).scalar() or 0,
            "total_enquiries": (await db.execute(select(func.count(Enquiry.id)))).scalar() or 0,
            "active_subscriptions": active_subs,
            "total_revenue": float(
                (await db.execute(
                    select(func.coalesce(func.sum(Subscription.amount_paid), 0))
                    .where(Subscription.status == "active")
                )).scalar() or 0
            ),
        },
    }
