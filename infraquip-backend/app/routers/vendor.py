"""
Vendor Dashboard Router — Full CRUD for vendor's own listings,
analytics, enquiry inbox, and profile management.
"""
import uuid
import re
import math
from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.deps import VendorUser, DBSession
from app.models.machine import Machine, MachineStatus, MachineImage, Category
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.subscription import Subscription
from app.schemas.machine import (
    MachineCreateRequest, MachineUpdateRequest,
    MachineDetailResponse, MachineListItemResponse, PaginatedMachineResponse,
)
from app.services.storage_service import upload_machine_image, delete_storage_file

router = APIRouter()


# ── GET /vendor/listings ───────────────────────────────────────
@router.get("/listings", response_model=PaginatedMachineResponse)
async def get_vendor_listings(
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
        .options(selectinload(Machine.images), selectinload(Machine.category))
        .where(Machine.vendor_id == current_user.id)
        .order_by(Machine.created_at.desc())
    )
    if status_filter:
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
            availability=m.availability, city=m.city, state=m.state,
            rental_price_daily=float(m.rental_price_daily) if m.rental_price_daily else None,
            purchase_price=float(m.purchase_price) if m.purchase_price else None,
            contact_for_price=m.contact_for_price,
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
async def create_listing(
    payload: MachineCreateRequest,
    current_user: VendorUser,
    db: DBSession,
):
    """Create a new machine listing (status: pending for admin review)."""
    # Check subscription limit
    sub_result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
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
        rental_price_daily=payload.rental_price_daily,
        rental_price_weekly=payload.rental_price_weekly,
        rental_price_monthly=payload.rental_price_monthly,
        purchase_price=payload.purchase_price,
        contact_for_price=payload.contact_for_price,
        city=payload.city,
        state=payload.state,
        address_line=payload.address_line,
        latitude=payload.latitude,
        longitude=payload.longitude,
        category_id=uuid.UUID(payload.category_id) if payload.category_id else None,
        sub_category_id=uuid.UUID(payload.sub_category_id) if payload.sub_category_id else None,
    )
    db.add(machine)
    await db.commit()
    await db.refresh(machine)

    # Fetch with relationships
    result = await db.execute(
        select(Machine)
        .options(selectinload(Machine.images), selectinload(Machine.category))
        .where(Machine.id == machine.id)
    )
    return result.scalar_one()


# ── GET /vendor/listings/{listing_id} ─────────────────────────
@router.get("/listings/{listing_id}", response_model=MachineDetailResponse)
async def get_vendor_listing(
    listing_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Get a single listing owned by the authenticated vendor (for editing)."""
    result = await db.execute(
        select(Machine)
        .options(
            selectinload(Machine.images),
            selectinload(Machine.category),
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
async def update_listing(
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

    update_data = payload.model_dump(exclude_none=True)
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
async def toggle_listing_availability(
    listing_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Toggle listing between paused and approved status."""
    result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    if machine.status == MachineStatus.approved:
        machine.status = MachineStatus.paused
    elif machine.status == MachineStatus.paused:
        machine.status = MachineStatus.approved
    else:
        raise HTTPException(status_code=400, detail="Can only toggle approved/paused listings.")

    await db.commit()
    return {"status": machine.status.value if hasattr(machine.status, "value") else machine.status}


# ── POST /vendor/listings/{listing_id}/images ──────────────────
@router.post("/listings/{listing_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_listing_image(
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
    if (count_result.scalar() or 0) >= 10:
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
    existing_count = count_result.scalar() or 0
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
async def set_primary_image(
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
async def delete_listing_image(
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
    await delete_storage_file(img.storage_path)
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
async def delete_listing(
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


# ── POST /vendor/listings/{listing_id}/images ─────────────────
@router.post("/listings/{listing_id}/images")
async def upload_image(
    listing_id: str,
    file: UploadFile = File(...),
    is_primary: bool = Form(False),
    alt_text: Optional[str] = Form(None),
    current_user: VendorUser = None,
    db: DBSession = None,
):
    """Upload a machine image to Supabase Storage."""
    result = await db.execute(
        select(Machine).options(selectinload(Machine.images)).where(
            Machine.id == uuid.UUID(listing_id),
            Machine.vendor_id == current_user.id,
        )
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Validate file type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are accepted.")

    # Check image count limit from subscription
    max_photos = 5
    sub_result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
    )
    sub = sub_result.scalar_one_or_none()
    if sub and sub.plan:
        max_photos = sub.plan.photos_per_listing

    if len(machine.images) >= max_photos:
        raise HTTPException(status_code=400, detail=f"Maximum {max_photos} images per listing.")

    # Upload to Supabase Storage
    storage_path, display_url = await upload_machine_image(
        file, vendor_id=str(current_user.id), machine_id=listing_id
    )

    existing_count = len(machine.images)
    new_sort_order = existing_count

    if is_primary:
        for img in machine.images:
            img.is_primary = False

    image = MachineImage(
        id=uuid.uuid4(),
        machine_id=machine.id,
        storage_path=storage_path,
        display_url=display_url,
        alt_text=alt_text or machine.title,
        sort_order=new_sort_order,
        is_primary=is_primary or existing_count == 0,
    )
    db.add(image)
    await db.commit()
    return {"id": str(image.id), "display_url": display_url, "is_primary": image.is_primary}


# ── DELETE /vendor/listings/{listing_id}/images/{image_id} ────
@router.delete("/listings/{listing_id}/images/{image_id}", status_code=204)
async def delete_image(
    listing_id: str,
    image_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Delete an image from a listing."""
    result = await db.execute(
        select(MachineImage)
        .join(Machine, MachineImage.machine_id == Machine.id)
        .where(
            MachineImage.id == uuid.UUID(image_id),
            Machine.vendor_id == current_user.id,
        )
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    delete_storage_file(img.storage_path)
    await db.delete(img)
    await db.commit()


# ── GET /vendor/enquiries ──────────────────────────────────────
@router.get("/enquiries")
async def get_vendor_enquiries(
    current_user: VendorUser,
    db: DBSession,
    status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """Return all enquiries received for vendor's listings."""
    offset = (page - 1) * per_page
    stmt = (
        select(Enquiry)
        .options(selectinload(Enquiry.machine), selectinload(Enquiry.customer))
        .where(Enquiry.vendor_id == current_user.id)
        .order_by(Enquiry.created_at.desc())
    )
    if status_filter:
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
async def get_vendor_stats(current_user: VendorUser, db: DBSession):
    """Aggregated stats for vendor dashboard."""
    listings_by_status = await db.execute(
        select(Machine.status, func.count(Machine.id))
        .where(Machine.vendor_id == current_user.id)
        .group_by(Machine.status)
    )

    total_views = await db.execute(
        select(func.sum(Machine.views_count)).where(Machine.vendor_id == current_user.id)
    )

    total_enquiries = await db.execute(
        select(func.count(Enquiry.id)).where(Enquiry.vendor_id == current_user.id)
    )

    unread_enquiries = await db.execute(
        select(func.count(Enquiry.id)).where(
            Enquiry.vendor_id == current_user.id,
            Enquiry.is_read_by_vendor == False,
        )
    )

    status_map = {row[0]: row[1] for row in listings_by_status.all()}

    return {
        "total_listings": sum(status_map.values()),
        "approved_listings": status_map.get(MachineStatus.approved, 0),
        "pending_listings": status_map.get(MachineStatus.pending, 0),
        "paused_listings": status_map.get(MachineStatus.paused, 0),
        "total_views": total_views.scalar() or 0,
        "total_enquiries": total_enquiries.scalar() or 0,
        "unread_enquiries": unread_enquiries.scalar() or 0,
    }


# ── GET /vendor/enquiries/{id} ─────────────────────────────────
@router.get("/enquiries/{enquiry_id}")
async def get_vendor_enquiry_thread(
    enquiry_id: str,
    current_user: VendorUser,
    db: DBSession,
):
    """Get full details and message thread for a specific enquiry."""
    result = await db.execute(
        select(Enquiry)
        .options(
            selectinload(Enquiry.machine),
            selectinload(Enquiry.customer),
            selectinload(Enquiry.messages).selectinload("sender")
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
async def reply_to_enquiry(
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
