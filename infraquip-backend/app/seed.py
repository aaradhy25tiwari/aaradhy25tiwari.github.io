"""
Database Seed Script — Run once to populate categories, plans, admin user.
Run with: venv/Scripts/python -m app.seed
"""
import asyncio
import uuid
from app.database import AsyncSessionLocal
from app.models.machine import Category
from app.models.subscription import SubscriptionPlan
from sqlalchemy import select


CATEGORIES = [
    {"name": "Excavators",    "slug": "excavators",   "sort_order": 1, "description": "Hydraulic, mini, and crawler excavators"},
    {"name": "Cranes",        "slug": "cranes",        "sort_order": 2, "description": "Tower, mobile, pick-and-carry cranes"},
    {"name": "Bulldozers",    "slug": "bulldozers",    "sort_order": 3, "description": "Track and wheel bulldozers"},
    {"name": "Forklifts",     "slug": "forklifts",     "sort_order": 4, "description": "Electric and diesel forklifts"},
    {"name": "Loaders",       "slug": "loaders",       "sort_order": 5, "description": "Wheel loaders and backhoe loaders"},
    {"name": "Compactors",    "slug": "compactors",    "sort_order": 6, "description": "Soil, asphalt, plate compactors"},
    {"name": "Concrete",      "slug": "concrete",      "sort_order": 7, "description": "Mixers, pumps, batching plants"},
    {"name": "Piling",        "slug": "piling",        "sort_order": 8, "description": "Piling rigs and auger machines"},
    {"name": "Aerial Work",   "slug": "aerial-work",   "sort_order": 9, "description": "Boom lifts, scissor lifts, mast climbers"},
    {"name": "Trucks",        "slug": "trucks",        "sort_order": 10, "description": "Tipper, transit mixer, flatbed trucks"},
    {"name": "Graders",       "slug": "graders",       "sort_order": 11, "description": "Motor graders for road construction"},
    {"name": "Other",         "slug": "other",         "sort_order": 12, "description": "Other heavy machinery"},
]

SUBSCRIPTION_PLANS = [
    # ── Vendor Plans ──────────────────────────────────────────
    {
        "plan_code": "vendor_free",
        "name": "Vendor Free",
        "role": "vendor",
        "price_monthly": 0,
        "active_listing_limit": 5,
        "photos_per_listing": 3,
        "enquiry_limit_monthly": None,
        "wishlist_limit": None,
        "has_featured_boost": False,
        "boost_multiplier": 1.0,
        "has_full_analytics": False,
        "has_export": False,
        "has_daily_digest": False,
        "has_bulk_rfq": False,
        "has_priority_badge": False,
        "has_spec_download": False,
        "verified_badge_eligible": False,
        "is_active": True,
    },
    {
        "plan_code": "vendor_pro",
        "name": "Vendor Pro",
        "role": "vendor",
        "price_monthly": 4999,
        "active_listing_limit": 50,
        "photos_per_listing": 10,
        "enquiry_limit_monthly": None,
        "wishlist_limit": None,
        "has_featured_boost": True,
        "boost_multiplier": 2.0,
        "has_full_analytics": True,
        "has_export": True,
        "has_daily_digest": True,
        "has_bulk_rfq": False,
        "has_priority_badge": True,
        "has_spec_download": True,
        "verified_badge_eligible": True,
        "is_active": True,
    },
    {
        "plan_code": "vendor_enterprise",
        "name": "Vendor Enterprise",
        "role": "vendor",
        "price_monthly": 14999,
        "active_listing_limit": None,  # Unlimited
        "photos_per_listing": 20,
        "enquiry_limit_monthly": None,
        "wishlist_limit": None,
        "has_featured_boost": True,
        "boost_multiplier": 3.0,
        "has_full_analytics": True,
        "has_export": True,
        "has_daily_digest": True,
        "has_bulk_rfq": False,
        "has_priority_badge": True,
        "has_spec_download": True,
        "verified_badge_eligible": True,
        "is_active": True,
    },
    # ── Customer Plans ────────────────────────────────────────
    {
        "plan_code": "customer_free",
        "name": "Customer Free",
        "role": "customer",
        "price_monthly": 0,
        "active_listing_limit": None,
        "photos_per_listing": 0,
        "enquiry_limit_monthly": 5,
        "wishlist_limit": 10,
        "has_featured_boost": False,
        "boost_multiplier": 1.0,
        "has_full_analytics": False,
        "has_export": False,
        "has_daily_digest": False,
        "has_bulk_rfq": False,
        "has_priority_badge": False,
        "has_spec_download": False,
        "verified_badge_eligible": False,
        "is_active": True,
    },
    {
        "plan_code": "customer_business",
        "name": "Customer Business",
        "role": "customer",
        "price_monthly": 2999,
        "active_listing_limit": None,
        "photos_per_listing": 0,
        "enquiry_limit_monthly": None,  # Unlimited
        "wishlist_limit": None,
        "has_featured_boost": False,
        "boost_multiplier": 1.0,
        "has_full_analytics": True,
        "has_export": True,
        "has_daily_digest": True,
        "has_bulk_rfq": True,
        "has_priority_badge": False,
        "has_spec_download": True,
        "verified_badge_eligible": False,
        "is_active": True,
    },
    # ── Broker Plans ───────────────────────────────────────────
    {
        "plan_code": "broker_free",
        "name": "Broker Free",
        "role": "broker",
        "price_monthly": 0,
        "active_listing_limit": None,
        "photos_per_listing": 0,
        "enquiry_limit_monthly": 10,
        "wishlist_limit": 20,
        "has_featured_boost": False,
        "boost_multiplier": 1.0,
        "has_full_analytics": False,
        "has_export": False,
        "has_daily_digest": False,
        "has_bulk_rfq": False,
        "has_priority_badge": False,
        "has_spec_download": False,
        "verified_badge_eligible": False,
        "is_active": True,
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        print("Seeding categories...")
        for cat_data in CATEGORIES:
            exists = await db.execute(
                select(Category).where(Category.slug == cat_data["slug"])
            )
            if not exists.scalar_one_or_none():
                db.add(Category(id=uuid.uuid4(), **cat_data))

        print("Seeding subscription plans...")
        for plan_data in SUBSCRIPTION_PLANS:
            exists = await db.execute(
                select(SubscriptionPlan).where(SubscriptionPlan.plan_code == plan_data["plan_code"])
            )
            if not exists.scalar_one_or_none():
                db.add(SubscriptionPlan(id=uuid.uuid4(), **plan_data))

        await db.commit()
        print("✅ Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
