"""
SQLAlchemy ORM Models — Reviews, Wishlists, Notifications, Analytics, Audit Logs
"""
import uuid
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, Numeric, SmallInteger, String, Text, func, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from app.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    enquiry_id = Column(UUID(as_uuid=True), ForeignKey("enquiries.id", ondelete="CASCADE"), unique=True, nullable=False)

    # ── Ratings ───────────────────────────────────────────────
    rating_overall = Column(SmallInteger, nullable=False)       # 1–5
    rating_condition = Column(SmallInteger, nullable=False)     # 1–5
    rating_communication = Column(SmallInteger, nullable=False) # 1–5
    review_text = Column(Text, nullable=True)                   # 50–500 chars, optional

    is_visible = Column(Boolean, default=True)  # admin can hide
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    machine = relationship("Machine", back_populates="reviews")
    vendor = relationship("User", foreign_keys=[vendor_id])
    customer = relationship("User", foreign_keys=[customer_id])
    enquiry = relationship("Enquiry", back_populates="review")

    __table_args__ = (
        Index("idx_reviews_machine_id", "machine_id"),
        Index("idx_reviews_vendor_id", "vendor_id"),
    )


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="wishlists")
    machine = relationship("Machine", back_populates="wishlists")

    __table_args__ = (
        UniqueConstraint("user_id", "machine_id", name="uq_wishlist_user_machine"),
        Index("idx_wishlist_user_id", "user_id"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(60), nullable=False)
    # Types: 'enquiry_received' | 'enquiry_replied' | 'listing_approved'
    #        'listing_rejected' | 'subscription_expiry' | 'new_message'
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(Text, nullable=True)  # Deep-link URL
    is_read = Column(Boolean, default=False)
    metadata_json = Column("metadata", JSONB, nullable=True)  # {machine_id, enquiry_id, etc.}
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("idx_notifications_user_id", "user_id"),
        Index("idx_notifications_is_read", "is_read"),
    )


class MachineAnalytics(Base):
    """Daily rollup table — updated by background jobs."""
    __tablename__ = "machine_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    views = Column(Integer, default=0)
    enquiries = Column(Integer, default=0)
    wishlist_adds = Column(Integer, default=0)

    machine = relationship("Machine", back_populates="analytics")

    __table_args__ = (
        UniqueConstraint("machine_id", "date", name="uq_machine_analytics_machine_date"),
        Index("idx_machine_analytics_machine_id", "machine_id"),
    )


class PlatformAnalytics(Base):
    """Daily platform-wide rollup — updated nightly."""
    __tablename__ = "platform_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date, unique=True, nullable=False)
    dau = Column(Integer, default=0)
    new_users = Column(Integer, default=0)
    new_listings = Column(Integer, default=0)
    total_enquiries = Column(Integer, default=0)
    total_revenue = Column(Numeric(14, 2), default=0)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    # e.g. 'listing_approved' | 'user_banned' | 'subscription_overridden'
    entity_type = Column(String(60), nullable=True)  # 'machine' | 'user' | 'subscription'
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    metadata_json = Column("metadata", JSONB, nullable=True)
    ip_address = Column(INET, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actor = relationship("User", foreign_keys=[actor_id])

    __table_args__ = (
        Index("idx_audit_logs_actor_id", "actor_id"),
        Index("idx_audit_logs_created_at", "created_at"),
    )
