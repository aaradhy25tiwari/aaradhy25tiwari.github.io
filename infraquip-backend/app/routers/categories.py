"""
Categories Router — Public endpoint for category list with counts.
"""
from fastapi import APIRouter, Request
from sqlalchemy import select, func

from app.deps import DBSession
from app.models.machine import Category, Machine, MachineStatus
from app.schemas.machine import CategoryResponse
from app.core.rate_limiter import limiter
from app.config import settings

router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
@limiter.limit(settings.RATE_LIMIT_PUBLIC)
async def list_categories(request: Request, db: DBSession):
    """List all active categories with their live listing counts."""
    result = await db.execute(
        select(
            Category,
            func.count(Machine.id).label("listing_count"),
        )
        .outerjoin(
            Machine,
            (Machine.category_id == Category.id) & (Machine.status == MachineStatus.approved),
        )
        .where(Category.is_active == True)
        .group_by(Category.id)
        .order_by(Category.sort_order)
    )
    rows = result.all()
    return [
        CategoryResponse(
            id=str(row.Category.id),
            name=row.Category.name,
            slug=row.Category.slug,
            icon_url=row.Category.icon_url,
            description=row.Category.description,
            listing_count=row.listing_count,
        )
        for row in rows
    ]


@router.get("/master-catalog")
@limiter.limit(settings.RATE_LIMIT_PUBLIC)
async def get_master_catalog(request: Request, db: DBSession):

    """Return all equipment master catalog items for dropdown lookups."""
    from app.models.machine import EquipmentMasterCatalog
    result = await db.execute(
        select(EquipmentMasterCatalog).order_by(
            EquipmentMasterCatalog.category_name,
            EquipmentMasterCatalog.make,
            EquipmentMasterCatalog.model
        )
    )
    items = result.scalars().all()
    return [
        {
            "id": str(item.id),
            "category_name": item.category_name,
            "make": item.make,
            "model": item.model,
            "capacity_specs": item.capacity_specs,
        }
        for item in items
    ]

