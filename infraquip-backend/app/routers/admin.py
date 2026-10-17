import uuid
import math
import logging
import re
import io
import csv
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Request, status, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.deps import AdminUser, DBSession
from app.models.machine import Machine, MachineStatus, Category, SubCategory, EquipmentMasterCatalog
from app.models.user import User, UserRole
from app.models.enquiry import Enquiry
from app.models.analytics import PlatformAnalytics
from app.models.subscription import Subscription
from app.schemas.admin import (
    ReviewDecisionRequest, ReviewQueueResponse, ReviewQueueItem,
    AdminStatsResponse, AdminUserResponse, AdminUserListResponse,
)
from app.services.notification_service import (
    notify_listing_approved,
    notify_listing_rejected,
)
from app.services.email_service import (
    send_listing_approved_email,
    send_listing_rejected_email,
    send_account_reactivated_email,
)
from app.core.rate_limiter import limiter, get_authenticated_user_key
from app.config import settings
from app.routers.account_requests import _gen_temp_password

logger = logging.getLogger(__name__)
router = APIRouter()


# ── GET /admin/review-queue ────────────────────────────────────
@router.get("/review-queue", response_model=ReviewQueueResponse)
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def get_review_queue(
    request: Request,
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
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def review_listing(
    request: Request,
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

    # Explicitly ensure vendor is loaded before committing/detaching session
    vendor = machine.vendor
    if not vendor and machine.vendor_id:
        v_res = await db.execute(select(User).where(User.id == machine.vendor_id))
        vendor = v_res.scalar_one_or_none()

    vendor_email = vendor.email if vendor else None
    vendor_name = (vendor.full_name if vendor and vendor.full_name else "Vendor")
    machine_title = machine.title
    machine_slug = machine.slug
    vendor_id = machine.vendor_id

    from datetime import datetime, timezone, timedelta

    if payload.action == "approve":
        machine.status = MachineStatus.approved
        machine.availability = True
        machine.approved_at = datetime.now(timezone.utc)
        machine.expires_at = datetime.now(timezone.utc) + timedelta(days=getattr(settings, "LISTING_VALIDITY_DAYS", 30))
        machine.rejection_reason = None

        # In-app notification
        if vendor_id:
            try:
                await notify_listing_approved(db, vendor_id, machine_title, machine_slug)
            except Exception as e:
                logger.error(f"Failed to create in-app notification for approved listing {listing_id}: {e}")

        await db.commit()

        if vendor_email:
            base_origin = settings.ALLOWED_ORIGINS.split(",")[0].strip() if settings.ALLOWED_ORIGINS else "http://localhost:3000"
            listing_url = f"{base_origin}/machines/{machine_slug}"
            logger.info(f"Queuing listing approved email for {vendor_email} (Machine: '{machine_title}')")
            background_tasks.add_task(
                send_listing_approved_email,
                vendor_email,
                vendor_name,
                machine_title,
                listing_url,
            )
        else:
            logger.warning(f"Listing {listing_id} approved but no vendor email was found (vendor_id={vendor_id})")

        return {"message": f"Listing '{machine_title}' approved."}

    elif payload.action == "reject":
        if not payload.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required.")
        machine.status = MachineStatus.rejected
        machine.rejection_reason = payload.rejection_reason

        # In-app notification
        if vendor_id:
            try:
                await notify_listing_rejected(db, vendor_id, machine_title, payload.rejection_reason)
            except Exception as e:
                logger.error(f"Failed to create in-app notification for rejected listing {listing_id}: {e}")

        await db.commit()

        if vendor_email:
            logger.info(f"Queuing listing rejected email for {vendor_email} (Machine: '{machine_title}')")
            background_tasks.add_task(
                send_listing_rejected_email,
                vendor_email,
                vendor_name,
                machine_title,
                payload.rejection_reason,
            )
        else:
            logger.warning(f"Listing {listing_id} rejected but no vendor email was found (vendor_id={vendor_id})")

        return {"message": f"Listing '{machine_title}' rejected."}

    raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'.")


# ── GET /admin/machines ─────────────────────────────────────────
@router.get("/machines")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def get_admin_machines(
    request: Request,
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
        if status in ["inactive", "paused"]:
            stmt = stmt.where(
                (Machine.status == MachineStatus.paused)
                | (Machine.availability == False)
                | ((Machine.expires_at.is_not(None)) & (Machine.expires_at < func.now()))
            )
        elif status == "expired":
            stmt = stmt.where(
                (Machine.expires_at.is_not(None)) & (Machine.expires_at < func.now())
            )
        else:
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
            "availability": m.availability,
            "expires_at": m.expires_at.isoformat() if m.expires_at else None,
            "is_expired": m.is_expired,
            "is_active": m.is_active,
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
            "is_negotiable": getattr(m, "is_negotiable", False) or False,
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


# ── POST /admin/machines/{listing_id}/reactivate ───────────────
@router.post("/machines/{listing_id}/reactivate")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def reactivate_admin_machine(
    request: Request,
    listing_id: str,
    background_tasks: BackgroundTasks,
    current_user: AdminUser,
    db: DBSession,
):
    """Admin reactivates an inactive, paused, unavailable, or expired listing."""
    result = await db.execute(
        select(Machine)
        .options(selectinload(Machine.vendor))
        .where(Machine.id == uuid.UUID(listing_id))
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    validity_days = getattr(settings, "LISTING_VALIDITY_DAYS", 30)

    machine.status = MachineStatus.approved
    machine.availability = True
    machine.rejection_reason = None
    machine.approved_at = now
    machine.expires_at = now + timedelta(days=validity_days)

    # In-app notification
    if machine.vendor_id:
        try:
            await notify_listing_approved(db, machine.vendor_id, machine.title, machine.slug)
        except Exception as e:
            logger.error(f"Failed to create notification for reactivated listing {listing_id}: {e}")

    await db.commit()

    # Email vendor
    vendor = machine.vendor
    if vendor and vendor.email:
        base_origin = settings.ALLOWED_ORIGINS.split(",")[0].strip() if settings.ALLOWED_ORIGINS else "http://localhost:3000"
        listing_url = f"{base_origin}/machines/{machine.slug}"
        background_tasks.add_task(
            send_listing_approved_email,
            vendor.email,
            vendor.full_name or "Vendor",
            machine.title,
            listing_url,
        )

    return {
        "message": f"Listing '{machine.title}' has been successfully reactivated.",
        "status": "approved",
        "availability": True,
        "expires_at": machine.expires_at.isoformat() if machine.expires_at else None,
        "is_expired": False,
        "is_active": True,
    }


# ── GET /admin/stats ───────────────────────────────────────────
@router.get("/stats", response_model=AdminStatsResponse)
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def admin_stats(request: Request, current_user: AdminUser, db: DBSession):
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
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def list_users(
    request: Request,
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
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def list_vendors(
    request: Request,
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
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def ban_user(request: Request, user_id: str, current_user: AdminUser, db: DBSession):
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
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def reactivate_user(
    request: Request,
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
            logger.error("Failed to update auth credentials for reactivation: %s", e)
            raise HTTPException(status_code=502, detail="Authentication service temporarily unavailable. Please try again.")
    else:
        try:
            resp = supabase.auth.admin.create_user({
                "email": user.email,
                "password": temp_password,
                "email_confirm": True,
            })
            user.auth_uid = uuid.UUID(resp.user.id)
        except Exception as e:
            logger.error("Failed to create auth credentials for reactivation: %s", e)
            raise HTTPException(status_code=502, detail="Authentication service temporarily unavailable. Please try again.")

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
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def analytics_timeseries(
    request: Request,
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


# ── Equipment Master Catalog Admin APIs ──────────────────────────

from pydantic import BaseModel, Field

class MasterCatalogItemCreate(BaseModel):
    category_name: str = Field(..., min_length=2, max_length=100)
    make: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=200)
    capacity_specs: Optional[str] = Field(None, max_length=300)

class BulkMasterCatalogItemCreate(BaseModel):
    items: List[MasterCatalogItemCreate]

class BulkMasterCatalogAnalyzeRequest(BaseModel):
    items: List[MasterCatalogItemCreate]

class MasterCatalogItemUpdate(BaseModel):
    category_name: Optional[str] = Field(None, min_length=2, max_length=100)
    make: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=200)
    capacity_specs: Optional[str] = Field(None, max_length=300)

class AddListingToMasterRequest(BaseModel):
    category_name: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    capacity_specs: Optional[str] = None
    add_type: str = "both"  # "make_only", "model_only", "both"

class AdminCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: Optional[str] = Field(None, max_length=120)
    icon_url: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

class AdminCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    slug: Optional[str] = Field(None, max_length=120)
    icon_url: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/master-catalog")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def get_admin_master_catalog(
    request: Request,
    current_user: AdminUser,
    db: DBSession,
    search: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """Admin endpoint to list, search, and filter all equipment master data."""
    from app.models.machine import EquipmentMasterCatalog

    offset = (page - 1) * per_page
    stmt = select(EquipmentMasterCatalog).order_by(
        EquipmentMasterCatalog.category_name,
        EquipmentMasterCatalog.make,
        EquipmentMasterCatalog.model,
    )

    if search:
        s = f"%{search}%"
        stmt = stmt.where(
            EquipmentMasterCatalog.category_name.ilike(s) |
            EquipmentMasterCatalog.make.ilike(s) |
            EquipmentMasterCatalog.model.ilike(s) |
            EquipmentMasterCatalog.capacity_specs.ilike(s)
        )
    if category and category != "all":
        stmt = stmt.where(EquipmentMasterCatalog.category_name.ilike(category))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(per_page))
    items = result.scalars().all()

    return {
        "results": [
            {
                "id": str(i.id),
                "category_name": i.category_name,
                "make": i.make,
                "model": i.model,
                "capacity_specs": i.capacity_specs,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in items
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if total > 0 else 0,
    }


@router.post("/master-catalog")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def create_master_catalog_item(
    request: Request,
    payload: MasterCatalogItemCreate,
    current_user: AdminUser,
    db: DBSession,
):
    """Add a new equipment make/model/capacity to the master catalog."""
    from app.models.machine import EquipmentMasterCatalog

    category_name = payload.category_name.strip().upper()
    make = payload.make.strip()
    model = payload.model.strip()
    capacity_specs = payload.capacity_specs.strip() if payload.capacity_specs else None

    if not category_name or not make or not model:
        raise HTTPException(status_code=400, detail="Category, Make, and Model are required.")

    # Check for duplicate
    existing = await db.execute(
        select(EquipmentMasterCatalog).where(
            EquipmentMasterCatalog.category_name.ilike(category_name),
            EquipmentMasterCatalog.make.ilike(make),
            EquipmentMasterCatalog.model.ilike(model),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Model '{model}' for make '{make}' already exists under '{category_name}'.")

    new_item = EquipmentMasterCatalog(
        category_name=category_name,
        make=make,
        model=model,
        capacity_specs=capacity_specs,
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    return {
        "id": str(new_item.id),
        "category_name": new_item.category_name,
        "make": new_item.make,
        "model": new_item.model,
        "capacity_specs": new_item.capacity_specs,
        "message": f"Successfully added {make} {model} to master catalog.",
    }


@router.put("/master-catalog/{item_id}")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def update_master_catalog_item(
    request: Request,
    item_id: str,
    payload: MasterCatalogItemUpdate,
    current_user: AdminUser,
    db: DBSession,
):
    """Edit an existing master catalog entry."""
    from app.models.machine import EquipmentMasterCatalog

    result = await db.execute(
        select(EquipmentMasterCatalog).where(EquipmentMasterCatalog.id == uuid.UUID(item_id))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Master catalog item not found.")

    if payload.category_name is not None:
        item.category_name = payload.category_name.strip().upper()
    if payload.make is not None:
        item.make = payload.make.strip()
    if payload.model is not None:
        item.model = payload.model.strip()
    if payload.capacity_specs is not None:
        item.capacity_specs = payload.capacity_specs.strip() if payload.capacity_specs else None

    await db.commit()
    await db.refresh(item)

    return {
        "id": str(item.id),
        "category_name": item.category_name,
        "make": item.make,
        "model": item.model,
        "capacity_specs": item.capacity_specs,
        "message": "Master catalog item updated successfully.",
    }


@router.delete("/master-catalog/{item_id}")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def delete_master_catalog_item(
    request: Request,
    item_id: str,
    current_user: AdminUser,
    db: DBSession,
):
    """Delete an entry from the equipment master catalog."""
    from app.models.machine import EquipmentMasterCatalog

    result = await db.execute(
        select(EquipmentMasterCatalog).where(EquipmentMasterCatalog.id == uuid.UUID(item_id))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Master catalog item not found.")

    await db.delete(item)
    await db.commit()
    return {"message": f"Deleted {item.make} {item.model} from master catalog."}


@router.post("/review-queue/{listing_id}/add-to-master")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def add_listing_to_master(
    request: Request,
    listing_id: str,
    payload: AddListingToMasterRequest,
    current_user: AdminUser,
    db: DBSession,
):
    """
    Admin action to add make/model from a reviewed listing directly into the master catalog.
    Supports adding Make only (with placeholder or base model), Model only, or Both.
    """
    from app.models.machine import EquipmentMasterCatalog

    # Fetch listing
    result = await db.execute(
        select(Machine)
        .options(selectinload(Machine.category))
        .where(Machine.id == uuid.UUID(listing_id))
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found.")

    category_name = (payload.category_name or (machine.category.name if machine.category else "GENERAL")).strip().upper()
    make = (payload.make or machine.make).strip()
    model = (payload.model or machine.model).strip()
    capacity_specs = (payload.capacity_specs or machine.capacity_specs or "").strip() or None

    # Check if already in master catalog
    existing = await db.execute(
        select(EquipmentMasterCatalog).where(
            EquipmentMasterCatalog.category_name.ilike(category_name),
            EquipmentMasterCatalog.make.ilike(make),
            EquipmentMasterCatalog.model.ilike(model),
        )
    )
    if existing.scalar_one_or_none():
        return {
            "already_exists": True,
            "message": f"'{make} - {model}' is already present in the master catalog.",
        }

    new_item = EquipmentMasterCatalog(
        category_name=category_name,
        make=make,
        model=model,
        capacity_specs=capacity_specs,
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    return {
        "success": True,
        "id": str(new_item.id),
        "category_name": new_item.category_name,
        "make": new_item.make,
        "model": new_item.model,
        "capacity_specs": new_item.capacity_specs,
        "message": f"Added '{make} - {model}' under '{category_name}' to the master catalog.",
    }


def parse_tabular_or_csv_rows(content: bytes, filename: str) -> List[Dict[str, Optional[str]]]:
    raw_rows = []
    lower_fn = filename.lower() if filename else ""
    if lower_fn.endswith(".xlsx") or lower_fn.endswith(".xls"):
        import openpyxl
        wb = openpyxl.load_workbook(filename=io.BytesIO(content), data_only=True)
        sheet = wb.active
        for row in sheet.iter_rows(values_only=True):
            if any(cell is not None and str(cell).strip() != "" for cell in row):
                raw_rows.append([str(cell).strip() if cell is not None else "" for cell in row])
    else:
        # CSV or text
        try:
            text_data = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text_data = content.decode("latin-1")
        
        sample = text_data[:2048]
        delimiter = "\t" if "\t" in sample and sample.count("\t") > sample.count(",") else ","
        reader = csv.reader(io.StringIO(text_data), delimiter=delimiter)
        for row in reader:
            if any(cell.strip() for cell in row):
                raw_rows.append([cell.strip() for cell in row])

    if not raw_rows:
        return []

    # Detect header row
    header_indices = {"category": -1, "make": -1, "model": -1, "capacity": -1}
    first_row = [str(c).lower().strip() for c in raw_rows[0]]
    for idx, col in enumerate(first_row):
        if any(k in col for k in ["category", "cat"]):
            header_indices["category"] = idx
        elif any(k in col for k in ["make", "brand", "manufacturer"]):
            header_indices["make"] = idx
        elif any(k in col for k in ["model", "model no", "model number"]):
            header_indices["model"] = idx
        elif any(k in col for k in ["spec", "capacity", "detail", "description"]):
            header_indices["capacity"] = idx

    has_header = (header_indices["category"] >= 0 or header_indices["make"] >= 0 or header_indices["model"] >= 0)
    data_rows = raw_rows[1:] if has_header else raw_rows

    cat_idx = header_indices["category"] if header_indices["category"] >= 0 else 0
    mk_idx = header_indices["make"] if header_indices["make"] >= 0 else 1
    md_idx = header_indices["model"] if header_indices["model"] >= 0 else 2
    cap_idx = header_indices["capacity"] if header_indices["capacity"] >= 0 else (3 if len(raw_rows[0]) > 3 else -1)

    parsed_items = []
    for r in data_rows:
        cat = r[cat_idx].strip() if len(r) > cat_idx else ""
        mk = r[mk_idx].strip() if len(r) > mk_idx else ""
        md = r[md_idx].strip() if len(r) > md_idx else ""
        cap = r[cap_idx].strip() if cap_idx >= 0 and len(r) > cap_idx else None
        
        # Skip repeated header if present
        if cat.lower() in ["category", "cat"] and mk.lower() in ["make", "brand"]:
            continue
            
        parsed_items.append({
            "category_name": cat,
            "make": mk,
            "model": md,
            "capacity_specs": cap or None,
        })
        
    return parsed_items


def analyze_master_catalog_items(raw_items: List[Dict[str, Any]], existing_db_set: set) -> Dict[str, Any]:
    new_items = []
    existing_items = []
    duplicate_in_file_items = []
    invalid_items = []
    seen_in_file = set()

    for item in raw_items:
        cat = (item.get("category_name") or "").strip().upper()
        mk = (item.get("make") or "").strip()
        md = (item.get("model") or "").strip()
        cap = (item.get("capacity_specs") or "").strip() or None

        if not cat or not mk or not md:
            invalid_items.append({
                "item": item,
                "reason": "Missing required Category, Make, or Model",
            })
            continue

        key = (cat.lower(), mk.lower(), md.lower())
        item_obj = {
            "category_name": cat,
            "make": mk,
            "model": md,
            "capacity_specs": cap,
        }

        if key in seen_in_file:
            duplicate_in_file_items.append(item_obj)
            continue
        seen_in_file.add(key)

        if key in existing_db_set:
            existing_items.append(item_obj)
        else:
            new_items.append(item_obj)

    return {
        "total_rows": len(raw_items),
        "new_count": len(new_items),
        "existing_count": len(existing_items),
        "duplicate_in_file_count": len(duplicate_in_file_items),
        "invalid_count": len(invalid_items),
        "new_items": new_items,
        "existing_items": existing_items,
        "duplicate_in_file_items": duplicate_in_file_items,
        "invalid_items": invalid_items,
    }


@router.post("/master-catalog/analyze")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def analyze_master_catalog_payload(
    request: Request,
    payload: BulkMasterCatalogAnalyzeRequest,
    current_user: AdminUser,
    db: DBSession,
):
    """Pre-upload analysis of master catalog items to detect new vs existing/duplicate machines."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items provided for analysis.")

    existing_rows = await db.execute(
        select(
            func.lower(EquipmentMasterCatalog.category_name),
            func.lower(EquipmentMasterCatalog.make),
            func.lower(EquipmentMasterCatalog.model),
        )
    )
    existing_db_set = set(existing_rows.all())

    items_dicts = [item.model_dump() for item in payload.items]
    return analyze_master_catalog_items(items_dicts, existing_db_set)


@router.post("/master-catalog/upload-file")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def analyze_master_catalog_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: AdminUser = None,
    db: DBSession = None,
):
    """Parse and analyze uploaded Excel/CSV file to preview new vs existing machines before confirmation."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    allowed_exts = (".xlsx", ".xls", ".csv", ".tsv", ".txt")
    if not any(file.filename.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv, .txt) file.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

    try:
        parsed_items = parse_tabular_or_csv_rows(content, file.filename)
    except Exception as e:
        logger.error(f"Error parsing master catalog file: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse file: {str(e)}. Please check format.",
        )

    if not parsed_items:
        raise HTTPException(
            status_code=400,
            detail="No valid machine rows could be extracted. Required columns: Category, Make, Model.",
        )

    existing_rows = await db.execute(
        select(
            func.lower(EquipmentMasterCatalog.category_name),
            func.lower(EquipmentMasterCatalog.make),
            func.lower(EquipmentMasterCatalog.model),
        )
    )
    existing_db_set = set(existing_rows.all())

    analysis = analyze_master_catalog_items(parsed_items, existing_db_set)
    analysis["filename"] = file.filename
    return analysis


@router.post("/master-catalog/bulk")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def bulk_create_master_catalog_items(
    request: Request,
    payload: BulkMasterCatalogItemCreate,
    current_user: AdminUser,
    db: DBSession,
):
    """Bulk import equipment makes and models into the master catalog, ignoring existing machines."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items provided in bulk payload.")

    if len(payload.items) > 5000:
        raise HTTPException(status_code=400, detail="Maximum 5,000 items per bulk upload.")

    # Fetch existing items from DB in one fast set query
    existing_rows = await db.execute(
        select(
            func.lower(EquipmentMasterCatalog.category_name),
            func.lower(EquipmentMasterCatalog.make),
            func.lower(EquipmentMasterCatalog.model),
        )
    )
    existing_db_set = set(existing_rows.all())

    added_count = 0
    skipped_count = 0
    added_items = []
    skipped_items = []
    seen_keys = set()

    for item_data in payload.items:
        cat = item_data.category_name.strip().upper()
        mk = item_data.make.strip()
        md = item_data.model.strip()
        cap = item_data.capacity_specs.strip() if item_data.capacity_specs else None

        if not cat or not mk or not md:
            skipped_count += 1
            skipped_items.append({
                "category_name": cat,
                "make": mk,
                "model": md,
                "reason": "Missing Category, Make, or Model",
            })
            continue

        unique_key = (cat.lower(), mk.lower(), md.lower())
        if unique_key in seen_keys:
            skipped_count += 1
            skipped_items.append({
                "category_name": cat,
                "make": mk,
                "model": md,
                "reason": "Duplicate within uploaded list",
            })
            continue
        seen_keys.add(unique_key)

        if unique_key in existing_db_set:
            skipped_count += 1
            skipped_items.append({
                "category_name": cat,
                "make": mk,
                "model": md,
                "reason": "Already exists in master catalog",
            })
            continue

        new_entry = EquipmentMasterCatalog(
            category_name=cat,
            make=mk,
            model=md,
            capacity_specs=cap,
        )
        db.add(new_entry)
        added_count += 1
        added_items.append({
            "category_name": cat,
            "make": mk,
            "model": md,
            "capacity_specs": cap,
        })
        existing_db_set.add(unique_key)

    if added_count > 0:
        await db.commit()

    return {
        "added": added_count,
        "skipped": skipped_count,
        "total_processed": len(payload.items),
        "added_items": added_items,
        "skipped_items": skipped_items,
        "message": f"Successfully added {added_count} new machines. {skipped_count} existing/duplicate machines were ignored.",
    }


# ── Category Master Data Admin APIs ──────────────────────────────

@router.get("/categories")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def get_admin_categories(
    request: Request,
    current_user: AdminUser,
    db: DBSession,
):
    """List all categories with live listing counts for admin management."""
    result = await db.execute(
        select(
            Category,
            func.count(Machine.id).label("total_listings"),
            func.count(func.nullif(Machine.status != MachineStatus.approved, True)).label("approved_listings"),
        )
        .outerjoin(Machine, Machine.category_id == Category.id)
        .options(selectinload(Category.sub_categories))
        .group_by(Category.id)
        .order_by(Category.sort_order, Category.name)
    )
    rows = result.all()

    return [
        {
            "id": str(row.Category.id),
            "name": row.Category.name,
            "slug": row.Category.slug,
            "icon_url": row.Category.icon_url,
            "description": row.Category.description,
            "sort_order": row.Category.sort_order,
            "is_active": row.Category.is_active,
            "total_listings": row.total_listings,
            "approved_listings": row.approved_listings,
            "sub_categories": [
                {
                    "id": str(sc.id),
                    "name": sc.name,
                    "slug": sc.slug,
                }
                for sc in (row.Category.sub_categories or [])
            ],
        }
        for row in rows
    ]


@router.post("/categories")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def create_admin_category(
    request: Request,
    payload: AdminCategoryCreate,
    current_user: AdminUser,
    db: DBSession,
):
    """Create a new platform category."""
    name = payload.name.strip()
    slug = payload.slug.strip().lower() if payload.slug else re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

    # Check for name/slug collisions
    existing = await db.execute(
        select(Category).where(
            (Category.name.ilike(name)) | (Category.slug == slug)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"A category with name '{name}' or slug '{slug}' already exists.")

    new_cat = Category(
        name=name,
        slug=slug,
        icon_url=payload.icon_url.strip() if payload.icon_url else None,
        description=payload.description.strip() if payload.description else None,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)

    return {
        "id": str(new_cat.id),
        "name": new_cat.name,
        "slug": new_cat.slug,
        "icon_url": new_cat.icon_url,
        "description": new_cat.description,
        "sort_order": new_cat.sort_order,
        "is_active": new_cat.is_active,
        "message": f"Category '{new_cat.name}' created successfully.",
    }


@router.put("/categories/{category_id}")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def update_admin_category(
    request: Request,
    category_id: str,
    payload: AdminCategoryUpdate,
    current_user: AdminUser,
    db: DBSession,
):
    """Update details of an existing category."""
    result = await db.execute(select(Category).where(Category.id == uuid.UUID(category_id)))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    if payload.name is not None:
        new_name = payload.name.strip()
        # Check duplicate name if changed
        if new_name.lower() != cat.name.lower():
            dup = await db.execute(select(Category).where(Category.name.ilike(new_name), Category.id != cat.id))
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=409, detail=f"Category '{new_name}' already exists.")
        cat.name = new_name

    if payload.slug is not None:
        new_slug = payload.slug.strip().lower()
        if new_slug != cat.slug:
            dup = await db.execute(select(Category).where(Category.slug == new_slug, Category.id != cat.id))
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=409, detail=f"Category slug '{new_slug}' already exists.")
        cat.slug = new_slug

    if payload.icon_url is not None:
        cat.icon_url = payload.icon_url.strip() if payload.icon_url else None
    if payload.description is not None:
        cat.description = payload.description.strip() if payload.description else None
    if payload.sort_order is not None:
        cat.sort_order = payload.sort_order
    if payload.is_active is not None:
        cat.is_active = payload.is_active

    await db.commit()
    await db.refresh(cat)

    return {
        "id": str(cat.id),
        "name": cat.name,
        "slug": cat.slug,
        "icon_url": cat.icon_url,
        "description": cat.description,
        "sort_order": cat.sort_order,
        "is_active": cat.is_active,
        "message": "Category updated successfully.",
    }


@router.patch("/categories/{category_id}/toggle-status")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def toggle_admin_category_status(
    request: Request,
    category_id: str,
    current_user: AdminUser,
    db: DBSession,
):
    """Toggle active/inactive status of a category."""
    result = await db.execute(select(Category).where(Category.id == uuid.UUID(category_id)))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    cat.is_active = not cat.is_active
    await db.commit()
    await db.refresh(cat)

    status_str = "activated" if cat.is_active else "deactivated"
    return {
        "id": str(cat.id),
        "name": cat.name,
        "is_active": cat.is_active,
        "message": f"Category '{cat.name}' has been {status_str}.",
    }


@router.delete("/categories/{category_id}")
@limiter.limit(settings.RATE_LIMIT_ADMIN, key_func=get_authenticated_user_key)
async def delete_admin_category(
    request: Request,
    category_id: str,
    current_user: AdminUser,
    db: DBSession,
):
    """Delete a category if no machines are currently attached."""
    result = await db.execute(select(Category).where(Category.id == uuid.UUID(category_id)))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    # Check for linked machines
    machine_count = (await db.execute(
        select(func.count(Machine.id)).where(Machine.category_id == cat.id)
    )).scalar() or 0

    if machine_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{cat.name}' because {machine_count} machine listing(s) are attached to it. Please deactivate the category or reassign listings first.",
        )

    await db.delete(cat)
    await db.commit()

    return {"message": f"Category '{cat.name}' has been deleted."}

