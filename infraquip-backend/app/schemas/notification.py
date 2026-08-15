"""
Pydantic schemas for Notifications
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    metadata_json: Optional[Dict[str, Any]] = Field(None, alias="metadata")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class NotificationListResponse(BaseModel):
    results: List[NotificationResponse]
    unread_count: int
    total: int
