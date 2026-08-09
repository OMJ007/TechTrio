"""Account Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AccountCreate(BaseModel):
    name: str = Field(..., max_length=255)
    account_type: str = Field("Bank Account", max_length=50)
    balance: float = Field(0.0)
    institution: str = Field("Primary Bank", max_length=100)


class AccountRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    account_type: str
    balance: float
    institution: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
