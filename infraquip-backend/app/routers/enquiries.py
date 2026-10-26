"""
Enquiries Router — Customer creates enquiry, both parties message
"""
import uuid
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Request
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload, joinedload
from pydantic import BaseModel, Field

from app.deps import CurrentUser, OptionalUser, DBSession
from app.models.user import UserRole
from app.models.machine import Machine, MachineStatus
from app.models.enquiry import Enquiry, EnquiryMessage, EnquiryStatus, RequirementType
from app.services.email_service import send_enquiry_received_email
from app.core.rate_limiter import limiter, get_authenticated_user_key
from app.config import settings

router = APIRouter()


class EnquiryCreateRequest(BaseModel):
    machine_id: Optional[str] = None  # None for general (no machine) enquiry
    vendor_id: Optional[str] = None
    requirement_type: str = "rent"  # rent | buy
    customer_company: Optional[str] = Field(None, max_length=300)
    required_from: Optional[str] = None  # ISO date string
    required_duration_days: Optional[int] = Field(None, ge=1)
    location_of_use: Optional[str] = Field(None, max_length=200)
    message: Optional[str] = Field(None, max_length=2000)


class BuyRequestCreate(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    make: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    condition_preference: Optional[str] = Field("any", max_length=50)  # new | used | any
    year_min: Optional[int] = None
    budget_range: Optional[str] = Field(None, max_length=100)
    delivery_city: str = Field(..., min_length=2, max_length=100)
    delivery_state: Optional[str] = Field(None, max_length=100)
    timeline: Optional[str] = Field(None, max_length=100)
    financing_needed: bool = False
    inspection_needed: bool = True
    transport_needed: bool = False
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=10, max_length=20)
    email: str = Field(..., max_length=255)
    company_name: Optional[str] = Field(None, max_length=300)
    additional_notes: Optional[str] = Field(None, max_length=2000)


class MessageCreateRequest(BaseModel):
    message_text: str = Field(min_length=1, max_length=2000)


# ── POST /enquiries ────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def create_enquiry(
    request: Request,
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
    sub_result = await db.execute(
        select(Subscription)
        .options(joinedload(Subscription.plan))
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

    # Assign vendor id (use admin as fallback if vendor_id is omitted)
    vendor_uuid = None
    if payload.vendor_id:
        vendor_uuid = uuid.UUID(payload.vendor_id)
    else:
        from app.models.user import User
        admin_res = await db.execute(select(User).where(User.role == UserRole.admin).order_by(User.created_at.asc()).limit(1))
        admin = admin_res.scalar_one_or_none()
        vendor_uuid = admin.id if admin else current_user.id

    enquiry = Enquiry(
        id=uuid.uuid4(),
        customer_id=current_user.id,
        vendor_id=vendor_uuid,
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
    vendor_result = await db.execute(select(User).where(User.id == vendor_uuid))
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


# ── POST /enquiries/buy-request ─────────────────────────────────
@router.post("/buy-request", status_code=status.HTTP_201_CREATED)
async def submit_buy_request(
    request: Request,
    payload: BuyRequestCreate,
    db: DBSession,
    background_tasks: BackgroundTasks,
    optional_user: OptionalUser,
):
    """
    Submit a dedicated equipment buying / procurement request (RFQ).
    Open to both registered customers and guest buyers.
    """
    from app.models.user import User, UserRole
    from app.services.notification_service import create_notification, NotificationType

    # 1. Determine customer ID
    customer_id = None
    if optional_user and optional_user.role != UserRole.vendor:
        customer_id = optional_user.id
    else:
        # Check if user with email exists
        user_result = await db.execute(select(User).where(User.email == payload.email))
        existing_user = user_result.scalar_one_or_none()
        if existing_user:
            customer_id = existing_user.id
        else:
            # Create guest customer record
            guest_customer = User(
                id=uuid.uuid4(),
                email=payload.email,
                full_name=payload.full_name,
                phone=payload.phone,
                role=UserRole.customer,
                is_verified=False,
            )
            db.add(guest_customer)
            await db.flush()
            customer_id = guest_customer.id

    # 2. Assign vendor (Admin / Procurement Desk)
    admin_result = await db.execute(
        select(User).where(User.role == UserRole.admin).order_by(User.created_at.asc()).limit(1)
    )
    admin_user = admin_result.scalar_one_or_none()
    vendor_id = admin_user.id if admin_user else customer_id

    # 3. Format message with all procurement details
    services = []
    if payload.financing_needed:
        services.append("Asset Financing / Equipment Loan Assistance")
    if payload.inspection_needed:
        services.append("100+ Point Certified Physical Inspection Report")
    if payload.transport_needed:
        services.append("Pan-India Transport & Logistics to Site")

    details = [
        "HEAVY EQUIPMENT BUYING SPECIFICATIONS:",
        f"• Category: {payload.category}",
        f"• Preferred Make: {payload.make or 'Any Verified Brand'}",
        f"• Model / Capacity: {payload.model or 'Open to recommendations'}",
        f"• Condition: {payload.condition_preference.title() if payload.condition_preference else 'Any'}",
        f"• Target Year: {payload.year_min or 'Any'}",
        f"• Budget Range: {payload.budget_range or 'Open for quotation'}",
        f"• Delivery Location: {payload.delivery_city}{', ' + payload.delivery_state if payload.delivery_state else ''}",
        f"• Purchase Timeline: {payload.timeline or 'Immediate'}",
        f"• Requested Services: {', '.join(services) if services else 'Standard Machinery Sourcing'}",
        f"• Buyer Name: {payload.full_name}",
        f"• Contact Phone: {payload.phone}",
        f"• Contact Email: {payload.email}",
        f"• Company: {payload.company_name or 'Individual / Contractor'}",
    ]
    if payload.additional_notes:
        details.append(f"• Special Requirements: {payload.additional_notes}")

    enquiry_id = uuid.uuid4()
    enquiry = Enquiry(
        id=enquiry_id,
        customer_id=customer_id,
        vendor_id=vendor_id,
        machine_id=None,
        requirement_type=RequirementType.buy,
        customer_company=payload.company_name,
        location_of_use=f"{payload.delivery_city}{', ' + payload.delivery_state if payload.delivery_state else ''}",
        message="\n".join(details),
        status=EnquiryStatus.pending,
    )
    db.add(enquiry)

    # 4. Notify admin in-app if admin user exists
    if admin_user:
        await create_notification(
            db,
            user_id=admin_user.id,
            type=NotificationType.enquiry,
            title="New Equipment Buying Request",
            body=f"{payload.full_name} wants to buy {payload.category} ({payload.make or ''}) in {payload.delivery_city}",
            link="/admin/enquiries",
        )

    await db.commit()

    reference_id = f"IQ-BUY-{str(enquiry_id).replace('-', '')[:6].upper()}"

    # 5. Background email notification to admin
    if admin_user:
        background_tasks.add_task(
            send_enquiry_received_email,
            admin_user.email,
            admin_user.full_name,
            payload.full_name,
            f"Buying Request: {payload.category} ({payload.delivery_city})",
            f"{settings.ALLOWED_ORIGINS.split(',')[0]}/admin",
        )

    return {
        "success": True,
        "reference_id": reference_id,
        "enquiry_id": str(enquiry_id),
        "message": "Equipment procurement request submitted successfully. Our sourcing team will contact you within 2 hours.",
    }


# ── GET /enquiries/{enquiry_id} ────────────────────────────────
@router.get("/{enquiry_id}")
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def get_enquiry(request: Request, enquiry_id: str, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Enquiry)
        .options(selectinload(Enquiry.messages), joinedload(Enquiry.machine))
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
@limiter.limit(settings.RATE_LIMIT_AUTHENTICATED, key_func=get_authenticated_user_key)
async def send_message(
    request: Request,
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
