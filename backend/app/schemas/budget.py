"""Budget Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
    category: str = Field(..., max_length=100)
    target_amount: float = Field(..., gt=0)
    period: str = Field("month", max_length=20)


class BudgetUpdate(BaseModel):
    target_amount: float | None = Field(None, gt=0)
    category: str | None = Field(None, max_length=100)


class BudgetRead(BaseModel):
    id: UUID
    user_id: UUID
    category: str
    target_amount: float
    spent_amount: float = 0.0
    percentage_used: float = 0.0
    period: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
