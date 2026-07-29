"""OCR service — extracts text from receipt/bill images using Groq Vision (Qwen 3.6-27b) or Google Cloud Vision.

Strategy:
  1. **Groq Vision LLM** — Uses ``qwen/qwen3.6-27b`` (or configured vision model)
     via Groq API to perform multimodal OCR and extract structured receipt data directly.
  2. **Google Cloud Vision fallback** — Used if Groq API key is unconfigured or fails.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Any = None
_vision_available: bool | None = None
_LLM_TIMEOUT_SECS = 30


# ── Groq Vision OCR (Qwen 3.6-27b) ───────────────────────────────────────

def extract_text_with_groq_vision(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> tuple[str, float, dict[str, Any] | None]:
    """Perform OCR using Groq's Vision LLM (qwen/qwen3.6-27b).

    Returns ``(raw_text, confidence_score, extracted_dict)``.
    """
    groq_key = settings.GROQ_API_KEY.get_secret_value() if settings.GROQ_API_KEY else None
    if not groq_key:
        raise ValueError("GROQ_API_KEY is not configured")

    # Encode image to base64 data URI
    b64_str = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{mime_type};base64,{b64_str}"

    prompt = (
        "You are an expert OCR receipt parser. Perform OCR on this receipt image.\n"
        "Transcribe all readable text verbatim and extract the structured fields.\n\n"
        "Respond ONLY with valid JSON in this structure:\n"
        "{\n"
        '  "raw_text": "full verbatim text extracted from the receipt",\n'
        '  "merchant": "Store/Merchant name or null",\n'
        '  "amount": 124.50 (number or null),\n'
        '  "date": "YYYY-MM-DD" (string date or null),\n'
        '  "upi_id": "merchant@upi or null",\n'
        '  "transaction_id": "ref number or null"\n'
        "}"
    )

    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_OCR_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            }
        ],
        "temperature": 0.1,
        "max_tokens": 2048,
    }

    with httpx.Client(timeout=_LLM_TIMEOUT_SECS) as client:
        resp = client.post(settings.GROQ_API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        body: dict[str, Any] = resp.json()
        reply = body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

    from app.agent import strip_json_fences, strip_thinking_blocks

    reply = strip_thinking_blocks(reply)
    reply = strip_json_fences(reply)


    data: dict[str, Any] = json.loads(reply)
    raw_text = str(data.get("raw_text", "")).strip()

    # Format extracted fields
    extracted = {
        "merchant": data.get("merchant"),
        "amount": float(data["amount"]) if data.get("amount") is not None else None,
        "date": data.get("date"),
        "upi_id": data.get("upi_id"),
        "transaction_id": data.get("transaction_id"),
    }

    return raw_text, 0.95, extracted


# ── Google Cloud Vision OCR Fallback ──────────────────────────────────────

def _check_vision() -> bool:
    """Return True if google.cloud.vision can be imported."""
    global _vision_available
    if _vision_available is None:
        try:
            from google.cloud import vision  # noqa: F401
            _vision_available = True
        except ImportError:
            _vision_available = False
    return _vision_available


def _get_client() -> Any:
    """Return the shared Vision client (lazy init on first call)."""
    global _client
    if _client is None:
        from google.cloud import vision
        _client = vision.ImageAnnotatorClient()
    return _client


def extract_text_from_image_bytes(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> tuple[str, float, dict[str, Any] | None]:
    """Extract text from receipt image bytes.

    Uses Groq Qwen Vision (qwen/qwen3.6-27b) first.  Falls back to Google Cloud Vision.
    """
    if not image_bytes:
        raise ValueError("Cannot process an empty byte string")

    # 1. Try Groq Vision (Qwen 3.6-27b)
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.get_secret_value():
        try:
            raw_text, confidence, structured = extract_text_with_groq_vision(image_bytes, mime_type)
            if raw_text:
                logger.info("Successfully processed OCR using Groq Vision (%s)", settings.GROQ_OCR_MODEL)
                return raw_text, confidence, structured
        except Exception as exc:
            logger.warning("Groq Vision OCR failed: %s. Trying Google Cloud Vision...", exc)

    # 2. Fallback: Google Cloud Vision
    if not _check_vision():
        raise RuntimeError(
            "Neither Groq Vision nor google-cloud-vision are available for OCR."
        )

    from google.cloud import vision
    from google.api_core.exceptions import GoogleAPICallError, InvalidArgument

    image = vision.Image(content=image_bytes)

    try:
        response: vision.AnnotateImageResponse = _get_client().text_detection(image=image)
    except (GoogleAPICallError, InvalidArgument) as exc:
        raise

    if response.error.message:
        raise GoogleAPICallError(response.error.message)

    if not response.text_annotations:
        return "", 0.0, None

    full_text: str = response.text_annotations[0].description or ""

    confidences: list[float] = []
    for page in response.full_text_annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    if word.confidence is not None:
                        confidences.append(word.confidence)

    avg_confidence: float = (
        sum(confidences) / len(confidences) if confidences else 0.0
    )

    return full_text, round(avg_confidence, 4), None
