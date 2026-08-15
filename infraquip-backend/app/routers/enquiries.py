"""
Enquiries Router — Customer creates enquiry, both parties message
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.deps import CurrentUser, DBSession
from app.models.user import UserRole
from app.models.machine import Machine, MachineStatus
from app.models.enquiry import Enquiry, EnquiryMessage, EnquiryStatus
from app.services.email_service import send_enquiry_received_email
from app.config import settings

router = APIRouter()


class EnquiryCreateRequest(BaseModel):
    machine_id: Optional[str] = None  # None for general (no machine) enquiry
    vendor_id: str
    requirement_type: str = "rent"  # rent | buy
    customer_company: Optional[str] = Field(None, max_length=300)
    required_from: Optional[str] = None  # ISO date string
    required_duration_days: Optional[int] = Field(None, ge=1)
    location_of_use: Optional[str] = Field(None, max_length=200)
    message: Optional[str] = Field(None, max_length=2000)


class MessageCreateRequest(BaseModel):
    message_text: str = Field(min_length=1, max_length=2000)


# ── POST /enquiries ────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_enquiry(
    payload: EnquiryCreateRequest,
    current_user: CurrentUser,
    db: DBSession,
    background_tasks: BackgroundTasks,
):
    """Customer submits an enquiry. Vendor receives email notification."""
    if current_user.role == UserRole.vendor:
        raise HTTPException(status_code=403, detail="Vendors cannot send enquiries.")

    # Validate machine exists (if provided)
    if payload.machine_id:
        machine_result = await db.execute(
            select(Machine).where(
                Machine.id == uuid.UUID(payload.machine_id),
                Machine.status == MachineStatus.approved,
            )
        )
        machine = machine_result.scalar_one_or_none()
        if not machine:
            raise HTTPException(status_code=404, detail="Listing not found.")

    # Check monthly enquiry limit from subscription
    from app.models.subscription import Subscription
    from sqlalchemy import func
    from datetime import datetime
    sub_result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
    )
    sub = sub_result.scalar_one_or_none()

    if sub and sub.plan and sub.plan.enquiry_limit_monthly:
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count_result = await db.execute(
            select(func.count(Enquiry.id)).where(
                Enquiry.customer_id == current_user.id,
                Enquiry.created_at >= start_of_month,
            )
        )
        monthly_count = count_result.scalar() or 0
        if monthly_count >= sub.plan.enquiry_limit_monthly:
            raise HTTPException(
                status_code=403,
                detail=f"You've reached your monthly enquiry limit ({sub.plan.enquiry_limit_monthly}). Upgrade your plan.",
            )

    enquiry = Enquiry(
        id=uuid.uuid4(),
        customer_id=current_user.id,
        vendor_id=uuid.UUID(payload.vendor_id),
        machine_id=uuid.UUID(payload.machine_id) if payload.machine_id else None,
        requirement_type=payload.requirement_type,
        customer_company=payload.customer_company,
        required_from=payload.required_from,
        required_duration_days=payload.required_duration_days,
        location_of_use=payload.location_of_use,
        message=payload.message,
        status=EnquiryStatus.pending,
    )
    db.add(enquiry)

    # Increment enquiries count on machine
    if payload.machine_id:
        await db.execute(
            update(Machine).where(Machine.id == machine.id)
            .values(enquiries_count=Machine.enquiries_count + 1)
        )

    await db.commit()

    # Send email notification to vendor in background
    from app.models.user import User
    vendor_result = await db.execute(select(User).where(User.id == uuid.UUID(payload.vendor_id)))
    vendor = vendor_result.scalar_one_or_none()
    if vendor:
        machine_title = machine.title if payload.machine_id else "General Enquiry"
        background_tasks.add_task(
            send_enquiry_received_email,
            vendor.email,
            vendor.full_name,
            current_user.full_name,
            machine_title,
            f"{settings.ALLOWED_ORIGINS.split(',')[0]}/dashboard/vendor/enquiries/{str(enquiry.id)}",
        )

    return {"id": str(enquiry.id), "message": "Enquiry sent successfully. The vendor will respond shortly."}


# ── GET /enquiries/{enquiry_id} ────────────────────────────────
@router.get("/{enquiry_id}")
async def get_enquiry(enquiry_id: str, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Enquiry)
        .options(selectinload(Enquiry.messages), selectinload(Enquiry.machine))
        .where(Enquiry.id == uuid.UUID(enquiry_id))
    )
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    # Access control — only vendor or customer of this enquiry
    if str(enquiry.customer_id) != str(current_user.id) and str(enquiry.vendor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Mark as read if vendor
    if str(enquiry.vendor_id) == str(current_user.id) and not enquiry.is_read_by_vendor:
        enquiry.is_read_by_vendor = True
        await db.commit()

    return {
        "id": str(enquiry.id),
        "requirement_type": enquiry.requirement_type,
        "customer_company": enquiry.customer_company,
        "required_from": str(enquiry.required_from) if enquiry.required_from else None,
        "required_duration_days": enquiry.required_duration_days,
        "location_of_use": enquiry.location_of_use,
        "message": enquiry.message,
        "status": enquiry.status,
        "created_at": enquiry.created_at.isoformat(),
        "machine_title": enquiry.machine.title if enquiry.machine else None,
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "message_text": m.message_text,
                "created_at": m.created_at.isoformat(),
            }
            for m in sorted(enquiry.messages, key=lambda x: x.created_at)
        ],
    }


# ── POST /enquiries/{enquiry_id}/messages ──────────────────────
@router.post("/{enquiry_id}/messages")
async def send_message(
    enquiry_id: str,
    payload: MessageCreateRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    result = await db.execute(select(Enquiry).where(Enquiry.id == uuid.UUID(enquiry_id)))
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if str(enquiry.customer_id) != str(current_user.id) and str(enquiry.vendor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    msg = EnquiryMessage(
        id=uuid.uuid4(),
        enquiry_id=enquiry.id,
        sender_id=current_user.id,
        message_text=payload.message_text,
    )
    db.add(msg)

    # Update enquiry status
    if str(enquiry.vendor_id) == str(current_user.id):
        enquiry.status = EnquiryStatus.replied
    await db.commit()
    return {"id": str(msg.id), "message": "Message sent."}
