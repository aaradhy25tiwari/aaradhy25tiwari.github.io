"""
Machines Router — Public listing detail, vendor CRUD stub.
Full CRUD lives in vendor.py; this router exposes public endpoints.
"""
import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.deps import OptionalUser, DBSession
from app.models.machine import Machine, MachineStatus, MachineImage
from app.models.user import User, VendorProfile
from app.schemas.machine import MachineDetailResponse

router = APIRouter()


@router.get("/{slug}", response_model=MachineDetailResponse)
async def get_machine_detail(
    slug: str,
    db: DBSession,
    current_user: OptionalUser,
):
    """
    Get a single machine listing by slug.
    Increments view count. Returns is_wishlisted for authenticated users.
    """
    result = await db.execute(
        select(Machine)
        .options(
            selectinload(Machine.images),
            selectinload(Machine.vendor).selectinload(User.vendor_profile),
            selectinload(Machine.category),
        )
        .where(Machine.slug == slug, Machine.status == MachineStatus.approved)
    )
    machine = result.scalar_one_or_none()

    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found or not yet approved.")

    # Increment view count (fire-and-forget style via direct update)
    await db.execute(
        update(Machine)
        .where(Machine.id == machine.id)
        .values(views_count=Machine.views_count + 1)
    )
    await db.commit()

    # Build response
    vendor_profile = machine.vendor.vendor_profile if machine.vendor else None
    primary_image = next((img for img in machine.images if img.is_primary), None)
    if not primary_image and machine.images:
        primary_image = machine.images[0]

    # Check wishlist status
    is_wishlisted = None
    if current_user:
        from app.models.analytics import Wishlist
        wl_result = await db.execute(
            select(Wishlist).where(
                Wishlist.user_id == current_user.id,
                Wishlist.machine_id == machine.id,
            )
        )
        is_wishlisted = wl_result.scalar_one_or_none() is not None

    # Build the response dict manually to handle computed fields
    response = MachineDetailResponse(
        id=str(machine.id),
        slug=machine.slug,
        title=machine.title,
        make=machine.make,
        model=machine.model,
        year_of_manufacture=machine.year_of_manufacture,
        condition=machine.condition,
        running_condition=machine.running_condition,
        hmr=machine.hmr,
        ownership_type=machine.ownership_type,
        capacity_specs=machine.capacity_specs,
        specifications=machine.specifications,
        description=machine.description,
        listing_type=machine.listing_type,
        min_rental_duration=machine.min_rental_duration,
        availability=machine.availability,
        status=machine.status,
        rental_price_daily=machine.rental_price_daily,
        rental_price_weekly=machine.rental_price_weekly,
        rental_price_monthly=machine.rental_price_monthly,
        purchase_price=machine.purchase_price,
        contact_for_price=machine.contact_for_price,
        city=machine.city,
        state=machine.state,
        address_line=machine.address_line,
        latitude=machine.latitude,
        longitude=machine.longitude,
        views_count=machine.views_count + 1,
        enquiries_count=machine.enquiries_count,
        images=[
            {
                "id": str(img.id),
                "storage_path": img.storage_path,
                "display_url": img.display_url,
                "alt_text": img.alt_text,
                "sort_order": img.sort_order,
                "is_primary": img.is_primary,
            }
            for img in sorted(machine.images, key=lambda x: x.sort_order)
        ],
        vendor={
            "id": str(machine.vendor.id),
            "full_name": machine.vendor.full_name,
            "company_name": vendor_profile.company_name if vendor_profile else None,
            "city": vendor_profile.city if vendor_profile else machine.city,
            "state": vendor_profile.state if vendor_profile else machine.state,
            "avatar_url": machine.vendor.avatar_url,
            "is_verified": vendor_profile.is_verified if vendor_profile else False,
            "response_rate": vendor_profile.response_rate if vendor_profile else None,
            "member_since": vendor_profile.member_since if vendor_profile else None,
        } if machine.vendor else None,
        category_name=machine.category.name if machine.category else None,
        is_wishlisted=is_wishlisted,
        created_at=machine.created_at,
    )
    return response


# ── GET /machines/sitemap — for Next.js sitemap generator ─────
@router.get("/sitemap", response_model=list[dict])
async def get_sitemap_slugs(db: DBSession):
    """Return all approved machine slugs + updated_at for sitemap generation."""
    result = await db.execute(
        select(Machine.slug, Machine.updated_at)
        .where(Machine.status == MachineStatus.approved)
        .order_by(Machine.updated_at.desc())
    )
    rows = result.all()
    return [{"slug": row.slug, "updated_at": row.updated_at.isoformat()} for row in rows]
