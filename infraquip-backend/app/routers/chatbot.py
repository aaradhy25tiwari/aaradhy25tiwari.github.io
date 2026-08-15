"""
AI Chatbot Router — Gemini-powered equipment discovery & FAQ assistant
"""
import uuid
import json
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func

from app.deps import CurrentUser, OptionalUser, DBSession
from app.models.machine import Machine, MachineStatus
from app.models.enquiry import Enquiry, EnquiryStatus
from app.services.cache_service import cache_get, cache_set
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_history: Optional[List[dict]] = None  # [{"role": "user"|"assistant", "content": "..."}]


class ChatResponse(BaseModel):
    reply: str
    listings: Optional[List[dict]] = None


# ── System prompt ──────────────────────────────────────────────

SYSTEM_PROMPT = """You are InfraQuip AI, a helpful assistant for a construction equipment marketplace in India.

Your capabilities:
1. Help users discover equipment by understanding their requirements
2. Answer FAQs about the platform (enquiry process, subscriptions, vendor verification)
3. Provide equipment recommendations based on specs, location, and budget

Rules:
- NEVER make up pricing or availability — always say you'll search the database
- Be concise and helpful, answer in English
- For equipment discovery, extract: category, city, max budget, rental duration
- If user asks about pricing, suggest they browse listings or send enquiries
- Keep responses under 300 words

Platform context:
- InfraQuip connects equipment vendors and customers across India
- Categories: Excavators, Cranes, Bulldozers, Forklifts, Loaders, Compactors, Concrete Equipment, Piling, Aerial Work Platforms, Trucks
- Users can browse without login; enquiries require registration
- Subscription plans for vendors (Free/Pro/Enterprise) and customers (Free/Business)
- Payments handled via Razorpay (UPI, cards, netbanking)"""


# ── Extract search intent from message ─────────────────────────

def extract_search_params(message: str) -> dict:
    """Simple keyword extraction for search parameters."""
    message_lower = message.lower()
    params = {}

    # Detect category
    categories = {
        "excavator": "excavators", "excavators": "excavators", "jcb": "excavators",
        "crane": "cranes", "cranes": "cranes",
        "bulldozer": "bulldozers", "bulldozers": "bulldozers",
        "forklift": "forklifts", "forklifts": "forklifts",
        "loader": "loaders", "loaders": "loaders",
        "compactor": "compactors", "compactors": "compactors",
        "concrete": "concrete", "concrete mixer": "concrete",
        "piling": "piling", "pile": "piling",
        "aerial": "aerial-work", "boom lift": "aerial-work",
        "truck": "trucks", "tipper": "trucks",
    }
    for keyword, slug in categories.items():
        if keyword in message_lower:
            params["category"] = slug
            break

    # Detect city
    cities = ["mumbai", "delhi", "pune", "bangalore", "bengaluru",
              "hyderabad", "ahmedabad", "chennai", "kolkata", "lucknow",
              "jaipur", "surat", "indore", "bhopal", "chandigarh",
              "nagpur", "thane", "navi mumbai", "gurgaon", "noida"]
    for city in cities:
        if city in message_lower:
            params["city"] = city.title()
            break

    # Detect budget
    import re
    budget_match = re.search(r'(?:under|below|less than|max|budget|upto|up to)\s*[₹Rs.]*\s*(\d[\d,]*)\s*(?:per day|daily|/day)?', message_lower)
    if budget_match:
        try:
            params["max_price"] = int(budget_match.group(1).replace(",", ""))
        except ValueError:
            pass

    # Detect rental/buy intent
    if any(w in message_lower for w in ["rent", "rental", "hire", "daily", "per day"]):
        params["listing_type"] = "rent"
    elif any(w in message_lower for w in ["buy", "purchase", "own"]):
        params["listing_type"] = "sale"

    return params


# ── Search equipment based on params ───────────────────────────

async def search_equipment(db, params: dict) -> List[dict]:
    """Search approved machines matching the extracted parameters."""
    from sqlalchemy import or_

    stmt = select(Machine).where(Machine.status == MachineStatus.approved)

    if params.get("category"):
        from app.models.machine import Category
        cat_result = await db.execute(
            select(Category).where(Category.slug == params["category"])
        )
        cat = cat_result.scalar_one_or_none()
        if cat:
            stmt = stmt.where(Machine.category_id == cat.id)

    if params.get("city"):
        stmt = stmt.where(Machine.city.ilike(f"%{params['city']}%"))

    if params.get("max_price"):
        stmt = stmt.where(Machine.rental_price_daily <= params["max_price"])

    if params.get("listing_type"):
        if params["listing_type"] == "rent":
            stmt = stmt.where(
                or_(Machine.listing_type == "rent", Machine.listing_type == "both")
            )
        elif params["listing_type"] == "sale":
            stmt = stmt.where(
                or_(Machine.listing_type == "sale", Machine.listing_type == "both")
            )

    stmt = stmt.order_by(Machine.created_at.desc()).limit(5)
    result = await db.execute(stmt)
    machines = result.scalars().all()

    return [
        {
            "title": m.title,
            "make": m.make,
            "model": m.model,
            "year": m.year_of_manufacture,
            "city": m.city,
            "condition": m.condition.value if hasattr(m.condition, "value") else m.condition,
            "rental_price_daily": float(m.rental_price_daily) if m.rental_price_daily else None,
            "purchase_price": float(m.purchase_price) if m.purchase_price else None,
            "slug": m.slug,
            "views_count": m.views_count,
        }
        for m in machines
    ]


# ── Call Gemini API ────────────────────────────────────────────

async def call_gemini(messages: list) -> str:
    """Send conversation to Gemini and return the response text."""
    import httpx

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    params = {"key": settings.GEMINI_API_KEY}

    gemini_contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        gemini_contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    payload = {
        "contents": gemini_contents,
        "generationConfig": {
            "maxOutputTokens": 500,
            "temperature": 0.3,
            "topP": 0.9,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        ],
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, params=params, json=payload)

    if resp.status_code != 200:
        logger.error(f"Gemini API error: {resp.status_code} {resp.text}")
        return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again shortly."

    data = resp.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text.strip()
    except (KeyError, IndexError):
        logger.error(f"Unexpected Gemini response: {data}")
        return "I couldn't generate a response. Please rephrase your question."


# ── POST /chatbot ─────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat_with_ai(
    payload: ChatRequest,
    user: OptionalUser,
    db: DBSession,
):
    """Main chatbot endpoint. Accepts a message and returns AI response + optional listings."""
    message = payload.message.strip()
    history = payload.conversation_history or []

    # Rate limit check (authenticated users: 10/hr, guests: 5/hr)
    if user:
        cache_key = f"chatbot_rate_limit:{user.id}"
        current_count = await cache_get(cache_key) or 0
        limit = settings.CHATBOT_RATE_LIMIT
    else:
        cache_key = "chatbot_rate_limit:guest"
        current_count = await cache_get(cache_key) or 0
        limit = 5

    if current_count >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"You've reached the rate limit. Please try again later.",
        )

    await cache_set(cache_key, current_count + 1, ttl=3600)

    # Extract search intent
    search_params = extract_search_params(message)

    # Build conversation for Gemini
    gemini_messages = [{"role": "user", "content": SYSTEM_PROMPT}]
    gemini_messages.append({"role": "model", "content": "I understand. I'll help users discover equipment and answer platform questions."})

    for h in history[-6:]:  # last 6 messages for context
        gemini_messages.append(h)

    gemini_messages.append({"role": "user", "content": message})

    # Get AI response
    reply = await call_gemini(gemini_messages)

    # If search intent was detected, fetch real listings
    listings = None
    if search_params:
        fetched = await search_equipment(db, search_params)
        if fetched:
            listings = fetched

    return ChatResponse(reply=reply, listings=listings)
