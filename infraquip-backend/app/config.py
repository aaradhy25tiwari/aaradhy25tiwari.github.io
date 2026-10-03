from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "InfraQuip API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "change-me-in-production"

    # ── Database ─────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/infraquip"

    # ── Supabase ─────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET_MACHINES: str = "machine-images"
    SUPABASE_STORAGE_BUCKET_DOCUMENTS: str = "machine-documents"

    # ── Redis ────────────────────────────────────────────────────
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""
    REDIS_URL: str = "redis://localhost:6379"

    # ── Email Settings (Resend & SMTP support for Free Providers) ───
    EMAIL_PROVIDER: str = "auto"  # "auto", "resend", "smtp", "console"
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "noreply@infraquip.com"
    RESEND_FROM_NAME: str = "InfraQuip"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "InfraQuip"
    SMTP_USE_TLS: bool = True

    # ── Razorpay ─────────────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # ── Gemini AI ─────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    CHATBOT_RATE_LIMIT: int = 10  # requests per hour per user

    # ── Google Maps ───────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""

    # ── CORS ─────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def allowed_hosts_list(self) -> List[str]:
        from urllib.parse import urlparse
        hosts = ["*"]
        for origin in self.allowed_origins_list:
            parsed = urlparse(origin)
            host = parsed.hostname
            if parsed.port:
                host = f"{host}:{parsed.port}"
            if host not in hosts:
                hosts.append(host)
        return hosts

    # ── Tiered Rate Limiting Configurations ───────────────────────
    RATE_LIMIT_DEFAULT: str = "100/minute"

    # Tier 1: Authentication Routes (per-IP & per-account with exponential backoff)
    RATE_LIMIT_AUTH_PER_IP: int = 10          # Max baseline auth attempts per minute per IP
    RATE_LIMIT_AUTH_PER_ACCOUNT: int = 5      # Max baseline auth attempts per minute per account
    AUTH_BACKOFF_WINDOW_SECONDS: int = 60     # Sliding observation window (seconds)
    AUTH_BACKOFF_BASE_SECONDS: int = 15       # Initial backoff cooldown (seconds)
    AUTH_BACKOFF_FACTOR: float = 2.0          # Exponential backoff multiplier
    AUTH_BACKOFF_MAX_SECONDS: int = 900       # Maximum backoff cap (15 minutes)

    # Tier 2: Public Endpoints (Moderate Limits)
    RATE_LIMIT_PUBLIC: str = "60/minute"
    RATE_LIMIT_SEARCH: str = "30/minute"
    RATE_LIMIT_PUBLIC_LEADS: str = "30/minute"

    # Tier 3: Authenticated User Actions (Looser Limits)
    RATE_LIMIT_AUTHENTICATED: str = "180/minute"
    RATE_LIMIT_ADMIN: str = "300/minute"
    RATE_LIMIT_CHAT: str = "60/minute"
    RATE_LIMIT_CHATBOT: str = "20/minute"


    # ── JWT ───────────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Cache TTL (seconds) ───────────────────────────────────────
    SEARCH_CACHE_TTL: int = 300
    DASHBOARD_CACHE_TTL: int = 86400


settings = Settings()
