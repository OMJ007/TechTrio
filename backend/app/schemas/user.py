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
    full_name: str | None = Field(
        default=None,
        max_length=120,
        examples=["Alice Sharma"],
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


class UserUpdate(BaseModel):
    """Request body for updating personal info and financial profile.

    Every field is optional — only the ones present in the payload are
    applied, so partial updates from separate UI sections are safe.
    """

    full_name: str | None = Field(None, max_length=120, examples=["Alice Sharma"])
    phone: str | None = Field(
        None,
        max_length=20,
        # Empty is allowed so clearing the field is a valid update.
        pattern=r"^$|^[\d+\-\s()]{6,20}$",
        examples=["+91 98765 43210"],
    )
    occupation: str | None = Field(None, max_length=120, examples=["Product Designer"])
    currency: str | None = Field(
        None,
        pattern=r"^[A-Z]{3}$",
        description="ISO-4217 currency code",
        examples=["INR"],
    )
    monthly_income: float | None = Field(None, ge=0)
    risk_profile: str | None = Field(None, pattern=r"^(conservative|moderate|aggressive)$")


class EmailUpdate(BaseModel):
    """Request body for ``PUT /api/v1/auth/me/email``."""

    new_email: EmailStr = Field(examples=["alice.new@example.com"])
    current_password: str = Field(
        min_length=1,
        max_length=128,
        description="Current password, required to confirm the change",
    )


class PasswordUpdate(BaseModel):
    """Request body for ``PUT /api/v1/auth/me/password``."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    """Public user profile returned by the API (never exposes password)."""

    id: UUID
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    occupation: str | None = None
    currency: str = "INR"
    monthly_income: float
    risk_profile: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """JWT access-token response body."""

    access_token: str
    token_type: str = "bearer"
