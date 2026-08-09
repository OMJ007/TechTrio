"""Goal Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GoalCreate(BaseModel):
    name: str = Field(..., max_length=255)
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(0.0, ge=0)
    category: str = Field("Security", max_length=50)


class GoalUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    target_amount: float | None = Field(None, gt=0)
    current_amount: float | None = Field(None, ge=0)
    category: str | None = Field(None, max_length=50)


class GoalRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    target_amount: float
    current_amount: float
    percentage_completed: float = 0.0
    category: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
