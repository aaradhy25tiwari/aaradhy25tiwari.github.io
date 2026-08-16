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
    primary_image: Optional[str] = None
    category_name: Optional[str] = None


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
    created_at: datetime


class AdminUserListResponse(BaseModel):
    results: List[AdminUserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
