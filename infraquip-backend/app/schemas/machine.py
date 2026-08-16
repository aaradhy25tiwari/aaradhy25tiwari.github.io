"""
Machine (Listing) Schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from app.models.machine import (
    MachineCondition, ListingType, MachineStatus, MinRentalDuration,
    MachineRunningCondition, MachineOwnershipType
)


# ── Image / Document Schemas ──────────────────────────────────

class MachineImageResponse(BaseModel):
    id: str
    storage_path: str
    display_url: str
    alt_text: Optional[str] = None
    sort_order: int
    is_primary: bool
    model_config = {"from_attributes": True}


# ── Vendor Summary (on listing) ───────────────────────────────

class VendorSummary(BaseModel):
    id: str
    full_name: str
    company_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool = False
    response_rate: Optional[int] = None
    member_since: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Create / Update Schemas ───────────────────────────────────

class MachineCreateRequest(BaseModel):
    category_id: str
    sub_category_id: Optional[str] = None
    title: str = Field(min_length=5, max_length=300)
    make: str = Field(min_length=2, max_length=100)
    model: str = Field(min_length=1, max_length=200)
    year_of_manufacture: int = Field(ge=1990, le=2027)
    condition: MachineCondition
    capacity_specs: str = Field(min_length=5, max_length=500)
    specifications: Optional[Dict[str, Any]] = None
    description: str = Field(min_length=100, max_length=2000)
    listing_type: ListingType
    min_rental_duration: Optional[MinRentalDuration] = MinRentalDuration.one_day
    
    # New v1.2 fields
    running_condition: MachineRunningCondition = MachineRunningCondition.running
    hmr: Optional[int] = Field(None, ge=0, le=999999)
    ownership_type: MachineOwnershipType = MachineOwnershipType.owner

    # Pricing
    rental_price_daily: Optional[float] = Field(None, gt=0)
    rental_price_weekly: Optional[float] = Field(None, gt=0)
    rental_price_monthly: Optional[float] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, gt=0)
    contact_for_price: bool = False

    # Location
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    address_line: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

    @field_validator("rental_price_daily", "rental_price_weekly", "rental_price_monthly", "purchase_price")
    @classmethod
    def validate_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Price must be positive")
        return v
        
    @field_validator("hmr")
    @classmethod
    def validate_hmr(cls, v, info):
        # We need to access listing_type if available. Pydantic v2 passes data in info.data
        listing_type = info.data.get("listing_type")
        if listing_type in (ListingType.sale, ListingType.both) and v is None:
            raise ValueError("Hours Meter Reading (HMR) is required for sale listings")
        return v


class MachineUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=300)
    make: Optional[str] = Field(None, min_length=2, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=200)
    year_of_manufacture: Optional[int] = Field(None, ge=1990, le=2027)
    condition: Optional[MachineCondition] = None
    capacity_specs: Optional[str] = Field(None, min_length=5, max_length=500)
    specifications: Optional[Dict[str, Any]] = None
    description: Optional[str] = Field(None, min_length=100, max_length=2000)
    listing_type: Optional[ListingType] = None
    min_rental_duration: Optional[MinRentalDuration] = None
    
    running_condition: Optional[MachineRunningCondition] = None
    hmr: Optional[int] = Field(None, ge=0, le=999999)
    ownership_type: Optional[MachineOwnershipType] = None
    rental_price_daily: Optional[float] = Field(None, gt=0)
    rental_price_weekly: Optional[float] = Field(None, gt=0)
    rental_price_monthly: Optional[float] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, gt=0)
    contact_for_price: Optional[bool] = None
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    address_line: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    availability: Optional[bool] = None


# ── Response Schemas ──────────────────────────────────────────

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    icon_url: Optional[str] = None
    description: Optional[str] = None
    listing_count: Optional[int] = None
    model_config = {"from_attributes": True}


class MachineListItemResponse(BaseModel):
    """Lightweight response for search results / cards."""
    id: str
    slug: str
    title: str
    make: str
    model: str
    year_of_manufacture: int
    condition: MachineCondition
    listing_type: ListingType
    running_condition: MachineRunningCondition
    hmr: Optional[int] = None
    ownership_type: MachineOwnershipType
    availability: bool
    city: str
    state: str
    rental_price_daily: Optional[float] = None
    purchase_price: Optional[float] = None
    contact_for_price: bool
    views_count: int
    enquiries_count: int
    primary_image: Optional[MachineImageResponse] = None
    vendor_name: str = ""
    vendor_city: Optional[str] = None
    vendor_is_verified: bool = False
    distance_km: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_wishlisted: Optional[bool] = None
    model_config = {"from_attributes": True}


class MachineDetailResponse(BaseModel):
    """Full detail response for listing page."""
    id: str
    slug: str
    title: str
    make: str
    model: str
    year_of_manufacture: int
    condition: MachineCondition
    running_condition: MachineRunningCondition
    hmr: Optional[int] = None
    ownership_type: MachineOwnershipType
    capacity_specs: str
    specifications: Optional[Dict[str, Any]] = None
    description: str
    listing_type: ListingType
    min_rental_duration: Optional[MinRentalDuration] = None
    availability: bool
    status: MachineStatus
    rental_price_daily: Optional[float] = None
    rental_price_weekly: Optional[float] = None
    rental_price_monthly: Optional[float] = None
    purchase_price: Optional[float] = None
    contact_for_price: bool
    city: str
    state: str
    address_line: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    views_count: int
    enquiries_count: int
    images: List[MachineImageResponse] = []
    vendor: Optional[VendorSummary] = None
    category_name: Optional[str] = None
    avg_rating: Optional[float] = None
    review_count: Optional[int] = None
    is_wishlisted: Optional[bool] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class PaginatedMachineResponse(BaseModel):
    results: List[MachineListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
    city: Optional[str] = None
