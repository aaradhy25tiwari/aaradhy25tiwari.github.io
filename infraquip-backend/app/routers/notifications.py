"""Notifications router."""
import uuid
from fastapi import APIRouter
from sqlalchemy import select, update

from app.deps import CurrentUser, DBSession
from app.models.analytics import Notification

router = APIRouter()


@router.get("")
async def get_notifications(current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifications = result.scalars().all()
    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "link": n.link,
            "is_read": n.is_read,
            "metadata": n.metadata_json,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, current_user: CurrentUser, db: DBSession):
    await db.execute(
        update(Notification)
        .where(Notification.id == uuid.UUID(notification_id), Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Marked as read."}


@router.patch("/read-all")
async def mark_all_read(current_user: CurrentUser, db: DBSession):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read."}
