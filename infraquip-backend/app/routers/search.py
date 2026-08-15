"""
Search Router — Full-text + geo-filtered machine search with Redis caching
"""
import math
from typing import Optional, List
from fastapi import APIRouter, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.deps import OptionalUser, DBSession
from app.models.machine import (
    Machine, MachineStatus, MachineCondition, ListingType, Category, 
    MachineRunningCondition, MachineOwnershipType
)
from app.models.user import User, VendorProfile
from app.models.analytics import Wishlist
from app.schemas.machine import MachineListItemResponse, PaginatedMachineResponse
from app.services.cache_service import cache_get, cache_set, build_search_cache_key

router = APIRouter()


@router.get("", response_model=PaginatedMachineResponse)
async def search_machines(
    db: DBSession,
    current_user: OptionalUser,
    q: Optional[str] = Query(None, max_length=200),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None, max_length=100),
    state: Optional[str] = Query(None, max_length=100),
    radius: Optional[int] = Query(None, ge=1, le=500),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    listing_type: Optional[ListingType] = Query(None),
    condition: Optional[List[MachineCondition]] = Query(None),
    running_condition: Optional[MachineRunningCondition] = Query(None),
    ownership_type: Optional[MachineOwnershipType] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    available: Optional[bool] = Query(None),
    sort: str = Query("relevance", pattern="^(newest|price_asc|price_desc|relevance|distance)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=50),
):
    """
    Search/filter machines with full-text search, category, location, price,
    condition, and availability filters. Supports relevance-ranked FTS via
    PostgreSQL tsvector, distance-based sorting via PostGIS, and radius
    filtering. Popular queries are cached in Redis (5-minute TTL).
    """
    # Check cache for unauthenticated, non-geo queries
    use_cache = current_user is None and lat is None and lng is None
    cache_key = None
    if use_cache:
        params = {
            "q": q, "category": category, "city": city, "state": state,
            "listing_type": listing_type, "condition": condition,
            "running_condition": running_condition, "ownership_type": ownership_type,
            "min_price": min_price, "max_price": max_price,
            "available": available, "sort": sort, "page": page, "per_page": per_page,
        }
        cache_key = build_search_cache_key(params)
        cached = await cache_get(cache_key)
        if cached:
            return PaginatedMachineResponse(**cached)

    offset = (page - 1) * per_page

    # Base query — only approved listings
    stmt = (
        select(Machine)
        .options(
            selectinload(Machine.images),
            selectinload(Machine.vendor).selectinload(User.vendor_profile),
        )
        .where(Machine.status == MachineStatus.approved)
    )

    # ── Full-text search via tsvector ───────────────────────────
    if q:
        stmt = stmt.where(
            Machine.search_vector.op("@@")(func.plainto_tsquery("english", q))
        )

    # ── Category filter (by slug) ──────────────────────────────
    if category:
        from app.models.machine import Category
        cat_result = await db.execute(
            select(Category.id).where(Category.slug == category)
        )
        cat_id = cat_result.scalar_one_or_none()
        if cat_id:
            stmt = stmt.where(Machine.category_id == cat_id)

    # ── Location filters ───────────────────────────────────────
    if city:
        stmt = stmt.where(Machine.city.ilike(f"%{city}%"))
    if state:
        stmt = stmt.where(Machine.state.ilike(f"%{state}%"))

    # PostGIS radius filter
    if radius and lat is not None and lng is not None:
        stmt = stmt.where(
            func.ST_DWithin(
                Machine.location,
                func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
                radius * 1000,  # km → meters
            )
        )

    # ── Listing type ───────────────────────────────────────────
    if listing_type:
        stmt = stmt.where(
            or_(
                Machine.listing_type == listing_type,
                Machine.listing_type == ListingType.both,
            )
        )

    # ── Condition filter ───────────────────────────────────────
    if condition:
        stmt = stmt.where(Machine.condition.in_(condition))
        
    if running_condition:
        stmt = stmt.where(Machine.running_condition == running_condition)
        
    if ownership_type:
        stmt = stmt.where(Machine.ownership_type == ownership_type)

    # ── Price filter ───────────────────────────────────────────
    if min_price is not None:
        stmt = stmt.where(
            or_(
                Machine.rental_price_daily >= min_price,
                Machine.purchase_price >= min_price,
            )
        )
    if max_price is not None:
        stmt = stmt.where(
            or_(
                Machine.rental_price_daily <= max_price,
                Machine.purchase_price <= max_price,
            )
        )

    # ── Availability ───────────────────────────────────────────
    if available is not None:
        stmt = stmt.where(Machine.availability == available)

    # ── Sorting ────────────────────────────────────────────────
    if sort == "newest":
        stmt = stmt.order_by(Machine.created_at.desc())
    elif sort == "price_asc":
        stmt = stmt.order_by(Machine.rental_price_daily.asc().nullslast())
    elif sort == "price_desc":
        stmt = stmt.order_by(Machine.rental_price_daily.desc().nullslast())
    elif sort == "distance" and lat is not None and lng is not None:
        stmt = stmt.order_by(
            func.ST_Distance(
                Machine.location,
                func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
            ).asc()
        )
    else:
        # Relevance: rank by ts_rank if query exists, else by views
        if q:
            stmt = stmt.order_by(
                func.ts_rank(Machine.search_vector, func.plainto_tsquery("english", q)).desc()
            )
        else:
            stmt = stmt.order_by(Machine.views_count.desc())

    # ── Count total ────────────────────────────────────────────
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # ── Paginate ───────────────────────────────────────────────
    stmt = stmt.offset(offset).limit(per_page)
    result = await db.execute(stmt)
    machines = result.scalars().all()

    # ── Build wishlist map for current user ────────────────────
    wishlist_set: set = set()
    if current_user:
        from app.models.analytics import Wishlist
        wl_result = await db.execute(
            select(Wishlist.machine_id).where(Wishlist.user_id == current_user.id)
        )
        wishlist_set = {str(row) for row in wl_result.scalars().all()}

    # ── Build response items ───────────────────────────────────
    items: List[MachineListItemResponse] = []
    for m in machines:
        vp: Optional[VendorProfile] = m.vendor.vendor_profile if m.vendor else None
        primary_img = next((img for img in m.images if img.is_primary), None)
        if not primary_img and m.images:
            primary_img = m.images[0]

        img_response = None
        if primary_img:
            img_response = {
                "id": str(primary_img.id),
                "storage_path": primary_img.storage_path,
                "display_url": primary_img.display_url,
                "alt_text": primary_img.alt_text,
                "sort_order": primary_img.sort_order,
                "is_primary": primary_img.is_primary,
            }

        # Calculate distance if lat/lng provided
        distance_km = None
        if lat is not None and lng is not None and m.location is not None:
            dist_result = await db.execute(
                select(
                    func.ST_Distance(
                        m.location,
                        func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
                    )
                )
            )
            raw = dist_result.scalar()
            if raw is not None:
                distance_km = round(raw / 1000, 1)

        items.append(
            MachineListItemResponse(
                id=str(m.id),
                slug=m.slug,
                title=m.title,
                make=m.make,
                model=m.model,
                year_of_manufacture=m.year_of_manufacture,
                condition=m.condition,
                running_condition=m.running_condition,
                hmr=m.hmr,
                ownership_type=m.ownership_type,
                listing_type=m.listing_type,
                availability=m.availability,
                city=m.city,
                state=m.state,
                rental_price_daily=m.rental_price_daily,
                purchase_price=m.purchase_price,
                contact_for_price=m.contact_for_price,
                views_count=m.views_count,
                enquiries_count=m.enquiries_count,
                primary_image=img_response,
                vendor_name=vp.company_name if vp else (m.vendor.full_name if m.vendor else ""),
                vendor_city=vp.city if vp else None,
                vendor_is_verified=vp.is_verified if vp else False,
                distance_km=distance_km,
                is_wishlisted=str(m.id) in wishlist_set if current_user else None,
            )
        )

    response = PaginatedMachineResponse(
        results=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 0,
        city=city,
    )

    # Cache for unauthenticated queries
    if cache_key:
        await cache_set(cache_key, response.model_dump(), ttl_seconds=300)

    return response
