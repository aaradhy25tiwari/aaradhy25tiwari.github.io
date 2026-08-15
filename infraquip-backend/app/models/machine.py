"""
SQLAlchemy ORM Models — Machines (Equipment Listings)
"""
import uuid
import enum
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, Numeric, String, Text, func, Index, Float
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from sqlalchemy import DDL, event
from app.database import Base


class MachineCondition(str, enum.Enum):
    new = "new"
    excellent = "excellent"
    good = "good"
    fair = "fair"


class ListingType(str, enum.Enum):
    rent = "rent"
    sale = "sale"
    both = "both"


class MachineRunningCondition(str, enum.Enum):
    running = "running"
    not_running = "not_running"


class MachineOwnershipType(str, enum.Enum):
    owner = "owner"
    dealer = "dealer"


class MachineStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    paused = "paused"
    deleted = "deleted"


class MinRentalDuration(str, enum.Enum):
    one_day = "1_day"
    one_week = "1_week"
    one_month = "1_month"


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(120), unique=True, nullable=False)
    icon_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    sub_categories = relationship("SubCategory", back_populates="category", cascade="all, delete-orphan")
    machines = relationship("Machine", back_populates="category")


class SubCategory(Base):
    __tablename__ = "sub_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    slug = Column(String(120), nullable=False)

    category = relationship("Category", back_populates="sub_categories")
    machines = relationship("Machine", back_populates="sub_category")

    __table_args__ = (
        Index("idx_sub_categories_category_slug", "category_id", "slug", unique=True),
    )


class Machine(Base):
    __tablename__ = "machines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    sub_category_id = Column(UUID(as_uuid=True), ForeignKey("sub_categories.id"), nullable=True)

    # ── Slug (URL) ────────────────────────────────────────────
    slug = Column(String(300), unique=True, nullable=False)

    # ── Core Info ─────────────────────────────────────────────
    title = Column(String(300), nullable=False)
    make = Column(String(100), nullable=False)        # Brand: JCB, CAT, CASE...
    model = Column(String(200), nullable=False)
    year_of_manufacture = Column(Integer, nullable=False)
    condition = Column(Enum(MachineCondition), nullable=False)
    capacity_specs = Column(Text, nullable=False)     # Human-readable summary
    specifications = Column(JSONB, nullable=True)     # Flexible: {engine_hp, dig_depth...}
    description = Column(Text, nullable=False)        # 100-2000 chars

    # ── Listing Config ────────────────────────────────────────
    listing_type = Column(Enum(ListingType), nullable=False)
    min_rental_duration = Column(Enum(MinRentalDuration), default=MinRentalDuration.one_day)
    availability = Column(Boolean, default=True)
    status = Column(Enum(MachineStatus), default=MachineStatus.pending, nullable=False)
    rejection_reason = Column(Text, nullable=True)

    # ── New v1.2 Fields ───────────────────────────────────────
    running_condition = Column(Enum(MachineRunningCondition), default=MachineRunningCondition.running, nullable=False)
    hmr = Column(Integer, nullable=True) # Hours Meter Reading
    ownership_type = Column(Enum(MachineOwnershipType), default=MachineOwnershipType.owner, nullable=False)

    # ── Pricing ───────────────────────────────────────────────
    rental_price_daily = Column(Numeric(12, 2), nullable=True)
    rental_price_weekly = Column(Numeric(12, 2), nullable=True)
    rental_price_monthly = Column(Numeric(12, 2), nullable=True)
    purchase_price = Column(Numeric(14, 2), nullable=True)
    contact_for_price = Column(Boolean, default=False)

    # ── Location ──────────────────────────────────────────────
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    address_line = Column(Text, nullable=True)
    location = Column(Geometry("POINT", srid=4326), nullable=True)  # PostGIS
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # ── Full-Text Search ──────────────────────────────────────
    search_vector = Column(TSVECTOR, nullable=True)

    # ── Analytics (denormalized counters for performance) ─────
    views_count = Column(Integer, default=0)
    enquiries_count = Column(Integer, default=0)
    wishlist_count = Column(Integer, default=0)

    # ── Timestamps ────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    vendor = relationship("User", back_populates="machines", foreign_keys=[vendor_id])
    category = relationship("Category", back_populates="machines")
    sub_category = relationship("SubCategory", back_populates="machines")
    images = relationship("MachineImage", back_populates="machine", cascade="all, delete-orphan", order_by="MachineImage.sort_order")
    documents = relationship("MachineDocument", back_populates="machine", cascade="all, delete-orphan")
    enquiries = relationship("Enquiry", back_populates="machine")
    wishlists = relationship("Wishlist", back_populates="machine")
    reviews = relationship("Review", back_populates="machine")
    analytics = relationship("MachineAnalytics", back_populates="machine", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_machines_vendor_id", "vendor_id"),
        Index("idx_machines_category_id", "category_id"),
        Index("idx_machines_status", "status"),
        Index("idx_machines_listing_type", "listing_type"),
        Index("idx_machines_availability", "availability"),
        Index("idx_machines_city", "city"),
        Index("idx_machines_running_cond", "running_condition"),
        Index("idx_machines_ownership", "ownership_type"),
        Index("idx_machines_search_vector", "search_vector", postgresql_using="gin"),
    )

    def __repr__(self) -> str:
        return f"<Machine {self.title} [{self.status}]>"


class MachineImage(Base):
    __tablename__ = "machine_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    storage_path = Column(Text, nullable=False)   # Supabase Storage path
    display_url = Column(Text, nullable=True)     # Cached signed URL
    alt_text = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    file_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    machine = relationship("Machine", back_populates="images")


class MachineDocument(Base):
    __tablename__ = "machine_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    doc_type = Column(String(50), nullable=True)  # 'inspection_report'|'insurance'|'ownership'
    storage_path = Column(Text, nullable=False)
    original_filename = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    machine = relationship("Machine", back_populates="documents")
