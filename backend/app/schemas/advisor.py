"""Pydantic schemas for the Advisor domain."""

from pydantic import BaseModel, Field

from app.services.advisor_service import get_valid_personas


class ChatRequest(BaseModel):
    """Request body for the advisor chat endpoint."""

    message: str = Field(
        min_length=1,
        max_length=2000,
        examples=["How should I save tax this year?"],
    )
    persona: str = Field(
        default="warren_buffett",
        description="Advisor persona — one of: " + ", ".join(get_valid_personas()),
    )


class ChatResponse(BaseModel):
    """Non-streaming response from the advisor."""

    reply: str
    persona: str
    sources: list[str] = Field(
        description="Knowledge-base excerpts that informed the reply",
    )
