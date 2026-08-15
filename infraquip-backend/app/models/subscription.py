"""
SQLAlchemy ORM Models — Subscription Plans & Subscriptions
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, Numeric, String, Text, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class PlanRole(str, enum.Enum):
    vendor = "vendor"
    customer = "customer"
    broker = "broker"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    expired = "expired"
    trialing = "trialing"
    past_due = "past_due"


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_code = Column(String(60), unique=True, nullable=False)
    # e.g. 'vendor_free' | 'vendor_pro' | 'vendor_enterprise' | 'customer_free' | 'customer_business'
    name = Column(String(100), nullable=False)
    role = Column(Enum(PlanRole), nullable=False)
    price_monthly = Column(Numeric(10, 2), nullable=False, default=0)

    # Limits — NULL = unlimited
    active_listing_limit = Column(Integer, nullable=True)
    photos_per_listing = Column(Integer, nullable=False, default=5)
    enquiry_limit_monthly = Column(Integer, nullable=True)
    wishlist_limit = Column(Integer, nullable=True)

    # Features
    has_featured_boost = Column(Boolean, default=False)
    boost_multiplier = Column(Numeric(3, 1), default=1.0)
    has_full_analytics = Column(Boolean, default=False)
    has_export = Column(Boolean, default=False)
    has_daily_digest = Column(Boolean, default=False)
    has_bulk_rfq = Column(Boolean, default=False)
    has_priority_badge = Column(Boolean, default=False)
    has_spec_download = Column(Boolean, default=False)
    verified_badge_eligible = Column(Boolean, default=False)

    # Razorpay
    razorpay_plan_id = Column(String(200), nullable=True)

    is_active = Column(Boolean, default=True)

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.active, nullable=False)
    razorpay_subscription_id = Column(String(200), unique=True, nullable=True)
    razorpay_customer_id = Column(String(200), nullable=True)
    razorpay_order_id = Column(String(200), nullable=True)
    razorpay_payment_id = Column(String(200), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
