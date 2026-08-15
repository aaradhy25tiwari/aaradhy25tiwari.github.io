"""
Pydantic schemas for User, Auth, and Profiles
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole


# ── Request Schemas ───────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=200)
    role: UserRole = UserRole.customer
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{9,14}$")

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# ── Response Schemas ──────────────────────────────────────────

class VendorProfileResponse(BaseModel):
    id: str
    company_name: str
    gstin: Optional[str] = None
    business_type: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    profile_photo_url: Optional[str] = None
    is_verified: bool
    response_rate: Optional[int] = None
    member_since: datetime
    total_views: int

    model_config = {"from_attributes": True}


class CustomerProfileResponse(BaseModel):
    id: str
    company_name: Optional[str] = None
    designation: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    model_config = {"from_attributes": True}


class BrokerProfileResponse(BaseModel):
    id: str
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    member_since: datetime

    model_config = {"from_attributes": True}


class SubscriptionSummaryResponse(BaseModel):
    plan_code: str
    plan_name: str
    status: str
    current_period_end: Optional[datetime] = None
    active_listing_limit: Optional[int] = None
    enquiry_limit_monthly: Optional[int] = None


class UserResponse(BaseModel):
    id: str
    email: str
    phone: Optional[str] = None
    full_name: str
    avatar_url: Optional[str] = None
    role: UserRole
    is_verified: bool
    is_banned: bool
    must_change_password: bool = False
    dark_mode_preference: str
    text_size_preference: str
    created_at: datetime
    updated_at: datetime
    vendor_profile: Optional[VendorProfileResponse] = None
    customer_profile: Optional[CustomerProfileResponse] = None
    broker_profile: Optional[BrokerProfileResponse] = None

    model_config = {"from_attributes": True}


# ── Update Schemas ────────────────────────────────────────────

class UpdateVendorProfileRequest(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=300)
    gstin: Optional[str] = Field(None, max_length=20)
    pan: Optional[str] = Field(None, max_length=15)
    business_type: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)


class UpdateCustomerProfileRequest(BaseModel):
    company_name: Optional[str] = Field(None, max_length=300)
    designation: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)


class UpdateBrokerProfileRequest(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=300)
    gstin: Optional[str] = Field(None, max_length=20)
    pan: Optional[str] = Field(None, max_length=15)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)


class UpdateUserPreferencesRequest(BaseModel):
    dark_mode_preference: Optional[str] = None
    text_size_preference: Optional[str] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=200)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{9,14}$")
