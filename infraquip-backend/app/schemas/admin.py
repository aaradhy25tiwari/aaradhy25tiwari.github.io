"""
Pydantic schemas for Admin operations
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


from uuid import UUID
class ReviewDecisionRequest(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    rejection_reason: Optional[str] = None


class ReviewQueueItem(BaseModel):
    id: UUID
    slug: str
    title: str
    make: str
    model: str
    vendor_name: str
    city: str
    state: str
    submitted_at: datetime
    created_at: Optional[datetime] = None
    primary_image: Optional[str] = None
    category_name: Optional[str] = None
    year_of_manufacture: Optional[int] = None
    is_rto_registered: bool = False
    registration_number: Optional[str] = None
    chassis_number: Optional[str] = None
    machine_serial_no: Optional[str] = None
    serial_plate_photo_url: Optional[str] = None
    has_custom_terms: bool = False
    has_rental_terms: bool = False
    has_sale_terms: bool = False
    rental_term_sheet: Optional[Any] = None
    sale_term_sheet: Optional[Any] = None


class ReviewQueueResponse(BaseModel):
    results: List[ReviewQueueItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AdminStatsResponse(BaseModel):
    total_users: int
    total_listings: int
    pending_review: int
    approved_listings: int
    total_vendors: Optional[int] = None
    total_customers: Optional[int] = None
    total_brokers: Optional[int] = None
    total_enquiries: Optional[int] = None
    total_revenue: Optional[float] = None


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_verified: bool
    is_banned: bool
    is_active: bool = True
    failed_login_attempts: Optional[int] = 0
    reactivation_requested: Optional[bool] = False
    reactivation_requested_at: Optional[datetime] = None
    reactivation_message: Optional[str] = None
    created_at: datetime


class AdminUserListResponse(BaseModel):
    results: List[AdminUserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
