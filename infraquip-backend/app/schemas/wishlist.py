"""
Pydantic schemas for Wishlist
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class WishlistItemResponse(BaseModel):
    id: str
    machine_id: str
    machine_title: Optional[str] = None
    machine_slug: Optional[str] = None
    city: Optional[str] = None
    rental_price_daily: Optional[float] = None
    primary_image: Optional[str] = None
    added_at: datetime

    model_config = {"from_attributes": True}


class WishlistListResponse(BaseModel):
    results: List[WishlistItemResponse]
    total: int
