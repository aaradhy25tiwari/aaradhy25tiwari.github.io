"""
Categories Router — Public endpoint for category list with counts.
"""
from fastapi import APIRouter
from sqlalchemy import select, func

from app.deps import DBSession
from app.models.machine import Category, Machine, MachineStatus
from app.schemas.machine import CategoryResponse

router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
async def list_categories(db: DBSession):
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
