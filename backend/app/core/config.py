"""Application configuration using Pydantic Settings v2.

Loads environment variables with sensible defaults and type validation.
All application code should import `settings` from this module.
"""

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Unified configuration for Xpense AI.

    Environment variables are loaded from a ``.env`` file and the process
    environment. Values defined here are the fallback defaults.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Core ──────────────────────────────────────────────────────────
    APP_NAME: str = "xpense-ai"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = ["*"]

    # ── Database ──────────────────────────────────────────────────────
    # Canonical: DATABASE_URL. Legacy alias: POSTGRES_URL.
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./xpense_ai.db",
        description="Database connection string (SQLite, PostgreSQL, etc.)",
    )

    @property
    def POSTGRES_URL(self) -> str:
        """Backward-compatible alias for DATABASE_URL."""
        return self.DATABASE_URL

    # ── JWT ───────────────────────────────────────────────────────────
    # Canonical: JWT_SECRET. Legacy alias: JWT_SECRET_KEY.
    JWT_SECRET: SecretStr = Field(
        default="xpense-ai-default-dev-secret-key-change-in-production-32bytes",
        description="HMAC signing key for JWT tokens (256-bit minimum)",
    )

    @property
    def JWT_SECRET_KEY(self) -> SecretStr:
        """Backward-compatible alias for JWT_SECRET."""
        return self.JWT_SECRET

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Bcrypt ────────────────────────────────────────────────────────
    BCRYPT_ROUNDS: int = 12

    # ── Google Cloud ──────────────────────────────────────────────────
    GOOGLE_APPLICATION_CREDENTIALS: str | None = Field(
        default=None,
        description="Path to Google Cloud service-account JSON key file",
    )

    # ── LLM Providers ─────────────────────────────────────────────────
    ANTHROPIC_API_KEY: SecretStr | None = Field(default=None)
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    ANTHROPIC_API_URL: str = "https://api.anthropic.com/v1/messages"
    GROQ_API_KEY: SecretStr | None = Field(default=None)
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MODEL: str = "qwen/qwen3.6-27b"
    GROQ_OCR_MODEL: str = "qwen/qwen3.6-27b"



# Singleton instance — import this everywhere in the application.
settings = Settings()  # type: ignore[call-arg]
