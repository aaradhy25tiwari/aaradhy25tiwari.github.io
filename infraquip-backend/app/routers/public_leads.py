"""
Public Leads Feed Router
"""
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import DBSession
from app.models.enquiry import Enquiry
from pydantic import BaseModel

router = APIRouter()

class PublicLeadResponse(BaseModel):
    id: str
    requirement_type: str
    location_of_use: Optional[str] = None
    required_from: Optional[date] = None
    machine_title: Optional[str] = None
    machine_category: Optional[str] = None
    created_at: datetime
    # Anonymized data
    customer_first_name: str
    
    model_config = {"from_attributes": True}


@router.get("", response_model=List[PublicLeadResponse])
async def get_live_leads(db: DBSession):
    """
    Fetch the latest enquiries with customer PII stripped, for public display to drive vendor signups.
    """
    stmt = (
        select(Enquiry)
        .options(
            selectinload(Enquiry.machine),
            selectinload(Enquiry.customer)
        )
        .order_by(Enquiry.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    enquiries = result.scalars().all()
    
    response = []
    for enq in enquiries:
        customer_name = enq.customer.full_name if enq.customer else "Guest"
        first_name = customer_name.split(" ")[0]
        
        response.append(
            PublicLeadResponse(
                id=str(enq.id),
                requirement_type=enq.requirement_type,
                location_of_use=enq.location_of_use,
                required_from=enq.required_from,
                machine_title=enq.machine.title if enq.machine else None,
                # Note: This requires the machine to have a category eagerly loaded, but for now we can just return none or adjust if needed.
                machine_category=None,
                created_at=enq.created_at,
                customer_first_name=first_name,
            )
        )
        
    return response
