"""Pydantic schemas for the Transaction domain."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TransactionUpdate(BaseModel):
    """Request body for ``PUT /api/v1/transactions/{id}`` — manual override.

    At least one field must be provided.
    """

    category: str | None = Field(
        default=None,
        max_length=100,
        description="Updated expense category",
        examples=["Food", "Transport", "Bills"],
    )
    amount: float | None = Field(
        default=None,
        gt=0,
        description="Corrected transaction amount",
        examples=[1249.50],
    )


class TransactionCreate(BaseModel):
    """Request body for creating a manual transaction."""

    amount: float = Field(..., gt=0, description="Transaction amount", examples=[150.00])
    merchant: str = Field(..., min_length=1, max_length=255, description="Merchant or store name", examples=["Starbucks"])
    category: str = Field(..., min_length=1, max_length=100, description="Expense category", examples=["Food"])
    payment_method: str = Field(default="Card", max_length=50, description="Payment method used", examples=["Card"])
    transaction_date: datetime | None = Field(default=None, description="Transaction date (defaults to current time)")


class TransactionRead(BaseModel):
    """Public transaction representation returned by the API."""

    id: UUID
    user_id: UUID
    amount: float
    merchant: str
    category: str
    payment_method: str
    transaction_date: datetime
    source: str
    confidence_score: float | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
