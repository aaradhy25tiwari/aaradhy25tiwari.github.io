"""
InfraQuip FastAPI Application — Main Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import asyncio
import httpx
import os

from app.config import settings
from app.routers import (
    auth, machines, search, vendor, customer,
    enquiries, subscriptions, admin, notifications, categories,
    chat, chatbot, account_requests, public_leads
)

logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)
logger = logging.getLogger(__name__)

# ── Rate Limiter (uses Redis-backed store when available) ─────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


async def self_ping():
    """Background task to ping the app and keep the Render instance alive."""
    url = os.getenv("RENDER_EXTERNAL_URL")
    if not url:
        logger.info("RENDER_EXTERNAL_URL not set; skipping self-ping.")
        return
        
    ping_url = f"{url.rstrip('/')}/health"
    # Render spins down free instances after 15 mins of inactivity. Ping every 14 minutes.
    interval = 14 * 60 

    logger.info(f"Starting self-ping task for {ping_url} every {interval}s")
    async with httpx.AsyncClient() as client:
        while True:
            await asyncio.sleep(interval)
            try:
                response = await client.get(ping_url, timeout=10.0)
                logger.info(f"Self-ping successful: {response.status_code}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Self-ping failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown events."""
    logger.info(f"Starting {settings.APP_NAME} [{settings.APP_ENV}]")
    ping_task = asyncio.create_task(self_ping())
    yield
    logger.info("Shutting down...")
    ping_task.cancel()


# ── App Factory ───────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="InfraQuip — Construction Equipment Rental & Sales API",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Rate limiter ──────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── Middleware ─────────────────────────────────────────────
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)

    # ── Security headers middleware ──────────────────────────────
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
        return response

    # ── Global exception handler ───────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred. Please try again."},
        )

    # ── Health check ───────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok", "version": "1.0.0", "env": settings.APP_ENV}

    # ── Register Routers ───────────────────────────────────────
    prefix = settings.API_V1_PREFIX

    app.include_router(auth.router,          prefix=f"{prefix}/auth",          tags=["Authentication"])
    app.include_router(machines.router,      prefix=f"{prefix}/machines",      tags=["Machines"])
    app.include_router(search.router,        prefix=f"{prefix}/search",        tags=["Search"])
    app.include_router(categories.router,    prefix=f"{prefix}/categories",    tags=["Categories"])
    app.include_router(vendor.router,        prefix=f"{prefix}/vendor",        tags=["Vendor Dashboard"])
    app.include_router(customer.router,      prefix=f"{prefix}/customer",      tags=["Customer Dashboard"])
    app.include_router(enquiries.router,     prefix=f"{prefix}/enquiries",     tags=["Enquiries"])
    app.include_router(subscriptions.router, prefix=f"{prefix}/subscriptions", tags=["Subscriptions"])
    app.include_router(notifications.router, prefix=f"{prefix}/notifications", tags=["Notifications"])
    app.include_router(admin.router,              prefix=f"{prefix}/admin",            tags=["Admin"])
    app.include_router(account_requests.router,   prefix=f"{prefix}/account-requests", tags=["Account Requests"])
    app.include_router(chat.router,               prefix=f"{prefix}/chat",             tags=["Chat"])
    app.include_router(chatbot.router,            prefix=f"{prefix}/chatbot",          tags=["Chatbot"])
    app.include_router(public_leads.router,       prefix=f"{prefix}/live-leads",       tags=["Public Leads"])

    return app


app = create_app()
