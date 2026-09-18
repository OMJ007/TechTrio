"""OCR upload endpoint — processes receipt images and creates transactions."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db import get_session
from app.models.user import User
from app.schemas.ocr import ExtractedData, OcrUploadResponse
from app.services.categorization_service import categorize_transaction
from app.services.ocr_service import extract_text_from_image_bytes
from app.services.parser_service import parse_receipt_text
from app.services.transaction_service import create_ocr_transaction

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

# ── Allowed image MIME types ─────────────────────────────────────────────
_ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}

_FALLBACK_MERCHANT = "Unknown Merchant"
_FALLBACK_PAYMENT_METHOD = "Unknown"


def _parse_date_string(raw: str | None) -> datetime | None:
    """Attempt to parse a date string into a UTC datetime."""
    if not raw:
        return None

    raw_str = str(raw).strip()
    if not raw_str:
        return None

    # Common formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, MM/DD/YYYY
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%m/%d/%Y",
    ]

    clean_str = raw_str[:10]
    for fmt in formats:
        try:
            dt = datetime.strptime(clean_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    try:
        dt = datetime.fromisoformat(raw_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


@router.post(
    "/upload",
    response_model=OcrUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a receipt image for OCR processing",
)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> OcrUploadResponse:
    """Upload a receipt or bill image.

    Extracted text is parsed and a Transaction record with ``source="ocr"`` is created.
    """
    if file.content_type and file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                f"Accepted: {', '.join(sorted(_ALLOWED_MIME_TYPES))}."
            ),
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if len(image_bytes) > 10 * 1024 * 1024:
        # Literal 413: Starlette renamed the constant
        # (HTTP_413_REQUEST_ENTITY_TOO_LARGE → HTTP_413_CONTENT_TOO_LARGE),
        # so referencing either name breaks on one version or the other.
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB size limit",
        )

    mime_type = file.content_type or "image/jpeg"
    try:
        raw_text, confidence, llm_extracted = await run_in_threadpool(
            extract_text_from_image_bytes, image_bytes, mime_type
        )
    except Exception as exc:
        detail = getattr(exc, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OCR processing error: {detail}",
        ) from exc

    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No readable text could be extracted from the image. "
                "The file may be corrupted or contain only non-text content."
            ),
        )

    parsed = parse_receipt_text(raw_text)

    llm_dict = llm_extracted or {}
    merchant = llm_dict.get("merchant") or parsed.get("merchant") or _FALLBACK_MERCHANT
    amount = llm_dict.get("amount") if llm_dict.get("amount") is not None else parsed.get("amount")
    raw_date = llm_dict.get("date") or (parsed.get("date").isoformat() if parsed.get("date") else None)
    upi_id = llm_dict.get("upi_id") or parsed.get("upi_id")
    transaction_id = llm_dict.get("transaction_id") or parsed.get("transaction_id")

    category, cat_confidence = await categorize_transaction(
        merchant=merchant,
        raw_text=raw_text,
    )

    if amount is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Could not determine the transaction amount from the "
                "receipt text. Please ensure the total is clearly visible."
            ),
        )

    parsed_date = _parse_date_string(raw_date)
    transaction_date = parsed_date if parsed_date is not None else datetime.now(timezone.utc)

    transaction = await create_ocr_transaction(
        current_user=current_user,
        amount=amount,
        merchant=merchant,
        category=category,
        payment_method=_FALLBACK_PAYMENT_METHOD,
        transaction_date=transaction_date,
        confidence_score=cat_confidence,
        session=session,
    )

    extracted_data = ExtractedData(
        amount=amount,
        merchant=merchant,
        date=transaction_date.strftime("%Y-%m-%d"),
        upi_id=upi_id,
        transaction_id=transaction_id,
    )

    return OcrUploadResponse(
        transaction_id=transaction.id,
        raw_text=raw_text,
        confidence_score=confidence,
        extracted=extracted_data,
    )
