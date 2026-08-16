"""
Pydantic schemas for Subscriptions & Plans
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal


from uuid import UUID
class SubscriptionPlanResponse(BaseModel):
    id: UUID
    plan_code: str
    name: str
    role: str
    price_monthly: Decimal
    active_listing_limit: Optional[int] = None
    photos_per_listing: int
    enquiry_limit_monthly: Optional[int] = None
    wishlist_limit: Optional[int] = None
    has_featured_boost: bool
    boost_multiplier: float
    has_full_analytics: bool
    has_export: bool
    has_daily_digest: bool
    has_bulk_rfq: bool
    has_priority_badge: bool
    has_spec_download: bool
    verified_badge_eligible: bool
    razorpay_plan_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    plan_id: UUID
    status: str
    razorpay_subscription_id: Optional[UUID] = None
    razorpay_order_id: Optional[UUID] = None
    razorpay_payment_id: Optional[UUID] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    plan: Optional[SubscriptionPlanResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateOrderRequest(BaseModel):
    plan_id: UUID


class SubscribeRequest(BaseModel):
    plan_id: UUID
    razorpay_order_id: UUID
    razorpay_payment_id: UUID
    razorpay_signature: str


class CreateOrderResponse(BaseModel):
    razorpay_order_id: UUID
    amount: int
    currency: str
    key: str
    plan_name: str


class SubscriptionVerifyResponse(BaseModel):
    message: str
    plan_name: str


class PlanListResponse(BaseModel):
    vendor_plans: List[SubscriptionPlanResponse]
    customer_plans: List[SubscriptionPlanResponse]
    broker_plans: List[SubscriptionPlanResponse] = []
