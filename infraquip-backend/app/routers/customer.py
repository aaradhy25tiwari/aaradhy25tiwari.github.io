"""
Customer Dashboard Router — Wishlists, enquiry history, preferences
"""
import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.deps import CustomerOrBrokerUser, DBSession
from app.models.analytics import Wishlist
from app.models.machine import Machine, MachineStatus, MachineImage
from app.models.enquiry import Enquiry
from app.schemas.wishlist import WishlistItemResponse, WishlistListResponse
from app.schemas.enquiry import EnquiryListItemResponse

router = APIRouter()


# ── GET /customer/wishlist ─────────────────────────────────────
@router.get("/wishlist", response_model=WishlistListResponse)
async def get_wishlist(current_user: CustomerOrBrokerUser, db: DBSession):
    result = await db.execute(
        select(Wishlist)
        .options(selectinload(Wishlist.machine).selectinload(Machine.images))
        .where(Wishlist.user_id == current_user.id)
        .order_by(Wishlist.created_at.desc())
    )
    items = result.scalars().all()

    wishlist_items = []
    for w in items:
        primary_img = None
        if w.machine and w.machine.images:
            primary = next((img for img in w.machine.images if img.is_primary), None)
            if not primary:
                primary = w.machine.images[0]
            primary_img = primary.display_url if primary else None

        wishlist_items.append(
            WishlistItemResponse(
                id=str(w.id),
                machine_id=str(w.machine_id),
                machine_title=w.machine.title if w.machine else None,
                machine_slug=w.machine.slug if w.machine else None,
                city=w.machine.city if w.machine else None,
                rental_price_daily=float(w.machine.rental_price_daily) if w.machine and w.machine.rental_price_daily else None,
                primary_image=primary_img,
                added_at=w.created_at,
            )
        )

    return WishlistListResponse(results=wishlist_items, total=len(wishlist_items))


# ── POST /customer/wishlist/{machine_id} ───────────────────────
@router.post("/wishlist/{machine_id}", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(machine_id: str, current_user: CustomerOrBrokerUser, db: DBSession):
    machine_result = await db.execute(
        select(Machine).where(
            Machine.id == uuid.UUID(machine_id),
            Machine.status == MachineStatus.approved,
        )
    )
    machine = machine_result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Listing not found.")

    existing = await db.execute(
        select(Wishlist).where(
            Wishlist.user_id == current_user.id,
            Wishlist.machine_id == machine.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already in wishlist.")

    wl = Wishlist(id=uuid.uuid4(), user_id=current_user.id, machine_id=machine.id)
    db.add(wl)
    await db.commit()
    return {"message": "Added to wishlist."}


# ── DELETE /customer/wishlist/{machine_id} ─────────────────────
@router.delete("/wishlist/{machine_id}", status_code=204)
async def remove_from_wishlist(machine_id: str, current_user: CustomerOrBrokerUser, db: DBSession):
    result = await db.execute(
        select(Wishlist).where(
            Wishlist.user_id == current_user.id,
            Wishlist.machine_id == uuid.UUID(machine_id),
        )
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Not in wishlist.")
    await db.delete(wl)
    await db.commit()


# ── GET /customer/enquiries ────────────────────────────────────
@router.get("/enquiries")
async def get_customer_enquiries(current_user: CustomerOrBrokerUser, db: DBSession):
    result = await db.execute(
        select(Enquiry)
        .options(selectinload(Enquiry.machine))
        .where(Enquiry.customer_id == current_user.id)
        .order_by(Enquiry.created_at.desc())
    )
    enquiries = result.scalars().all()
    return [
        EnquiryListItemResponse(
            id=str(e.id),
            machine_title=e.machine.title if e.machine else "General Enquiry",
            machine_slug=e.machine.slug if e.machine else None,
            requirement_type=e.requirement_type.value if hasattr(e.requirement_type, "value") else e.requirement_type,
            status=e.status.value if hasattr(e.status, "value") else e.status,
            is_read=e.is_read_by_vendor,
            created_at=e.created_at,
        )
        for e in enquiries
    ]


# ── GET /customer/stats ────────────────────────────────────────
@router.get("/stats")
async def get_customer_stats(current_user: CustomerOrBrokerUser, db: DBSession):
    wishlist_count = (await db.execute(
        select(func.count(Wishlist.id)).where(Wishlist.user_id == current_user.id)
    )).scalar() or 0

    enquiry_count = (await db.execute(
        select(func.count(Enquiry.id)).where(Enquiry.customer_id == current_user.id)
    )).scalar() or 0

    return {"wishlist_count": wishlist_count, "total_enquiries": enquiry_count}
