"""
SQLAlchemy ORM Models — Users, Profiles, Roles
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    vendor = "vendor"
    customer = "customer"
    broker = "broker"
    admin = "admin"


class TextSizePreference(str, enum.Enum):
    normal = "normal"
    large = "large"
    xlarge = "xlarge"


class DarkModePreference(str, enum.Enum):
    system = "system"
    light = "light"
    dark = "dark"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Supabase Auth UID — same UUID as Supabase auth.users.id
    auth_uid = Column(UUID(as_uuid=True), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    full_name = Column(String(200), nullable=False)
    avatar_url = Column(Text, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.customer)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_banned = Column(Boolean, default=False, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    dark_mode_preference = Column(
        Enum(DarkModePreference, name="darkpreference"), default=DarkModePreference.system
    )
    text_size_preference = Column(
        Enum(TextSizePreference, name="textpreference"), default=TextSizePreference.normal
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────
    vendor_profile = relationship("VendorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    customer_profile = relationship("CustomerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    broker_profile = relationship("BrokerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    machines = relationship("Machine", back_populates="vendor", foreign_keys="Machine.vendor_id")
    sent_enquiries = relationship("Enquiry", back_populates="customer", foreign_keys="Enquiry.customer_id")
    received_enquiries = relationship("Enquiry", back_populates="vendor", foreign_keys="Enquiry.vendor_id")
    wishlists = relationship("Wishlist", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"


class VendorProfile(Base):
    __tablename__ = "vendor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(300), nullable=False)
    gstin = Column(String(20), nullable=True)
    pan = Column(String(15), nullable=True)
    business_type = Column(
        Enum("individual", "company", "partnership", name="businesstype"),
        nullable=True
    )
    description = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    profile_photo_url = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    response_rate = Column(Integer, nullable=True)  # percentage 0-100
    member_since = Column(DateTime(timezone=True), server_default=func.now())
    total_views = Column(Integer, default=0)

    user = relationship("User", back_populates="vendor_profile")


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(300), nullable=True)
    designation = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    corporate_id = Column(String(50), nullable=True)

    user = relationship("User", back_populates="customer_profile")


class BrokerProfile(Base):
    __tablename__ = "broker_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(300), nullable=True)
    gstin = Column(String(20), nullable=True)
    pan = Column(String(15), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    member_since = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="broker_profile")
