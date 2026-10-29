"""
Categories Router — Public endpoint for category list with counts.
"""
import logging
from fastapi import APIRouter, Request
from sqlalchemy import select, func, case

from app.deps import DBSession
from app.models.machine import Category, Machine, MachineStatus
from app.schemas.machine import CategoryResponse
from app.core.rate_limiter import limiter
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
@limiter.limit(settings.RATE_LIMIT_PUBLIC)
async def list_categories(request: Request, db: DBSession):
    """List all active categories with their live listing counts, auto-synced with master data."""
    from app.services.category_sync import sync_all_categories_from_master
    await sync_all_categories_from_master(db)

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
        .order_by(
            case((func.lower(Category.name).like("other%"), 1), else_=0),
            func.lower(Category.name).asc(),
        )
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
    """Return all equipment master catalog items for dropdown lookups, sorted ascending with Other last."""
    from app.models.machine import EquipmentMasterCatalog
    from app.services.category_sync import sync_all_categories_from_master

    stmt = select(EquipmentMasterCatalog).order_by(
        case((func.lower(EquipmentMasterCatalog.category_name).like("other%"), 1), else_=0),
        func.lower(EquipmentMasterCatalog.category_name).asc(),
        case((func.lower(EquipmentMasterCatalog.make).like("other%"), 1), else_=0),
        func.lower(EquipmentMasterCatalog.make).asc(),
        case((func.lower(EquipmentMasterCatalog.model).like("other%"), 1), else_=0),
        func.lower(EquipmentMasterCatalog.model).asc(),
    )

    result = await db.execute(stmt)
    items = result.scalars().all()

    # If database catalog is empty, attempt auto-seed from master_data.json
    if not items:
        import os, json
        json_path = os.path.join(os.path.dirname(__file__), "..", "..", "master_data.json")
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    raw_rows = json.load(f)
                for r in raw_rows:
                    cat = (r.get("Equipment Type") or r.get("category_name") or "").strip().upper()
                    mk = (r.get("Equipment Make") or r.get("make") or "").strip()
                    md = (r.get("Equipment Model") or r.get("model") or "").strip()
                    cap1 = r.get("Capacity 1 Range") or (f"{r.get('Capacity 1')} {r.get('Capacity Unit 1') or ''}".strip() if r.get("Capacity 1") else "")
                    cap2 = r.get("Capacity 2 Range") or (f"{r.get('Capacity 2')} {r.get('Capacity Unit 2') or ''}".strip() if r.get("Capacity 2") else "")
                    cap = " | ".join(filter(None, [cap1, cap2])) or None
                    if cat and mk and md:
                        db.add(EquipmentMasterCatalog(category_name=cat, make=mk, model=md, capacity_specs=cap))
                await db.commit()
                await sync_all_categories_from_master(db)
                re_res = await db.execute(stmt)
                items = re_res.scalars().all()
            except Exception as e:
                logger.warning(f"Auto-seed master catalog failed: {e}")

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

