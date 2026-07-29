"""Receipt text parser — extracts structured fields from raw OCR output.

Uses regex patterns and lightweight heuristics rather than an ML approach,
making it fast, predictable, and easy to debug.
"""

import re
from collections.abc import Mapping
from datetime import date
from typing import Any


# ── Amount patterns ──────────────────────────────────────────────────────
# Currency-symbol prefix: ₹ Rs $ USD € £
_CURRENCY_AMOUNT_RE = re.compile(
    r"(?:[₹Rs]{1,3}|USD|EUR|GBP|€|£)\s*([\d,]+\.\d{2})",
    re.IGNORECASE,
)
# Standalone float (must be ≥ 1.00 to avoid false positives on years, dates)
_FLOAT_RE = re.compile(r"\b(\d{1,3}(?:,\d{3})*\.\d{2})\b")


# ── Date patterns (ordered by likelihood on Indian receipts) ─────────────
_DATE_PATTERNS = [
    re.compile(r"(\d{2})[/\-](\d{2})[/\-](\d{4})"),             # DD/MM/YYYY
    re.compile(r"(\d{4})[/\-](\d{2})[/\-](\d{2})"),             # YYYY-MM-DD
    re.compile(
        r"(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})",
        re.IGNORECASE,
    ),                                                           # DD Mon YYYY
    re.compile(
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})",
        re.IGNORECASE,
    ),                                                           # Mon DD, YYYY
]


# ── UPI / Transaction ID patterns ────────────────────────────────────────
_UPI_RE = re.compile(r"[\w.\-]+@[\w.\-]+")
_TXN_ID_RE = re.compile(
    r"(?:Txn(?:saction)?|Ref(?:\.|\s*No)?|UTR|Receipt|Order|Bill)\s*[#:;\-]?\s*([A-Za-z0-9]{6,})",
    re.IGNORECASE,
)


# ── Line classifiers (for merchant extraction) ───────────────────────────
_LINE_IS_AMOUNT_RE = re.compile(
    r"(?:total|amount|sum|grand|due|tax|gst|vat|subtotal|change|balance)\s*[:]?\s*[₹Rs$€£]?\s*[\d,]+\.\d{2}",
    re.IGNORECASE,
)
_LINE_IS_PHONE_RE = re.compile(r"[\d\+\-\s]{7,}", re.IGNORECASE)
_LINE_IS_ADDRESS_RE = re.compile(
    r"(?:road|street|lane|nagar|colony|complex|building|floor|shop|mall|sector|phase)",
    re.IGNORECASE,
)
_LINE_IS_DATE_RE = re.compile(
    r"(?:\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|(?:mon|tue|wed|thu|fri|sat|sun))",
    re.IGNORECASE,
)
_LINE_IS_URL_OR_EMAIL_RE = re.compile(
    r"(?:https?://|www\.|@\w+\.\w+)",
    re.IGNORECASE,
)
_LINE_IS_GST_RE = re.compile(
    r"(?:gst|tin|pan|cin|vat|aadhaar|license)", re.IGNORECASE,
)


# ── Helpers ──────────────────────────────────────────────────────────────

def _parse_float(text: str) -> float | None:
    """Convert a comma-formatted number string to float."""
    try:
        return float(text.replace(",", ""))
    except (ValueError, AttributeError):
        return None


_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


# ── Public API ───────────────────────────────────────────────────────────

def parse_receipt_text(raw_text: str) -> dict[str, Any]:
    """Extract structured fields from raw OCR receipt text.

    Returns a dictionary with the following keys (any of which may be
    ``None`` when the value could not be determined)::

        amount          float     — the most likely total amount
        merchant        str       — the merchant / store name
        date            date      — transaction date
        upi_id          str | None
        transaction_id  str | None   (payment-level reference)

    The parser is intentionally lenient — missing fields produce ``None``
    rather than raising an error, so the caller can decide what to do with
    partial results.
    """
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    return {
        "amount": _extract_amount(raw_text, lines),
        "merchant": _extract_merchant(lines),
        "date": _extract_date(raw_text),
        "upi_id": _extract_upi(raw_text),
        "transaction_id": _extract_txn_id(raw_text),
    }


# ── Amount ───────────────────────────────────────────────────────────────

def _extract_amount(full_text: str, lines: list[str]) -> float | None:
    candidates: list[float] = []

    # 1. Currency-prefixed amounts
    for match in _CURRENCY_AMOUNT_RE.finditer(full_text):
        val = _parse_float(match.group(1))
        if val is not None and val >= 1.0:
            candidates.append(val)

    # 2. Standalone float values (if currency-prefixed gave nothing)
    if not candidates:
        for match in _FLOAT_RE.finditer(full_text):
            val = _parse_float(match.group(1))
            if val is not None and val >= 1.0 and val <= 1_000_000:
                candidates.append(val)

    # Return the *largest* candidate — usually the total on a receipt.
    return max(candidates) if candidates else None


# ── Merchant ─────────────────────────────────────────────────────────────

def _is_noise_line(line: str) -> bool:
    """Return ``True`` if *line* is unlikely to be a merchant name."""
    return bool(
        _LINE_IS_AMOUNT_RE.search(line)
        or _LINE_IS_PHONE_RE.match(line)
        and len(line) < 20
        or _LINE_IS_ADDRESS_RE.search(line)
        or _LINE_IS_DATE_RE.search(line)
        or _LINE_IS_URL_OR_EMAIL_RE.search(line)
        or _LINE_IS_GST_RE.search(line)
        or len(line) < 2
        or line.isdigit()
        or line.isupper() and len(line) > 60
    )


def _extract_merchant(lines: list[str]) -> str | None:
    """Scan top lines for a plausible merchant name."""
    for line in lines[:12]:
        if not _is_noise_line(line):
            # Strip common decorations
            cleaned = line.strip("*#-_. \t").strip()
            if len(cleaned) >= 3 and not cleaned.isdigit():
                return cleaned
    return None


# ── Date ─────────────────────────────────────────────────────────────────

def _extract_date(full_text: str) -> date | None:
    for pattern in _DATE_PATTERNS:
        match = pattern.search(full_text)
        if match:
            groups = match.groups()
            try:
                if pattern is _DATE_PATTERNS[0]:           # DD/MM/YYYY
                    d, m, y = int(groups[0]), int(groups[1]), int(groups[2])
                elif pattern is _DATE_PATTERNS[1]:         # YYYY-MM-DD
                    y, m, d = int(groups[0]), int(groups[1]), int(groups[2])
                elif pattern is _DATE_PATTERNS[2]:         # DD Mon YYYY
                    d, m_str, y = int(groups[0]), groups[1].lower()[:3], int(groups[2])
                    m = _MONTH_MAP.get(m_str, 1)
                elif pattern is _DATE_PATTERNS[3]:         # Mon DD, YYYY
                    m_str, d, y = groups[0].lower()[:3], int(groups[1]), int(groups[2])
                    m = _MONTH_MAP.get(m_str, 1)
                else:
                    continue

                # Basic sanity: day 1-31, month 1-12, year 2000-2099
                if 1 <= d <= 31 and 1 <= m <= 12 and 2000 <= y <= 2099:
                    return date(y, m, d)
            except (ValueError, IndexError):
                continue
    return None


# ── UPI ID ───────────────────────────────────────────────────────────────

def _extract_upi(full_text: str) -> str | None:
    match = _UPI_RE.search(full_text)
    return match.group() if match else None


# ── Transaction / Payment reference ──────────────────────────────────────

def _extract_txn_id(full_text: str) -> str | None:
    match = _TXN_ID_RE.search(full_text)
    return match.group(1) if match else None
