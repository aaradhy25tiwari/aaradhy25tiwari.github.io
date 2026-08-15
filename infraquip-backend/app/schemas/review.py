"""
Pydantic schemas for Reviews
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    enquiry_id: str
    rating_overall: int = Field(ge=1, le=5)
    rating_condition: int = Field(ge=1, le=5)
    rating_communication: int = Field(ge=1, le=5)
    review_text: Optional[str] = Field(None, min_length=50, max_length=500)


class ReviewResponse(BaseModel):
    id: str
    machine_id: str
    vendor_id: str
    customer_id: str
    enquiry_id: str
    rating_overall: int
    rating_condition: int
    rating_communication: int
    review_text: Optional[str] = None
    is_visible: bool
    customer_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    results: List[ReviewResponse]
    average_rating: Optional[float] = None
    total: int
