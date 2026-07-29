"""Pydantic schemas for the User domain.

Defines request/response shapes used by the auth endpoints.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Request body for ``POST /api/v1/auth/register``."""

    email: EmailStr = Field(
        examples=["alice@example.com"],
    )
    password: str = Field(
        min_length=8,
        max_length=128,
        examples=["s3cur3P@ss!"],
    )
    monthly_income: float = Field(
        default=0.0,
        ge=0,
        description="User's monthly income in base currency",
        examples=[5000.00],
    )
    risk_profile: str = Field(
        default="moderate",
        pattern=r"^(conservative|moderate|aggressive)$",
        description="Investment risk tolerance",
    )


class UserRead(BaseModel):
    """Public user profile returned by the API (never exposes password)."""

    id: UUID
    email: EmailStr
    monthly_income: float
    risk_profile: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """JWT access-token response body."""

    access_token: str
    token_type: str = "bearer"

