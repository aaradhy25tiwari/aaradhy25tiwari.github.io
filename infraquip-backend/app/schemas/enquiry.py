"""
Pydantic schemas for Enquiries & Messages
"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class EnquiryCreateRequest(BaseModel):
    machine_id: Optional[str] = None
    vendor_id: str
    requirement_type: str = "rent"
    customer_company: Optional[str] = Field(None, max_length=300)
    required_from: Optional[str] = None
    required_duration_days: Optional[int] = Field(None, ge=1)
    location_of_use: Optional[str] = Field(None, max_length=200)
    message: Optional[str] = Field(None, max_length=2000)


class EnquiryMessageResponse(BaseModel):
    id: str
    sender_id: str
    message_text: str
    attachment_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EnquiryResponse(BaseModel):
    id: str
    machine_id: Optional[str] = None
    vendor_id: str
    customer_id: str
    requirement_type: str
    customer_company: Optional[str] = None
    required_from: Optional[date] = None
    required_duration_days: Optional[int] = None
    location_of_use: Optional[str] = None
    message: Optional[str] = None
    status: str
    is_read_by_vendor: bool
    machine_title: Optional[str] = None
    machine_slug: Optional[str] = None
    customer_name: Optional[str] = None
    messages: List[EnquiryMessageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EnquiryListItemResponse(BaseModel):
    id: str
    machine_title: str
    machine_slug: Optional[str] = None
    requirement_type: str
    status: str
    is_read: bool
    customer_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreateRequest(BaseModel):
    message_text: str = Field(min_length=1, max_length=2000)


class EnquiryListResponse(BaseModel):
    results: List[EnquiryListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
