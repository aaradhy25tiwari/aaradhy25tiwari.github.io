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

    # ── Resend ───────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "noreply@infraquip.com"
    RESEND_FROM_NAME: str = "InfraQuip"

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

    # ── Rate Limiting ─────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 100
    LOGIN_RATE_LIMIT: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    # ── JWT ───────────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Cache TTL (seconds) ───────────────────────────────────────
    SEARCH_CACHE_TTL: int = 300
    DASHBOARD_CACHE_TTL: int = 86400


settings = Settings()
