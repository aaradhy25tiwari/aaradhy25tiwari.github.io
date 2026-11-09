"""
Vendor Dashboard Router — Full CRUD for vendor's own listings,
analytics, enquiry inbox, and profile management.
"""
import uuid
import re
import math
from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Query, Request
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload

from app.deps import VendorUser, DBSession
from app.models.machine import Machine, MachineStatus, MachineImage, Category
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.subscription import Subscription
from app.schemas.machine import (
    MachineCreateRequest, MachineUpdateRequest,
    MachineDetailResponse, MachineListItemResponse, PaginatedMachineResponse,
)
from app.services.storage_service import upload_machine_image, delete_storage_file
from app.services.email_service import send_listing_created_email
from app.core.rate_limiter import limiter, get_authenticated_user_key
from app.config import settings

router = APIRouter()


# ── GET /vendor/listings ───────────────────────────────────────
@router.get("/listings", response_model=PaginatedMachineResponse)
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def get_vendor_listings(
    request: Request,
    current_user: VendorUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    status_filter: Optional[str] = None,
):
    """Return all listings for the authenticated vendor."""
    offset = (page - 1) * per_page
    stmt = (
        select(Machine)
        .options(selectinload(Machine.images), joinedload(Machine.category))
        .where(Machine.vendor_id == current_user.id)
        .order_by(Machine.created_at.desc())
    )
    if status_filter:
        if status_filter in ["inactive", "paused"]:
            stmt = stmt.where(
                (Machine.status == MachineStatus.paused)
                | (Machine.availability == False)
                | ((Machine.expires_at.is_not(None)) & (Machine.expires_at < func.now()))
            )
        elif status_filter == "expired":
            stmt = stmt.where(
                (Machine.expires_at.is_not(None)) & (Machine.expires_at < func.now())
            )
        else:
            try:
                stmt = stmt.where(Machine.status == MachineStatus(status_filter))
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
        items.append(MachineListItemResponse(
            id=str(m.id), slug=m.slug, title=m.title,
            make=m.make, model=m.model,
            year_of_manufacture=m.year_of_manufacture,
            condition=m.condition.value if hasattr(m.condition, "value") else m.condition,
            running_condition=m.running_condition.value if hasattr(m.running_condition, "value") else m.running_condition,
            hmr=m.hmr,
            ownership_type=m.ownership_type.value if hasattr(m.ownership_type, "value") else m.ownership_type,
            listing_type=m.listing_type.value if hasattr(m.listing_type, "value") else m.listing_type,
            status=m.status.value if hasattr(m.status, "value") else m.status,
            availability=m.availability,
            expires_at=m.expires_at,
            is_expired=m.is_expired,
            is_active=m.is_active,
            created_at=m.created_at,
            city=m.city, state=m.state,
            rental_price_hourly=float(m.rental_price_hourly) if m.rental_price_hourly else None,
            rental_price_daily=float(m.rental_price_daily) if m.rental_price_daily else None,
            rental_price_weekly=float(m.rental_price_weekly) if m.rental_price_weekly else None,
            rental_price_monthly=float(m.rental_price_monthly) if m.rental_price_monthly else None,
            purchase_price=float(m.purchase_price) if m.purchase_price else None,
            contact_for_price=m.contact_for_price,
            is_negotiable=getattr(m, "is_negotiable", False) or False,
            views_count=m.views_count, enquiries_count=m.enquiries_count,
            primary_image={
                "id": str(primary_img.id), "storage_path": primary_img.storage_path,
                "display_url": primary_img.display_url, "alt_text": primary_img.alt_text,
                "sort_order": primary_img.sort_order, "is_primary": primary_img.is_primary,
            } if primary_img else None,
            vendor_name="",
        ))

    return PaginatedMachineResponse(
        results=items, total=total, page=page,
        per_page=per_page, total_pages=math.ceil(total / per_page) if total else 0,
    )


# ── POST /vendor/listings ──────────────────────────────────────
@router.post("/listings", response_model=MachineDetailResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def create_listing(
    request: Request,
    payload: MachineCreateRequest,
    current_user: VendorUser,
    db: DBSession,
    background_tasks: BackgroundTasks,
):
    """Create a new machine listing (status: pending for admin review)."""
    # Check subscription limit
    sub_result = await db.execute(
        select(Subscription)
        .options(joinedload(Subscription.plan))
        .where(Subscription.user_id == current_user.id, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
        .with_for_update(of=Subscription)
    )
    sub = sub_result.scalar_one_or_none()

    if sub and sub.plan:
        limit = sub.plan.active_listing_limit
        if limit is not None:
            count_result = await db.execute(
                select(func.count(Machine.id))
                .where(Machine.vendor_id == current_user.id, Machine.status != MachineStatus.deleted)
            )
            active_count = count_result.scalar() or 0
            if active_count >= limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Your plan allows {limit} active listings. Upgrade to add more.",
                )

    # Generate unique slug
    base_slug = re.sub(r"[^\w\s-]", "", f"{payload.make}-{payload.model}-{payload.year_of_manufacture}".lower())
    base_slug = re.sub(r"[\s_-]+", "-", base_slug).strip("-")[:60]
    slug = base_slug
    counter = 1
    while (await db.execute(select(Machine.id).where(Machine.slug == slug))).scalar_one_or_none():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Validate and normalize serial plate photo path for non-registrable equipment
    serial_plate_path = None
    if not payload.is_rto_registered:
        if not payload.serial_plate_photo_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Serial plate photo is required for non-registrable equipment.",
            )
        expected_prefix = f"admin_verification/{current_user.id}/"
        raw_val = payload.serial_plate_photo_url.strip()
        if expected_prefix in raw_val:
            serial_plate_path = raw_val[raw_val.index(expected_prefix):].split("?")[0]
        elif raw_val.startswith(expected_prefix):
            serial_plate_path = raw_val.split("?")[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid serial plate photo path. Must be under admin_verification/{current_user.id}/",
            )

    machine = Machine(
        id=uuid.uuid4(),
        vendor_id=current_user.id,
        slug=slug,
        status=MachineStatus.pending,
        title=payload.title,
        make=payload.make,
        model=payload.model,
        year_of_manufacture=payload.year_of_manufacture,
        condition=payload.condition,
        running_condition=payload.running_condition,
        hmr=payload.hmr,
        ownership_type=payload.ownership_type,
        capacity_specs=payload.capacity_specs,
        specifications=payload.specifications,
        description=payload.description,
        listing_type=payload.listing_type,
        min_rental_duration=payload.min_rental_duration,
        rental_price_hourly=payload.rental_price_hourly,
        rental_price_daily=payload.rental_price_daily,
        rental_price_weekly=payload.rental_price_weekly,
        rental_price_monthly=payload.rental_price_monthly,
        purchase_price=payload.purchase_price,
        contact_for_price=payload.contact_for_price,
        is_negotiable=payload.is_negotiable,
        city=payload.city,
        state=payload.state,
        address_line=payload.address_line,
        latitude=payload.latitude,
        longitude=payload.longitude,
        category_id=payload.category_id,
        sub_category_id=payload.sub_category_id,
        is_rto_registered=payload.is_rto_registered,
        registration_number=payload.registration_number,
        chassis_number=payload.chassis_number,
        machine_serial_no=payload.machine_serial_no,
        serial_plate_photo_url=serial_plate_path,
        rental_term_sheet=payload.rental_term_sheet.model_dump() if payload.rental_term_sheet else None,
        sale_term_sheet=payload.sale_term_sheet.model_dump() if payload.sale_term_sheet else None,
        has_custom_terms=bool(
            (payload.rental_term_sheet and payload.rental_term_sheet.special_terms and payload.rental_term_sheet.special_terms.strip())
            or (payload.sale_term_sheet and payload.sale_term_sheet.special_terms and payload.sale_term_sheet.special_terms.strip())
        ),
    )
    db.add(machine)
    await db.commit()
    await db.refresh(machine)

    # Trigger email to vendor in background
    base_origin = settings.ALLOWED_ORIGINS.split(",")[0].strip() if settings.ALLOWED_ORIGINS else "http://localhost:3000"
    dashboard_url = f"{base_origin}/dashboard/vendor/listings"
    background_tasks.add_task(
        send_listing_created_email,
        current_user.email,
        current_user.full_name or "Vendor",
        machine.title,
        dashboard_url,
    )

    # Fetch with relationships
    result = await db.execute(
        select(Machine)
        .options(
            selectinload(Machine.images),
            joinedload(Machine.category),
            joinedload(Machine.vendor),
        )
        .where(Machine.id == machine.id)
    )
    return result.scalar_one()


# ── POST /vendor/upload-serial-plate ──────────────────────────
@router.post("/upload-serial-plate")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def upload_serial_plate(
    request: Request,
    current_user: VendorUser,
    file: UploadFile = File(...),
):
    """Upload serial plate / VIN plate photo for age verification (admin view only)."""
    from app.services.storage_service import upload_serial_plate_photo
    path, url = await upload_serial_plate_photo(file, str(current_user.id))
    return {"storage_path": path, "url": url}


# ── GET /vendor/listings-previous-terms ───────────────────────
@router.get("/listings-previous-terms")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def get_previous_terms(
    request: Request,
    current_user: VendorUser,
    db: DBSession,
):
    """Return previous listings with configured term sheets so vendor can copy them with 1 click."""
    stmt = (
        select(Machine.id, Machine.title, Machine.listing_type, Machine.rental_term_sheet, Machine.sale_term_sheet)
        .where(
            Machine.vendor_id == current_user.id,
            (Machine.rental_term_sheet.is_not(None) | Machine.sale_term_sheet.is_not(None)),
        )
        .order_by(Machine.created_at.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "id": str(r.id),
            "title": r.title,
            "listing_type": r.listing_type.value if hasattr(r.listing_type, "value") else str(r.listing_type),
            "rental_term_sheet": r.rental_term_sheet,
            "sale_term_sheet": r.sale_term_sheet,
        }
        for r in rows
    ]


# ── GET /vendor/listings/{listing_id} ─────────────────────────
@router.get("/listings/{listing_id}", response_model=MachineDetailResponse)
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def get_vendor_listing(
    request: Request,
    listing_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Get a single listing owned by the authenticated vendor (for editing)."""
    result = await db.execute(
        select(Machine)
        .options(
            selectinload(Machine.images),
            joinedload(Machine.category),
        )
        .where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found or access denied")
    return machine


# ── PUT /vendor/listings/{listing_id} ─────────────────────────
@router.put("/listings/{listing_id}")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def update_listing(
    request: Request,
    listing_id: str,
    payload: MachineUpdateRequest,
    current_user: VendorUser,
    db: DBSession,
):
    """Update a vendor's own listing. If approved, re-submits for review."""
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "serial_plate_photo_url" in update_data and update_data["serial_plate_photo_url"]:
        expected_prefix = f"admin_verification/{current_user.id}/"
        raw_val = update_data["serial_plate_photo_url"].strip()
        if expected_prefix in raw_val:
            update_data["serial_plate_photo_url"] = raw_val[raw_val.index(expected_prefix):].split("?")[0]
        elif raw_val.startswith(expected_prefix):
            update_data["serial_plate_photo_url"] = raw_val.split("?")[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid serial plate photo path. Must be under admin_verification/{current_user.id}/",
            )

    # Run merged identification checks only when the request includes an identification field
    ident_fields = {"is_rto_registered", "registration_number", "machine_serial_no", "serial_plate_photo_url"}
    if any(f in update_data for f in ident_fields):
        merged_is_rto = update_data.get("is_rto_registered", machine.is_rto_registered)
        merged_reg_no = update_data.get("registration_number", machine.registration_number)
        merged_sr_no = update_data.get("machine_serial_no", machine.machine_serial_no)
        merged_plate = update_data.get("serial_plate_photo_url", machine.serial_plate_photo_url)

        if merged_is_rto:
            if not merged_reg_no or not str(merged_reg_no).strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Registration number is required when equipment is RTO registered",
                )
        else:
            if not merged_sr_no or not str(merged_sr_no).strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Machine serial number is required for non-registrable equipment",
                )
            if not merged_plate or not str(merged_plate).strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Serial plate photo is required for machine age validation of non-registrable equipment",
                )

    # Remove client-supplied has_custom_terms so clients cannot override server-derived flagging
    update_data.pop("has_custom_terms", None)

    # Recompute has_custom_terms from the merged rental and sale term sheets even when omitted from request
    r_terms = update_data.get("rental_term_sheet", machine.rental_term_sheet)
    s_terms = update_data.get("sale_term_sheet", machine.sale_term_sheet)
    r_special = (r_terms.get("special_terms") if isinstance(r_terms, dict) else getattr(r_terms, "special_terms", None)) if r_terms else None
    s_special = (s_terms.get("special_terms") if isinstance(s_terms, dict) else getattr(s_terms, "special_terms", None)) if s_terms else None
    update_data["has_custom_terms"] = bool((r_special and r_special.strip()) or (s_special and s_special.strip()))

    for field, value in update_data.items():
        setattr(machine, field, value)

    # Re-submit for review if was approved (content changed)
    if machine.status == MachineStatus.approved:
        machine.status = MachineStatus.pending

    await db.commit()
    await db.refresh(machine)
    return {"message": "Listing updated and submitted for review."}


# ── PATCH /vendor/listings/{listing_id}/toggle ─────────────────
@router.patch("/listings/{listing_id}/toggle")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def toggle_listing_availability(
    request: Request,
    listing_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Toggle listing between paused/inactive and approved status with availability."""
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    validity_days = getattr(settings, "LISTING_VALIDITY_DAYS", 30)

    # Check if currently fully active
    is_currently_active = (
        machine.status == MachineStatus.approved
        and bool(machine.availability)
        and not machine.is_expired
    )

    if is_currently_active:
        # Pause / make inactive
        machine.status = MachineStatus.paused
        machine.availability = False
    elif machine.status in [MachineStatus.paused, MachineStatus.approved]:
        # Reactivate
        machine.status = MachineStatus.approved
        machine.availability = True
        if machine.is_expired or not machine.expires_at:
            machine.expires_at = now + timedelta(days=validity_days)
    else:
        raise HTTPException(status_code=400, detail="Can only toggle approved/paused listings.")

    await db.commit()
    await db.refresh(machine)
    return {
        "status": machine.status.value if hasattr(machine.status, "value") else str(machine.status),
        "availability": machine.availability,
        "expires_at": machine.expires_at.isoformat() if machine.expires_at else None,
        "is_expired": machine.is_expired,
        "is_active": machine.is_active,
    }


# ── POST /vendor/listings/{listing_id}/reactivate ──────────────
@router.post("/listings/{listing_id}/reactivate")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def reactivate_vendor_listing(
    request: Request,
    listing_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Explicitly reactivate an inactive, paused, unavailable, or expired listing."""
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found or access denied")

    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    validity_days = getattr(settings, "LISTING_VALIDITY_DAYS", 30)

    # Reactivate listing
    machine.availability = True
    machine.expires_at = now + timedelta(days=validity_days)

    if machine.status in [MachineStatus.paused, MachineStatus.approved]:
        machine.status = MachineStatus.approved
    elif machine.status == MachineStatus.rejected:
        # Re-submit for review
        machine.status = MachineStatus.pending
        machine.rejection_reason = None

    await db.commit()
    await db.refresh(machine)

    return {
        "message": f"Listing '{machine.title}' has been successfully reactivated.",
        "status": machine.status.value if hasattr(machine.status, "value") else str(machine.status),
        "availability": machine.availability,
        "expires_at": machine.expires_at.isoformat() if machine.expires_at else None,
        "is_expired": False,
        "is_active": machine.is_active,
    }


# ── POST /vendor/listings/{listing_id}/images ──────────────────
@router.post("/listings/{listing_id}/images", status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def upload_listing_image(
    request: Request,
    listing_id: str,
    current_user: VendorUser,
    db: DBSession,
    file: UploadFile = File(...),
):
    """Upload an image for a listing. Stores in Supabase Storage."""
    # Verify ownership
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Check image count limit
    count_result = await db.execute(
        select(func.count(MachineImage.id)).where(MachineImage.machine_id == machine.id)
    )
    existing_count = count_result.scalar() or 0
    if existing_count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images per listing")

    # Validate content type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, WebP images are allowed")

    # Upload to Supabase Storage
    storage_path, display_url = await upload_machine_image(
        file=file,
        vendor_id=str(current_user.id),
        machine_id=str(machine.id),
    )

    # Determine sort order and whether this is the primary
    is_primary = existing_count == 0

    img = MachineImage(
        id=uuid.uuid4(),
        machine_id=machine.id,
        storage_path=storage_path,
        display_url=display_url,
        alt_text=machine.title,
        sort_order=existing_count,
        is_primary=is_primary,
        file_size_bytes=file.size,
    )
    db.add(img)
    await db.commit()
    await db.refresh(img)

    return {
        "id": str(img.id),
        "display_url": img.display_url,
        "alt_text": img.alt_text,
        "sort_order": img.sort_order,
        "is_primary": img.is_primary,
        "file_size_bytes": img.file_size_bytes,
    }


# ── PATCH /vendor/listings/{listing_id}/images/{image_id}/primary
@router.patch("/listings/{listing_id}/images/{image_id}/primary")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def set_primary_image(
    request: Request,
    listing_id: str,
    image_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Set an image as the primary cover image for a listing."""
    # Verify ownership
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Clear existing primary
    all_images = await db.execute(
        select(MachineImage).where(MachineImage.machine_id == machine.id)
    )
    for img in all_images.scalars():
        img.is_primary = img.id == uuid.UUID(image_id)

    await db.commit()
    return {"message": "Primary image updated"}


# ── DELETE /vendor/listings/{listing_id}/images/{image_id} ─────
@router.delete("/listings/{listing_id}/images/{image_id}", status_code=204)
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def delete_listing_image(
    request: Request,
    listing_id: str,
    image_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Delete an image from a listing."""
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    img_result = await db.execute(
        select(MachineImage).where(
            MachineImage.id == uuid.UUID(image_id),
            MachineImage.machine_id == machine.id,
        )
    )
    img = img_result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete from storage
    delete_storage_file(img.storage_path)
    await db.delete(img)

    # If deleted was primary, promote first remaining image
    remaining = await db.execute(
        select(MachineImage)
        .where(MachineImage.machine_id == machine.id)
        .order_by(MachineImage.sort_order)
    )
    remaining_imgs = remaining.scalars().all()
    if remaining_imgs and not any(i.is_primary for i in remaining_imgs):
        remaining_imgs[0].is_primary = True

    await db.commit()


# ── DELETE /vendor/listings/{listing_id} ───────────────────────
@router.delete("/listings/{listing_id}", status_code=204)
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def delete_listing(
    request: Request,
    listing_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Soft-delete a listing."""
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")
    machine.status = MachineStatus.deleted
    await db.commit()



# ── GET /vendor/enquiries ──────────────────────────────────────
@router.get("/enquiries")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def get_vendor_enquiries(
    request: Request,
    current_user: VendorUser,
    db: DBSession,
    status_filter: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """Return all enquiries received for vendor's listings."""
    offset = (page - 1) * per_page
    stmt = (
        select(Enquiry)
        .options(joinedload(Enquiry.machine), joinedload(Enquiry.customer))
        .where(Enquiry.vendor_id == current_user.id)
        .order_by(Enquiry.created_at.desc())
    )
    if is_read is not None:
        stmt = stmt.where(Enquiry.is_read_by_vendor == is_read)

    if status_filter:
        if status_filter == "unread":
            stmt = stmt.where(Enquiry.is_read_by_vendor == False)
        elif status_filter == "read":
            stmt = stmt.where(Enquiry.is_read_by_vendor == True)
        else:
            try:
                stmt = stmt.where(Enquiry.status == EnquiryStatus(status_filter))
            except ValueError:
                pass

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(per_page))
    enquiries = result.scalars().all()

    return {
        "results": [
            {
                "id": str(e.id),
                "requirement_type": e.requirement_type.value if hasattr(e.requirement_type, "value") else e.requirement_type,
                "status": e.status.value if hasattr(e.status, "value") else e.status,
                "is_read": e.is_read_by_vendor,
                "customer_name": e.customer.full_name if e.customer else "",
                "machine_title": e.machine.title if e.machine else "General Enquiry",
                "created_at": e.created_at.isoformat(),
            }
            for e in enquiries
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if total > 0 else 0,
    }


# ── GET /vendor/stats ──────────────────────────────────────────
@router.get("/stats")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def get_vendor_stats(request: Request, current_user: VendorUser, db: DBSession):
    """Aggregated stats for vendor dashboard."""
    try:
        m_sub = (
            select(
                func.count(Machine.id).label("total_listings"),
                func.count(Machine.id).filter(Machine.status == MachineStatus.approved).label("approved_listings"),
                func.count(Machine.id).filter(Machine.status == MachineStatus.pending).label("pending_listings"),
                func.count(Machine.id).filter(Machine.status == MachineStatus.paused).label("paused_listings"),
                func.coalesce(func.sum(Machine.views_count), 0).label("total_views"),
            )
            .where(Machine.vendor_id == current_user.id)
            .subquery()
        )

        e_sub = (
            select(
                func.count(Enquiry.id).label("total_enquiries"),
                func.count(Enquiry.id).filter(Enquiry.is_read_by_vendor == False).label("unread_enquiries"),
            )
            .where(Enquiry.vendor_id == current_user.id)
            .subquery()
        )

        row = (await db.execute(select(m_sub, e_sub))).one()

        return {
            "total_listings": row.total_listings or 0,
            "approved_listings": row.approved_listings or 0,
            "pending_listings": row.pending_listings or 0,
            "paused_listings": row.paused_listings or 0,
            "total_views": row.total_views or 0,
            "total_enquiries": row.total_enquiries or 0,
            "unread_enquiries": row.unread_enquiries or 0,
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to calculate vendor stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve vendor statistics. Please try again later.",
        )


# ── GET /vendor/enquiries/{id} ─────────────────────────────────
@router.get("/enquiries/{enquiry_id}")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def get_vendor_enquiry_thread(
    request: Request,
    enquiry_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Get full details and message thread for a specific enquiry."""
    result = await db.execute(
        select(Enquiry)
        .options(
            joinedload(Enquiry.machine),
            joinedload(Enquiry.customer),
            selectinload(Enquiry.messages).joinedload("sender")
        )
        .where(
            Enquiry.id == uuid.UUID(enquiry_id),
            Enquiry.vendor_id == current_user.id
        )
    )
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    # Mark as read
    if not enquiry.is_read_by_vendor:
        enquiry.is_read_by_vendor = True
        await db.commit()

    return {
        "id": str(enquiry.id),
        "requirement_type": enquiry.requirement_type.value if hasattr(enquiry.requirement_type, "value") else enquiry.requirement_type,
        "status": enquiry.status.value if hasattr(enquiry.status, "value") else enquiry.status,
        "customer_name": enquiry.customer.full_name if enquiry.customer else "Unknown",
        "customer_company": enquiry.customer_company,
        "machine_title": enquiry.machine.title if enquiry.machine else None,
        "machine_slug": enquiry.machine.slug if enquiry.machine else None,
        "required_from": enquiry.required_from,
        "required_duration_days": enquiry.required_duration_days,
        "location_of_use": enquiry.location_of_use,
        "message": enquiry.message,
        "created_at": enquiry.created_at.isoformat(),
        "messages": [
            {
                "id": str(msg.id),
                "sender_id": str(msg.sender_id),
                "message_text": msg.message_text,
                "created_at": msg.created_at.isoformat(),
                "is_read": msg.is_read,
            }
            for msg in enquiry.messages
        ]
    }


# ── POST /vendor/enquiries/{id}/reply ─────────────────────────
from app.schemas.enquiry import MessageCreateRequest
from app.models.enquiry import EnquiryMessage

@router.post("/enquiries/{enquiry_id}/reply")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def reply_to_enquiry(
    request: Request,
    enquiry_id: str,
    payload: MessageCreateRequest,
    current_user: VendorUser,
    db: DBSession,
):
    """Send a reply to an enquiry thread."""
    result = await db.execute(
        select(Enquiry).where(
            Enquiry.id == uuid.UUID(enquiry_id),
            Enquiry.vendor_id == current_user.id
        )
    )
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    message = EnquiryMessage(
        id=uuid.uuid4(),
        enquiry_id=enquiry.id,
        sender_id=current_user.id,
        message_text=payload.message_text,
    )
    
    # Update enquiry status if pending
    if enquiry.status == EnquiryStatus.pending:
        enquiry.status = EnquiryStatus.replied
        
    db.add(message)
    await db.commit()
    
    return {"message": "Reply sent successfully", "status": enquiry.status.value if hasattr(enquiry.status, "value") else enquiry.status}
