"""Pydantic schemas for the OCR domain."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExtractedData(BaseModel):
    """Structured fields extracted from the receipt image."""

    amount: float | None = Field(
        description="Detected total amount (largest currency value found)",
    )
    merchant: str | None = Field(
        description="Heuristically determined merchant/store name",
    )
    date: str | None = Field(
        description="Detected transaction date in YYYY-MM-DD format",
    )
    upi_id: str | None = Field(
        description="UPI virtual payment address if found",
    )
    transaction_id: str | None = Field(
        description="Payment-level reference / transaction number",
    )

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "amount": 1249.50,
            "merchant": "Big Bazaar",
            "date": "2024-12-15",
            "upi_id": "merchant@paytm",
            "transaction_id": "TXN123456789",
        },
    })


class OcrUploadResponse(BaseModel):
    """Response returned after a successful OCR upload."""

    transaction_id: UUID = Field(
        description="The ID of the newly created Transaction record",
    )
    raw_text: str = Field(
        description="Full concatenated text extracted by the Vision API",
    )
    confidence_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Average word-level confidence from Google Vision (0–1)",
    )
    extracted: ExtractedData = Field(
        description="Structured fields parsed from the raw OCR text",
    )
