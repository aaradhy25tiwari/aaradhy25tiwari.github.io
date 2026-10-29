"""
Category Sync Service — Ensures equipment categories stay in sync with master data.
Whenever a new category is introduced in equipment master data (single create, bulk import,
or listing review queue add-to-master), this service ensures it exists in the Category table.
"""
import re
import uuid
import logging
from typing import List, Optional, Set
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.machine import Category, EquipmentMasterCatalog

logger = logging.getLogger("infraquip.category_sync")


def generate_slug(text: str) -> str:
    """Generate a clean URL-friendly slug."""
    slug = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return slug or "category"


def format_category_name(raw_name: str) -> str:
    """
    Format a raw category name for display.
    Example: 'AIR COMPRESSOR' -> 'Air Compressor', 'EXCAVATOR' -> 'Excavators' (or 'Excavator').
    Preserves mixed-case names like 'Backhoe Loader'.
    """
    trimmed = raw_name.strip()
    if trimmed.isupper() or trimmed.islower():
        # Clean title casing
        formatted = trimmed.title()
        # Handle small acronyms if needed
        return formatted
    return trimmed


def is_category_match(cat_name: str, existing_cat: Category) -> bool:
    """
    Check if a master data category matches an existing Category.
    Handles exact match, case-insensitivity, singular/plural, and slug match.
    """
    a = cat_name.strip().lower()
    b = existing_cat.name.strip().lower()
    if a == b:
        return True

    slug_a = generate_slug(cat_name)
    if slug_a == existing_cat.slug.lower():
        return True

    # Check singular / plural (e.g. 'excavators' vs 'excavator')
    a_sing = a[:-1] if a.endswith('s') else a
    b_sing = b[:-1] if b.endswith('s') else b
    if a_sing == b_sing:
        return True

    return False


async def ensure_categories_synced_for_names(
    db: AsyncSession,
    category_names: List[str]
) -> List[Category]:
    """
    Given a list of category names (e.g. from newly added master data items),
    checks if each exists in the Category table. If not, creates it.
    Returns the newly created Category objects.
    """
    if not category_names:
        return []

    # Clean & deduplicate input category names
    unique_inputs = []
    seen_inputs = set()
    for raw in category_names:
        if not raw or not isinstance(raw, str) or not raw.strip():
            continue
        cleaned = raw.strip()
        key = cleaned.lower()
        if key not in seen_inputs:
            seen_inputs.add(key)
            unique_inputs.append(cleaned)

    if not unique_inputs:
        return []

    # Fetch existing categories
    existing_result = await db.execute(select(Category))
    existing_categories = list(existing_result.scalars().all())

    # Find max sort order to append new categories nicely
    max_sort_order = max([c.sort_order for c in existing_categories if c.sort_order is not None] or [0])
    existing_slugs = {c.slug.lower() for c in existing_categories}
    existing_names_lower = {c.name.strip().lower() for c in existing_categories}

    new_categories: List[Category] = []

    for cat_name in unique_inputs:
        # Check if already matched with existing or newly created in this batch
        matched = False
        for ex in existing_categories:
            if is_category_match(cat_name, ex):
                matched = True
                break
        if matched:
            continue

        for ncat in new_categories:
            if is_category_match(cat_name, ncat):
                matched = True
                break
        if matched:
            continue

        # Format display name
        display_name = format_category_name(cat_name)

        # Make sure display_name is not already taken
        final_name = display_name
        name_counter = 1
        while final_name.lower() in existing_names_lower:
            final_name = f"{display_name} ({name_counter})"
            name_counter += 1
        existing_names_lower.add(final_name.lower())

        # Generate unique slug
        base_slug = generate_slug(final_name)
        slug = base_slug
        counter = 1
        while slug in existing_slugs:
            slug = f"{base_slug}-{counter}"
            counter += 1
        existing_slugs.add(slug)

        max_sort_order += 1
        new_cat = Category(
            id=uuid.uuid4(),
            name=final_name,
            slug=slug,
            icon_url=None,
            description=f"Heavy equipment listings, rentals, and specifications for {final_name}.",
            sort_order=max_sort_order,
            is_active=True,
        )
        db.add(new_cat)
        new_categories.append(new_cat)
        existing_categories.append(new_cat)
        logger.info(f"Auto-synced new category '{final_name}' ({slug}) from master data.")

    if new_categories:
        await db.flush()

    return new_categories


async def sync_all_categories_from_master(db: AsyncSession) -> dict:
    """
    Scans the EquipmentMasterCatalog for all unique categories and ensures
    every category in master data has a corresponding active entry in the Category table.
    """
    # 1. Get distinct category names from EquipmentMasterCatalog
    master_result = await db.execute(
        select(func.distinct(EquipmentMasterCatalog.category_name))
        .where(EquipmentMasterCatalog.category_name.isnot(None))
    )
    master_cat_names = set(r[0] for r in master_result.all() if r[0] and str(r[0]).strip())

    # 2. Check if EquipmentMasterData also has records
    try:
        from app.models.master_data import EquipmentMasterData
        emd_result = await db.execute(
            select(func.distinct(EquipmentMasterData.equipment_type))
            .where(EquipmentMasterData.equipment_type.isnot(None))
        )
        for r in emd_result.all():
            if r[0] and str(r[0]).strip():
                master_cat_names.add(str(r[0]).strip())
    except Exception as e:
        logger.debug(f"EquipmentMasterData check skipped: {e}")

    # 3. Ensure all categories are synced into Category table
    new_categories = await ensure_categories_synced_for_names(db, list(master_cat_names))
    if new_categories:
        await db.commit()

    # Total categories count
    total_result = await db.execute(select(func.count(Category.id)))
    total_categories = total_result.scalar() or 0

    return {
        "synced": True,
        "master_categories_found": len(master_cat_names),
        "new_categories_created": len(new_categories),
        "created_category_names": [c.name for c in new_categories],
        "total_categories": total_categories,
    }

