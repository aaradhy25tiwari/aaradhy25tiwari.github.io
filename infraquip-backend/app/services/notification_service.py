"""
Notification Service — creates in-app notifications for key events.
Designed to be called from background tasks or directly in route handlers.
"""
import uuid
from enum import Enum
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import Notification


class NotificationType(str, Enum):
    enquiry = "enquiry"
    approved = "approved"
    rejected = "rejected"
    payment = "payment"
    message = "message"
    system = "system"
    review = "review"


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    type: NotificationType,
    title: str,
    body: str,
    link: Optional[str] = None,
) -> Notification:
    """
    Create and persist an in-app notification for a user.
    
    Args:
        db: Async SQLAlchemy session
        user_id: The recipient user's UUID
        type: Notification category (enquiry, approved, rejected, payment, message, system)
        title: Short notification title (≤80 chars)
        body: Longer description (≤300 chars)
        link: Optional frontend URL to navigate to on click

    Returns:
        The created Notification ORM instance.
    """
    notification = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type=type.value,
        title=title[:80],
        body=body[:300],
        link=link,
        is_read=False,
    )
    db.add(notification)
    await db.flush()  # Get the id without committing (caller commits)
    return notification


# ── Convenience helpers ────────────────────────────────────────

async def notify_enquiry_received(db: AsyncSession, vendor_id: uuid.UUID, machine_title: str, enquiry_id: uuid.UUID) -> None:
    """Notify vendor of a new enquiry."""
    await create_notification(
        db=db,
        user_id=vendor_id,
        type=NotificationType.enquiry,
        title="New enquiry received",
        body=f"Someone sent an enquiry for your listing: {machine_title}",
        link=f"/dashboard/vendor/enquiries/{enquiry_id}",
    )


async def notify_listing_approved(db: AsyncSession, vendor_id: uuid.UUID, machine_title: str, machine_slug: str) -> None:
    """Notify vendor their listing was approved."""
    await create_notification(
        db=db,
        user_id=vendor_id,
        type=NotificationType.approved,
        title="Listing approved ✅",
        body=f'Your listing "{machine_title}" has been approved and is now live.',
        link=f"/machines/{machine_slug}",
    )


async def notify_listing_rejected(db: AsyncSession, vendor_id: uuid.UUID, machine_title: str, reason: Optional[str] = None) -> None:
    """Notify vendor their listing was rejected."""
    body = f'Your listing "{machine_title}" was rejected.'
    if reason:
        body += f" Reason: {reason}"
    await create_notification(
        db=db,
        user_id=vendor_id,
        type=NotificationType.rejected,
        title="Listing rejected",
        body=body,
        link="/dashboard/vendor/listings",
    )


async def notify_payment_received(db: AsyncSession, user_id: uuid.UUID, plan_name: str, amount: float) -> None:
    """Notify user of a successful payment."""
    await create_notification(
        db=db,
        user_id=user_id,
        type=NotificationType.payment,
        title="Payment successful 💳",
        body=f"Your payment of ₹{amount:,.0f} for the {plan_name} plan was successful.",
        link="/dashboard/vendor/subscription",
    )


async def notify_new_message(db: AsyncSession, recipient_id: uuid.UUID, sender_name: str, enquiry_id: uuid.UUID) -> None:
    """Notify user of a new message in an enquiry thread."""
    await create_notification(
        db=db,
        user_id=recipient_id,
        type=NotificationType.message,
        title=f"New message from {sender_name}",
        body="You have a new reply in your enquiry thread.",
        link=f"/enquire/{enquiry_id}",
    )
