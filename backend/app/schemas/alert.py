"""Alert Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AlertCreate(BaseModel):
    alert_type: str = Field("warning", max_length=50)
    title: str = Field(..., max_length=255)
    message: str = Field(..., max_length=500)


class AlertRead(BaseModel):
    id: UUID
    user_id: UUID
    alert_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
