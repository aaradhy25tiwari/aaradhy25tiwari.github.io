"""
Create deterministic test users (one per role) for local/dev login.
Run with: venv/Scripts/python -m app.seed_test_users

Log in on the frontend with these email + password combos:
    vendor@infraquip.test / Test@1234
    customer@infraquip.test / Test@1234
    broker@infraquip.test  / Test@1234
    admin@infraquip.test   / Test@1234

Idempotent: existing emails are left untouched.
"""
import asyncio
import uuid

from sqlalchemy import select
from supabase import create_client

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole, VendorProfile, CustomerProfile, BrokerProfile
from app.models.subscription import Subscription, SubscriptionPlan

TEST_PASSWORD = "Test@1234"


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


TEST_USERS = [
    {
        "name": "Vendor",
        "email": "vendor@infraquip.test",
        "role": UserRole.vendor,
        "full_name": "Ramesh Verma",
        "phone": "+919876000001",
        "company": "Verma Earthmovers",
        "city": "Pune",
        "plan": "vendor_free",
    },
    {
        "name": "Customer",
        "email": "customer@infraquip.test",
        "role": UserRole.customer,
        "full_name": "Anita Desai",
        "phone": "+919876000002",
        "company": "Desai Construction Pvt. Ltd.",
        "city": "Pune",
        "plan": "customer_free",
    },
    {
        "name": "Broker",
        "email": "broker@infraquip.test",
        "role": UserRole.broker,
        "full_name": "Suresh Gupta",
        "phone": "+919876000003",
        "company": "Gupta Machinery Brokerage",
        "city": "Mumbai",
        "plan": "broker_free",
    },
    {
        "name": "Admin",
        "email": "admin@infraquip.test",
        "role": UserRole.admin,
        "full_name": "Platform Admin",
        "phone": None,
        "company": None,
        "city": None,
        "plan": None,
    },
]


async def create_test_user(db, supabase, cfg):
    email = cfg["email"]

    exists = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if exists:
        print(f"  skip  {email} (already exists)")
        return

    # Reuse an existing Supabase auth account if present, else create one
    auth_uid = None
    try:
        existing_auth = [u for u in supabase.auth.admin.list_users() if u.email == email]
        if existing_auth:
            auth_uid = uuid.UUID(existing_auth[0].id)
    except Exception:
        pass

    if auth_uid is None:
        # Create the Supabase auth account (auto-confirmed, known password)
        resp = supabase.auth.admin.create_user({
            "email": email,
            "password": TEST_PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": cfg["full_name"], "role": cfg["role"].value},
        })
        auth_uid = uuid.UUID(resp.user.id)

    user = User(
        auth_uid=auth_uid,
        email=email,
        full_name=cfg["full_name"],
        phone=cfg["phone"],
        role=cfg["role"],
        is_verified=True,            # pre-approved for testing
        must_change_password=False,  # allow direct login with the known password
    )
    db.add(user)
    await db.flush()

    role = cfg["role"]
    if role == UserRole.vendor:
        db.add(VendorProfile(
            user_id=user.id, company_name=cfg["company"],
            city=cfg["city"], is_verified=True,
        ))
    elif role == UserRole.customer:
        db.add(CustomerProfile(
            user_id=user.id, company_name=cfg["company"], city=cfg["city"],
        ))
    elif role == UserRole.broker:
        db.add(BrokerProfile(
            user_id=user.id, company_name=cfg["company"],
            city=cfg["city"], description="Test broker account",
        ))

    if cfg["plan"]:
        plan_result = await db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.plan_code == cfg["plan"])
        )
        plan = plan_result.scalar_one_or_none()
        if plan:
            db.add(Subscription(user_id=user.id, plan_id=plan.id, status="active"))

    await db.commit()
    print(f"  create {email}  role={cfg['name'].lower()}")


async def seed_test_users():
    supabase = get_supabase()
    async with AsyncSessionLocal() as db:
        for data in TEST_USERS:
            await create_test_user(db, supabase, data)


if __name__ == "__main__":
    asyncio.run(seed_test_users())
