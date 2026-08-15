"""
Pydantic schemas for Subscriptions & Plans
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal


class SubscriptionPlanResponse(BaseModel):
    id: str
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
    razorpay_plan_id: Optional[str] = None

    model_config = {"from_attributes": True}


class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan_id: str
    status: str
    razorpay_subscription_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    plan: Optional[SubscriptionPlanResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateOrderRequest(BaseModel):
    plan_id: str


class SubscribeRequest(BaseModel):
    plan_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class CreateOrderResponse(BaseModel):
    razorpay_order_id: str
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
