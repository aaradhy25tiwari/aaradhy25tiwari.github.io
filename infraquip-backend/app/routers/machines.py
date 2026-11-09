"""
Machines Router — Public listing detail, vendor CRUD stub.
Full CRUD lives in vendor.py; this router exposes public endpoints.
"""
import uuid
from fastapi import APIRouter, HTTPException, status, Request
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload, joinedload

from app.deps import OptionalUser, DBSession
from app.models.machine import Machine, MachineStatus, MachineImage
from app.models.user import User, VendorProfile
from app.models.analytics import Wishlist
from app.schemas.machine import MachineDetailResponse
from app.services.storage_service import get_signed_url
from app.core.rate_limiter import limiter
from app.config import settings

router = APIRouter()


@router.get("/{slug}", response_model=MachineDetailResponse)
@limiter.limit(settings.RATE_LIMIT_PUBLIC)
async def get_machine_detail(
    request: Request,
    slug: str,
    db: DBSession,
    current_user: OptionalUser,
):
    """
    Get a single machine listing by slug.
    Increments view count. Returns is_wishlisted for authenticated users.
    """
    stmt = (
        select(Machine)
        .options(
            selectinload(Machine.images),
            joinedload(Machine.vendor).joinedload(User.vendor_profile),
            joinedload(Machine.category),
        )
        .where(Machine.slug == slug)
    )

    is_wishlisted = None
    if current_user:
        stmt = stmt.outerjoin(
            Wishlist,
            (Wishlist.machine_id == Machine.id) & (Wishlist.user_id == current_user.id)
        ).add_columns(Wishlist.id.is_not(None).label("is_wishlisted"))
        row = (await db.execute(stmt)).first()
        if not row:
            raise HTTPException(status_code=404, detail="Listing not found.")
        machine, is_wishlisted = row[0], row[1]
    else:
        result = await db.execute(stmt)
        machine = result.scalar_one_or_none()

    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found.")

    # Only approved machines are visible to public; vendor owner and admins can preview any status
    is_owner = current_user and machine.vendor_id == current_user.id
    is_admin = current_user and getattr(current_user, "role", None) == "admin"
    if machine.status != MachineStatus.approved and not (is_owner or is_admin):
        raise HTTPException(status_code=404, detail="Listing not found or not yet approved.")

    # Increment view count (fire-and-forget style via direct update)
    if machine.status == MachineStatus.approved:
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

    # Anonymize vendor & equipment registration for guest and customer privacy
    is_authenticated = bool(current_user)
    is_privileged = bool(is_owner or is_admin)

    # Verification status is consistent across all user perspectives
    is_vendor_verified = bool(vendor_profile.is_verified) if vendor_profile else False

    # Anonymized partner badge for guests/customers
    partner_code = f"IQ-{str(machine.vendor_id)[:6].upper()}" if machine.vendor_id else "IQ-PARTNER"
    if is_vendor_verified:
        anonymized_vendor_name = f"InfraQuip Verified Partner #{partner_code}"
    else:
        anonymized_vendor_name = f"InfraQuip Partner #{partner_code}"

    if is_privileged:
        # Full vendor profile for owner & admin
        vendor_data = {
            "id": str(machine.vendor.id),
            "full_name": machine.vendor.full_name,
            "company_name": vendor_profile.company_name if vendor_profile else machine.vendor.full_name,
            "city": vendor_profile.city if vendor_profile else machine.city,
            "state": vendor_profile.state if vendor_profile else machine.state,
            "avatar_url": machine.vendor.avatar_url,
            "is_verified": is_vendor_verified,
            "response_rate": vendor_profile.response_rate if vendor_profile else 95,
            "member_since": vendor_profile.member_since if vendor_profile else machine.created_at,
        } if machine.vendor else None
        display_reg_no = machine.registration_number
        display_sr_no = machine.machine_serial_no
        display_sr_plate = (
            machine.serial_plate_photo_url
            if (machine.serial_plate_photo_url and machine.serial_plate_photo_url.startswith("http"))
            else (get_signed_url(machine.serial_plate_photo_url, expires_in=3600) if machine.serial_plate_photo_url else None)
        )
    else:
        # Sanitized vendor profile: non-sensitive public identifier, no direct contact details
        vendor_data = {
            "id": partner_code,
            "full_name": anonymized_vendor_name,
            "company_name": anonymized_vendor_name,
            "city": machine.city,
            "state": machine.state,
            "avatar_url": None,
            "is_verified": is_vendor_verified,
            "response_rate": vendor_profile.response_rate if vendor_profile else 95,
            "member_since": vendor_profile.member_since if vendor_profile else machine.created_at,
        }
        # Mask registration & chassis numbers (full mask if < 10 chars, partial if >= 10 chars)
        reg = machine.registration_number or ""
        display_reg_no = (f"{reg[:4]} •••• {reg[-2:]}" if len(reg) >= 10 else "••••••••") if reg else None
        sr = machine.machine_serial_no or ""
        display_sr_no = (f"•••• {sr[-4:]}" if len(sr) >= 10 else "••••••••") if sr else None
        display_sr_plate = None  # Strictly admin/owner view only

    # Gated Term Sheets: full access for logged-in users; locked for guests
    if is_authenticated:
        rental_sheet = machine.rental_term_sheet
        sale_sheet = machine.sale_term_sheet
        is_sheet_locked = False
    else:
        # Guest view: locked term sheet
        rental_sheet = None
        sale_sheet = None
        is_sheet_locked = bool(machine.rental_term_sheet or machine.sale_term_sheet)

    # Build the response dict manually to handle computed fields
    response = MachineDetailResponse(
        id=str(machine.id),
        vendor_id=machine.vendor_id if is_privileged else None,
        slug=machine.slug,
        category_id=machine.category_id,
        sub_category_id=machine.sub_category_id,
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
        expires_at=machine.expires_at,
        is_expired=machine.is_expired,
        is_active=machine.is_active,
        rental_price_hourly=machine.rental_price_hourly,
        rental_price_daily=machine.rental_price_daily,
        rental_price_weekly=machine.rental_price_weekly,
        rental_price_monthly=machine.rental_price_monthly,
        purchase_price=machine.purchase_price,
        contact_for_price=machine.contact_for_price,
        is_negotiable=getattr(machine, "is_negotiable", False) or False,
        city=machine.city,
        state=machine.state,
        address_line=machine.address_line if is_privileged else None,
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
        vendor=vendor_data,
        category_name=machine.category.name if machine.category else None,
        is_wishlisted=is_wishlisted,
        created_at=machine.created_at,
        is_rto_registered=machine.is_rto_registered,
        registration_number=display_reg_no,
        chassis_number=machine.chassis_number if is_privileged else None,
        machine_serial_no=display_sr_no,
        serial_plate_photo_url=display_sr_plate,
        rental_term_sheet=rental_sheet,
        sale_term_sheet=sale_sheet,
        has_custom_terms=machine.has_custom_terms,
        is_term_sheet_locked=is_sheet_locked,
    )
    return response


# ── GET /machines/sitemap — for Next.js sitemap generator ─────
@router.get("/sitemap", response_model=list[dict])
@limiter.limit(settings.RATE_LIMIT_PUBLIC)
async def get_sitemap_slugs(request: Request, db: DBSession):
    """Return all approved machine slugs + updated_at for sitemap generation."""
    result = await db.execute(
        select(Machine.slug, Machine.updated_at)
        .where(Machine.status == MachineStatus.approved)
        .order_by(Machine.updated_at.desc())
    )
    rows = result.all()
    return [{"slug": row.slug, "updated_at": row.updated_at.isoformat()} for row in rows]
