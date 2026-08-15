"""
Realtime Chat Router — WebSocket-based messaging within enquiry threads
"""
import uuid
import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.enquiry import Enquiry, EnquiryMessage, EnquiryStatus
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Connection Manager ─────────────────────────────────────────

class ConnectionManager:
    """Manages WebSocket connections per enquiry thread."""

    def __init__(self):
        # enquiry_id -> set of (websocket, user_id)
        self.active_connections: Dict[str, Set[tuple[WebSocket, str]]] = {}

    async def connect(self, websocket: WebSocket, enquiry_id: str, user_id: str):
        await websocket.accept()
        if enquiry_id not in self.active_connections:
            self.active_connections[enquiry_id] = set()
        self.active_connections[enquiry_id].add((websocket, user_id))

    def disconnect(self, websocket: WebSocket, enquiry_id: str, user_id: str):
        if enquiry_id in self.active_connections:
            self.active_connections[enquiry_id].discard((websocket, user_id))
            if not self.active_connections[enquiry_id]:
                del self.active_connections[enquiry_id]

    async def broadcast_to_enquiry(self, enquiry_id: str, message: dict, exclude: WebSocket = None):
        """Send message to all connected clients in an enquiry thread."""
        if enquiry_id not in self.active_connections:
            return
        stale = set()
        for conn, uid in self.active_connections[enquiry_id]:
            if conn == exclude:
                continue
            try:
                await conn.send_json(message)
            except Exception:
                stale.add((conn, uid))
        for s in stale:
            self.active_connections[enquiry_id].discard(s)


manager = ConnectionManager()


# ── Authentication via WebSocket query param ──────────────────

async def verify_ws_token(token: str) -> tuple[User, str]:
    """Verify user token and return user + error message."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": settings.SUPABASE_ANON_KEY},
                timeout=5.0,
            )
        if resp.status_code != 200:
            return None, "Invalid token"
        supabase_user = resp.json()
        auth_uid = supabase_user.get("id")
    except Exception:
        return None, "Auth service unavailable"

    async with get_db() as db:
        result = await db.execute(select(User).where(User.auth_uid == auth_uid))
        user = result.scalar_one_or_none()
        if not user:
            return None, "User not found"
        if user.is_banned:
            return None, "Account suspended"
    return user, ""


# ── WebSocket: /ws/chat/{enquiry_id} ──────────────────────────

@router.websocket("/ws/{enquiry_id}")
async def chat_websocket(websocket: WebSocket, enquiry_id: str):
    """Realtime chat within an enquiry thread.
    
    Connect with query param: ?token=<supabase_jwt>
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing auth token")
        return

    user, error = await verify_ws_token(token)
    if error:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=error)
        return

    # Verify user has access to this enquiry
    try:
        async with get_db() as db:
            result = await db.execute(
                select(Enquiry).where(Enquiry.id == uuid.UUID(enquiry_id))
            )
            enquiry = result.scalar_one_or_none()
            if not enquiry:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Enquiry not found")
                return
            uid = str(user.id)
            eid = str(enquiry.customer_id)
            vid = str(enquiry.vendor_id)
            if uid != eid and uid != vid:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Access denied")
                return
    except Exception:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Server error")
        return

    await manager.connect(websocket, enquiry_id, str(user.id))
    logger.info(f"Chat WS connected: user={user.id[:8]} enquiry={enquiry_id[:8]}")

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_text = payload.get("message", "").strip()
            if not msg_text or len(msg_text) > 2000:
                await websocket.send_json({"error": "Invalid message length (1-2000 chars)"})
                continue

            # Persist message to DB
            async with get_db() as db:
                msg = EnquiryMessage(
                    id=uuid.uuid4(),
                    enquiry_id=uuid.UUID(enquiry_id),
                    sender_id=user.id,
                    message_text=msg_text,
                )
                db.add(msg)

                # Update enquiry status
                enq_result = await db.execute(
                    select(Enquiry).where(Enquiry.id == uuid.UUID(enquiry_id))
                )
                enq = enq_result.scalar_one_or_none()
                if enq and str(enq.vendor_id) == str(user.id):
                    enq.status = EnquiryStatus.replied
                await db.commit()

                # Create notification for the other party
                from app.models.analytics import Notification
                recipient_id = enq.customer_id if str(user.id) == str(enq.vendor_id) else enq.vendor_id
                notif = Notification(
                    id=uuid.uuid4(),
                    user_id=recipient_id,
                    type="new_message",
                    title=f"New message in enquiry",
                    body=msg_text[:200],
                    link=f"/dashboard/{'vendor' if recipient_id == enq.vendor_id else 'customer'}/enquiries/{enquiry_id}",
                    metadata_json={"enquiry_id": enquiry_id, "sender_id": str(user.id)},
                )
                db.add(notif)
                await db.commit()

            message_data = {
                "type": "message",
                "id": str(msg.id),
                "sender_id": str(user.id),
                "sender_name": user.full_name or user.email,
                "message": msg_text,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            }

            # Broadcast to all in the thread (including sender for confirmation)
            await manager.broadcast_to_enquiry(enquiry_id, message_data)

    except WebSocketDisconnect:
        manager.disconnect(websocket, enquiry_id, str(user.id))
        logger.info(f"Chat WS disconnected: user={user.id[:8]} enquiry={enquiry_id[:8]}")
    except Exception as e:
        logger.error(f"Chat WS error: {e}")
        manager.disconnect(websocket, enquiry_id, str(user.id))
