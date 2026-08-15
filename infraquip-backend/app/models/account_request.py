"""
AccountRequest model — stores pre-registration requests awaiting admin approval
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    String, Text, func
)
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class AccountRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AccountRequest(Base):
    __tablename__ = "account_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    role = Column(
        Enum("vendor", "customer", "broker", name="account_request_role_enum"),
        nullable=False,
        default="customer",
    )
    company_name = Column(String(300), nullable=True)
    city = Column(String(100), nullable=True)
    gstin_pan = Column(String(30), nullable=True)
    message = Column(Text, nullable=True)  # "Describe your need"

    status = Column(
        Enum(AccountRequestStatus),
        nullable=False,
        default=AccountRequestStatus.pending,
        index=True,
    )
    rejection_reason = Column(Text, nullable=True)

    # Set when approved
    supabase_user_id = Column(UUID(as_uuid=True), nullable=True)

    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<AccountRequest {self.email} [{self.status}]>"
