"""
Subscriptions Router — List plans, subscribe, handle Razorpay webhooks
"""
import uuid
import hmac
import hashlib
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DBSession
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionStatus
from app.schemas.subscription import (
    SubscriptionPlanResponse, SubscriptionResponse,
    CreateOrderRequest, CreateOrderResponse,
    SubscribeRequest, SubscriptionVerifyResponse,
)
from app.config import settings

router = APIRouter()


# ── GET /subscriptions/plans ───────────────────────────────────
@router.get("/plans")
async def list_plans(db: DBSession):
    """Return all active subscription plans grouped by role."""
    result = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.price_monthly)
    )
    plans = result.scalars().all()

    vendor_plans = []
    customer_plans = []
    broker_plans = []
    for p in plans:
        plan_data = SubscriptionPlanResponse(
            id=str(p.id),
            plan_code=p.plan_code,
            name=p.name,
            role=p.role.value if hasattr(p.role, "value") else p.role,
            price_monthly=p.price_monthly,
            active_listing_limit=p.active_listing_limit,
            photos_per_listing=p.photos_per_listing,
            enquiry_limit_monthly=p.enquiry_limit_monthly,
            wishlist_limit=p.wishlist_limit,
            has_featured_boost=p.has_featured_boost,
            boost_multiplier=float(p.boost_multiplier) if p.boost_multiplier else 1.0,
            has_full_analytics=p.has_full_analytics,
            has_export=p.has_export,
            has_daily_digest=p.has_daily_digest,
            has_bulk_rfq=p.has_bulk_rfq,
            has_priority_badge=p.has_priority_badge,
            has_spec_download=p.has_spec_download,
            verified_badge_eligible=p.verified_badge_eligible,
            razorpay_plan_id=p.razorpay_plan_id,
        )
        role_val = p.role.value if hasattr(p.role, "value") else p.role
        if role_val == "vendor":
            vendor_plans.append(plan_data)
        elif role_val == "broker":
            broker_plans.append(plan_data)
        else:
            customer_plans.append(plan_data)

    return {"vendor_plans": vendor_plans, "customer_plans": customer_plans, "broker_plans": broker_plans}


# ── GET /subscriptions/my ──────────────────────────────────────
@router.get("/my", response_model=SubscriptionResponse)
async def get_my_subscription(current_user: CurrentUser, db: DBSession):
    """Return the current user's active subscription."""
    result = await db.execute(
        select(Subscription)
        .options(selectinload(Subscription.plan))
        .where(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.active,
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        # Return default free plan info
        role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
        plan_code = {"vendor": "vendor_free", "broker": "broker_free"}.get(role_val, "customer_free")
        plan_result = await db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.plan_code == plan_code)
        )
        plan = plan_result.scalar_one_or_none()
        return SubscriptionResponse(
            id="",
            user_id=str(current_user.id),
            plan_id=str(plan.id) if plan else "",
            status="active",
            plan=SubscriptionPlanResponse(
                id=str(plan.id), plan_code=plan.plan_code, name=plan.name,
                role=plan.role.value if hasattr(plan.role, "value") else plan.role,
                price_monthly=plan.price_monthly, photos_per_listing=plan.photos_per_listing,
                active_listing_limit=plan.active_listing_limit,
                enquiry_limit_monthly=plan.enquiry_limit_monthly,
                wishlist_limit=plan.wishlist_limit,
                has_featured_boost=plan.has_featured_boost,
                boost_multiplier=float(plan.boost_multiplier) if plan.boost_multiplier else 1.0,
                has_full_analytics=plan.has_full_analytics,
                has_export=plan.has_export,
                has_daily_digest=plan.has_daily_digest,
                has_bulk_rfq=plan.has_bulk_rfq,
                has_priority_badge=plan.has_priority_badge,
                has_spec_download=plan.has_spec_download,
                verified_badge_eligible=plan.verified_badge_eligible,
            ) if plan else None,
            created_at=sub.created_at if sub else None,
        )

    return SubscriptionResponse(
        id=str(sub.id),
        user_id=str(sub.user_id),
        plan_id=str(sub.plan_id),
        status=sub.status.value if hasattr(sub.status, "value") else sub.status,
        razorpay_subscription_id=sub.razorpay_subscription_id,
        razorpay_order_id=sub.razorpay_order_id,
        razorpay_payment_id=sub.razorpay_payment_id,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        plan=SubscriptionPlanResponse(
            id=str(sub.plan.id), plan_code=sub.plan.plan_code, name=sub.plan.name,
            role=sub.plan.role.value if hasattr(sub.plan.role, "value") else sub.plan.role,
            price_monthly=sub.plan.price_monthly,
            photos_per_listing=sub.plan.photos_per_listing,
            active_listing_limit=sub.plan.active_listing_limit,
            enquiry_limit_monthly=sub.plan.enquiry_limit_monthly,
            wishlist_limit=sub.plan.wishlist_limit,
            has_featured_boost=sub.plan.has_featured_boost,
            boost_multiplier=float(sub.plan.boost_multiplier) if sub.plan.boost_multiplier else 1.0,
            has_full_analytics=sub.plan.has_full_analytics,
            has_export=sub.plan.has_export,
            has_daily_digest=sub.plan.has_daily_digest,
            has_bulk_rfq=sub.plan.has_bulk_rfq,
            has_priority_badge=sub.plan.has_priority_badge,
            has_spec_download=sub.plan.has_spec_download,
            verified_badge_eligible=sub.plan.verified_badge_eligible,
        ) if sub.plan else None,
        created_at=sub.created_at,
    )


# ── POST /subscriptions/create-order ───────────────────────────
@router.post("/create-order", response_model=CreateOrderResponse)
async def create_subscription_order(
    payload: CreateOrderRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Create a Razorpay order for subscription purchase."""
    import razorpay

    plan_result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id == uuid.UUID(payload.plan_id))
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    try:
        order_data = {
            "amount": int(float(plan.price_monthly) * 100),  # Razorpay expects paise
            "currency": "INR",
            "receipt": f"sub_{current_user.id}_{plan.plan_code}",
            "notes": {"plan_id": str(plan.id), "user_id": str(current_user.id)},
        }
        order = client.order.create(order_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {str(e)}")

    # Store order reference
    existing = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.active,
        )
    )
    sub = existing.scalar_one_or_none()
    if sub:
        sub.razorpay_order_id = order["id"]
        await db.commit()

    return {
        "order_id": order["id"],
        "amount": int(float(plan.price_monthly) * 100),
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "plan_name": plan.name,
    }


# ── POST /subscriptions/verify ─────────────────────────────────
@router.post("/verify", response_model=SubscriptionVerifyResponse)
async def verify_payment(payload: SubscribeRequest, current_user: CurrentUser, db: DBSession):
    """Verify Razorpay payment signature and activate subscription."""

    # Validate signature
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    # Get plan
    plan_result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id == uuid.UUID(payload.plan_id))
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    # Deactivate existing active subscriptions
    existing = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.active,
        )
    )
    for sub in existing.scalars().all():
        sub.status = SubscriptionStatus.cancelled
        sub.cancelled_at = None

    # Create new subscription
    from datetime import datetime, timedelta
    new_sub = Subscription(
        id=uuid.uuid4(),
        user_id=current_user.id,
        plan_id=plan.id,
        status=SubscriptionStatus.active,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        amount_paid=plan.price_monthly,
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30),
    )
    db.add(new_sub)
    await db.commit()

    return SubscriptionVerifyResponse(
        message=f"Subscription to {plan.name} activated!",
        plan_name=plan.name,
    )


# ── POST /subscriptions/verify-payment (alias for RazorpayButton)
@router.post("/verify-payment", response_model=SubscriptionVerifyResponse)
async def verify_payment_alias(payload: SubscribeRequest, current_user: CurrentUser, db: DBSession):
    """Alias of /verify for compatibility with frontend RazorpayButton."""
    return await verify_payment(payload, current_user, db)


# ── POST /subscriptions/webhook ────────────────────────────────
@router.post("/webhook")
async def razorpay_webhook(request: Request, db: DBSession):
    """Handle Razorpay subscription lifecycle webhooks."""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = await request.json()
    event_type = event.get("event")

    if event_type == "subscription.charged":
        # Subscription renewed — extend period
        razorpay_sub_id = event["payload"]["subscription"]["entity"]["id"]
        result = await db.execute(
            select(Subscription).where(Subscription.razorpay_subscription_id == razorpay_sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub and sub.current_period_end:
            from datetime import timedelta
            sub.current_period_end = sub.current_period_end + timedelta(days=30)
            await db.commit()

    elif event_type == "subscription.cancelled":
        razorpay_sub_id = event["payload"]["subscription"]["entity"]["id"]
        result = await db.execute(
            select(Subscription).where(Subscription.razorpay_subscription_id == razorpay_sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = SubscriptionStatus.cancelled
            await db.commit()

    return {"received": True}
