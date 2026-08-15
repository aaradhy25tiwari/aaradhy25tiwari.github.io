"""
SQLAlchemy ORM Models — Enquiries & Messages
"""
import uuid
import enum
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, String, Text, func, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class RequirementType(str, enum.Enum):
    rent = "rent"
    buy = "buy"


class EnquiryStatus(str, enum.Enum):
    pending = "pending"
    replied = "replied"
    closed = "closed"


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="SET NULL"), nullable=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ── Enquiry Fields ─────────────────────────────────────────
    requirement_type = Column(Enum(RequirementType), nullable=False)
    customer_company = Column(String(300), nullable=True)
    required_from = Column(Date, nullable=True)
    required_duration_days = Column(Integer, nullable=True)
    location_of_use = Column(Text, nullable=True)
    message = Column(Text, nullable=True)

    # ── Status & Tracking ─────────────────────────────────────
    status = Column(Enum(EnquiryStatus), default=EnquiryStatus.pending, nullable=False)
    is_read_by_vendor = Column(Boolean, default=False)

    # ── Timestamps ────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────
    machine = relationship("Machine", back_populates="enquiries")
    vendor = relationship("User", back_populates="received_enquiries", foreign_keys=[vendor_id])
    customer = relationship("User", back_populates="sent_enquiries", foreign_keys=[customer_id])
    messages = relationship(
        "EnquiryMessage", back_populates="enquiry",
        cascade="all, delete-orphan", order_by="EnquiryMessage.created_at"
    )
    review = relationship("Review", back_populates="enquiry", uselist=False)

    __table_args__ = (
        Index("idx_enquiries_vendor_id", "vendor_id"),
        Index("idx_enquiries_customer_id", "customer_id"),
        Index("idx_enquiries_machine_id", "machine_id"),
        Index("idx_enquiries_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<Enquiry {self.id} [{self.status}]>"


class EnquiryMessage(Base):
    __tablename__ = "enquiry_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enquiry_id = Column(UUID(as_uuid=True), ForeignKey("enquiries.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_text = Column(Text, nullable=False)
    attachment_url = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    enquiry = relationship("Enquiry", back_populates="messages")
    sender = relationship("User")

    __table_args__ = (
        Index("idx_enquiry_messages_enquiry_id", "enquiry_id"),
    )
