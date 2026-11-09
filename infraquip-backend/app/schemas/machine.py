"""
Machine (Listing) Schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, field_validator, model_validator
from app.models.machine import (
    MachineCondition, ListingType, MachineStatus, MinRentalDuration,
    MachineRunningCondition, MachineOwnershipType
)


# ── Image / Document Schemas ──────────────────────────────────

from uuid import UUID
class MachineImageResponse(BaseModel):
    id: UUID
    storage_path: str
    display_url: str
    alt_text: Optional[str] = None
    sort_order: int
    is_primary: bool
    model_config = {"from_attributes": True}


# ── Vendor Summary (on listing) ───────────────────────────────

class VendorSummary(BaseModel):
    id: Union[UUID, str]
    full_name: str
    company_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool = False
    response_rate: Optional[int] = None
    member_since: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Detailed Term Sheets ──────────────────────────────────────

class RentalTermSheet(BaseModel):
    fuel_included: bool = False  # Wet lease vs Dry lease
    operators_included: bool = True
    operator_count: int = Field(default=1, ge=0, le=10)
    operator_shift_type: Literal[
        "single_shift_8h", "single_shift_10h", "double_shift_16h", "24h_continuous"
    ] = "single_shift_8h"
    working_hours_per_day: int = Field(default=8, ge=1, le=24)
    working_days_per_month: int = Field(default=26, ge=1, le=31)
    monthly_hours_limit: int = Field(default=208, ge=1, le=744)
    overtime_rate_hourly: Optional[float] = Field(default=None, ge=0, le=100000)
    mob_demob_type: Literal[
        "customer_actuals", "fixed_charge", "free_over_3months"
    ] = "customer_actuals"
    mob_demob_charge: Optional[float] = Field(default=None, ge=0, le=10000000)
    operator_accommodation: Literal[
        "customer_provides", "vendor_provided", "not_applicable"
    ] = "customer_provides"
    operator_food: Literal[
        "customer_provides", "vendor_provided", "not_applicable"
    ] = "customer_provides"
    maintenance_sla_hours: int = Field(default=24, ge=1, le=168)
    security_deposit_months: Optional[float] = Field(default=1.0, ge=0, le=24)
    advance_rent_months: Optional[float] = Field(default=1.0, ge=0, le=24)
    special_terms: Optional[str] = Field(default=None, max_length=2000)
    model_config = {"from_attributes": True}


class SaleTermSheet(BaseModel):
    hypothecation_status: Literal[
        "no_loan", "loan_active_vendor_clears", "bank_noc_in_hand"
    ] = "no_loan"
    rto_noc_responsibility: Literal[
        "vendor_provided", "customer_responsibility", "not_applicable_non_rto"
    ] = "vendor_provided"
    tax_gst_status: Literal[
        "18_percent_extra", "included", "exempt"
    ] = "18_percent_extra"
    inspection_allowed: bool = True
    mechanic_check_allowed: bool = True
    tyre_track_wear_percent: Optional[int] = Field(default=None, ge=0, le=100)
    engine_condition: Optional[Literal[
        "excellent", "good", "fair", "needs_minor_service"
    ]] = "excellent"
    hydraulic_condition: Optional[Literal[
        "normal", "leak_free", "serviced", "needs_attention"
    ]] = "normal"
    token_deposit_percent: Optional[int] = Field(default=10, ge=0, le=100)
    balance_payment_terms: Literal[
        "on_inspection_and_handover", "prior_to_dispatch"
    ] = "on_inspection_and_handover"
    special_terms: Optional[str] = Field(default=None, max_length=2000)
    model_config = {"from_attributes": True}


# ── Create / Update Schemas ───────────────────────────────────

class MachineCreateRequest(BaseModel):
    category_id: UUID
    sub_category_id: Optional[UUID] = None
    title: str = Field(min_length=5, max_length=300)
    make: str = Field(min_length=2, max_length=100)
    model: str = Field(min_length=1, max_length=200)
    year_of_manufacture: int = Field(ge=1980, le=datetime.now().year)
    condition: MachineCondition
    capacity_specs: str = Field(min_length=5, max_length=500)
    specifications: Optional[Dict[str, Any]] = None
    description: str = Field(min_length=10, max_length=2000)
    listing_type: ListingType
    min_rental_duration: Optional[str] = "1 day"
    
    # New v1.2 fields
    running_condition: MachineRunningCondition = MachineRunningCondition.running
    hmr: Optional[int] = Field(None, ge=0, le=999999)
    ownership_type: MachineOwnershipType = MachineOwnershipType.owner

    # RTO & Age Validation Fields
    is_rto_registered: bool = False
    registration_number: Optional[str] = Field(None, max_length=50)
    chassis_number: Optional[str] = Field(None, max_length=100)
    machine_serial_no: Optional[str] = Field(None, max_length=100)
    serial_plate_photo_url: Optional[str] = None

    # Detailed Term Sheets
    rental_term_sheet: Optional[RentalTermSheet] = None
    sale_term_sheet: Optional[SaleTermSheet] = None
    has_custom_terms: bool = False

    # Pricing
    rental_price_hourly: Optional[float] = Field(None, gt=0)
    rental_price_daily: Optional[float] = Field(None, gt=0)
    rental_price_weekly: Optional[float] = Field(None, gt=0)
    rental_price_monthly: Optional[float] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, gt=0)
    contact_for_price: bool = False
    is_negotiable: bool = False

    # Location (reduced to 30-40 characters)
    city: str = Field(min_length=2, max_length=40)
    state: str = Field(min_length=2, max_length=40)
    address_line: Optional[str] = Field(None, max_length=40)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

    @model_validator(mode="after")
    def validate_rto_or_serial(self):
        if self.is_rto_registered:
            if not self.registration_number or not self.registration_number.strip():
                raise ValueError("Registration number is required when equipment is RTO registered")
        else:
            if not self.machine_serial_no or not self.machine_serial_no.strip():
                raise ValueError("Machine serial number is required for non-registrable equipment")
            if not self.serial_plate_photo_url or not self.serial_plate_photo_url.strip():
                raise ValueError("Serial plate photo is required for machine age validation of non-registrable equipment")
        return self

    @field_validator("rental_price_hourly", "rental_price_daily", "rental_price_weekly", "rental_price_monthly", "purchase_price")
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
    year_of_manufacture: Optional[int] = Field(None, ge=1980, le=datetime.now().year)
    category_id: Optional[UUID] = None
    sub_category_id: Optional[UUID] = None
    condition: Optional[MachineCondition] = None
    capacity_specs: Optional[str] = Field(None, min_length=5, max_length=500)
    specifications: Optional[Dict[str, Any]] = None
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    listing_type: Optional[ListingType] = None
    min_rental_duration: Optional[str] = None
    
    running_condition: Optional[MachineRunningCondition] = None
    hmr: Optional[int] = Field(None, ge=0, le=999999)
    ownership_type: Optional[MachineOwnershipType] = None
    rental_price_hourly: Optional[float] = Field(None, gt=0)
    rental_price_daily: Optional[float] = Field(None, gt=0)
    rental_price_weekly: Optional[float] = Field(None, gt=0)
    rental_price_monthly: Optional[float] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, gt=0)
    contact_for_price: Optional[bool] = None
    is_negotiable: Optional[bool] = None
    city: Optional[str] = Field(None, min_length=2, max_length=40)
    state: Optional[str] = Field(None, min_length=2, max_length=40)
    address_line: Optional[str] = Field(None, max_length=40)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    availability: Optional[bool] = None
    is_rto_registered: Optional[bool] = None
    registration_number: Optional[str] = Field(None, max_length=50)
    chassis_number: Optional[str] = Field(None, max_length=100)
    machine_serial_no: Optional[str] = Field(None, max_length=100)
    serial_plate_photo_url: Optional[str] = None
    rental_term_sheet: Optional[RentalTermSheet] = None
    sale_term_sheet: Optional[SaleTermSheet] = None
    has_custom_terms: Optional[bool] = None


# ── Response Schemas ──────────────────────────────────────────

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    icon_url: Optional[str] = None
    description: Optional[str] = None
    listing_count: Optional[int] = None
    model_config = {"from_attributes": True}


class MachineListItemResponse(BaseModel):
    """Lightweight response for search results / cards."""
    id: UUID
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
    status: MachineStatus = MachineStatus.approved
    availability: bool
    expires_at: Optional[datetime] = None
    is_expired: bool = False
    is_active: bool = True
    city: str
    state: str
    rental_price_hourly: Optional[float] = None
    rental_price_daily: Optional[float] = None
    rental_price_weekly: Optional[float] = None
    rental_price_monthly: Optional[float] = None
    purchase_price: Optional[float] = None
    contact_for_price: bool
    is_negotiable: bool = False
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
    created_at: Optional[datetime] = None
    is_rto_registered: bool = False
    has_term_sheet: bool = False
    fuel_included: Optional[bool] = None
    operators_included: Optional[bool] = None
    has_custom_terms: bool = False
    model_config = {"from_attributes": True}


class MachineDetailResponse(BaseModel):
    """Full detail response for listing page."""
    id: UUID
    vendor_id: Optional[UUID] = None
    slug: str
    category_id: Optional[UUID] = None
    sub_category_id: Optional[UUID] = None
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
    min_rental_duration: Optional[str] = None
    availability: bool
    status: MachineStatus
    expires_at: Optional[datetime] = None
    is_expired: bool = False
    is_active: bool = True
    rental_price_hourly: Optional[float] = None
    rental_price_daily: Optional[float] = None
    rental_price_weekly: Optional[float] = None
    rental_price_monthly: Optional[float] = None
    purchase_price: Optional[float] = None
    contact_for_price: bool
    is_negotiable: bool = False
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

    # RTO & Detailed Term Sheets
    is_rto_registered: bool = False
    registration_number: Optional[str] = None
    chassis_number: Optional[str] = None
    machine_serial_no: Optional[str] = None
    serial_plate_photo_url: Optional[str] = None
    rental_term_sheet: Optional[RentalTermSheet] = None
    sale_term_sheet: Optional[SaleTermSheet] = None
    has_custom_terms: bool = False
    is_term_sheet_locked: bool = False
    model_config = {"from_attributes": True}


class PaginatedMachineResponse(BaseModel):
    results: List[MachineListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
    city: Optional[str] = None
