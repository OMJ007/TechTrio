"""Hybrid expense categorisation service.

Strategy
  1. **Rule engine** — fast keyword/pattern matching against a curated
     dictionary of merchant & category keywords.  Returns a pre-set
     confidence of 0.85 on match.
  2. **LLM fallback** — if no rule matches, calls the Anthropic API for
     zero-shot classification.  Gracefully degrades to ``Uncategorized``
     if the API is unavailable or unconfigured.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Any

from app.agent import call_llm

# ── Keyword rules ─────────────────────────────────────────────────────────
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Food": [
        "zomato", "swiggy", "mcdonalds", "starbucks", "restaurant", "cafe",
        "pizza hut", "dominos", "kfc", "burger king", "subway", "dosa",
        "biryani", "tiffin", "food court", "eat", "dining", "lunch", "dinner",
        "bakery", "cloud kitchen",
    ],
    "Groceries": [
        "blinkit", "zepto", "instamart", "d-mart", "dmart", "supermarket",
        "grocery", "big basket", "bigbasket", "fresh", "mart", "kirana",
        "provision", "vegetable", "fruit", "milk", "daily needs",
    ],
    "Transport": [
        "uber", "ola", "rapido", "irctc", "petrol", "fuel", "metro", "bus",
        "cab", "auto", "taxi", "ola money", "parking", "toll", "flight",
        "railway", "train",
    ],
    "Bills": [
        "electricity", "wifi", "jio", "airtel", "water", "broadband",
        "rent", "bill", "utility", "vodafone", "bsnl", "maintenance",
        "society", "property tax", "gas", "cylinder",
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "meesho", "ajio", "shopping",
        "clothing", "apparel", "footwear", "accessories", "furniture",
        "electronics", "lifestyle",
    ],
    "Healthcare": [
        "pharmacy", "hospital", "clinic", "doctor", "medico", "apollo",
        "medicine", "health", "diagnostic", "dentist", "optics", "ayurveda",
    ],
    "Entertainment": [
        "netflix", "prime video", "hotstar", "spotify", "bookmyshow",
        "pvr", "movie", "cinema", "music", "game", "gaming", "youtube",
        "ott", "subscription",
    ],
    "Education": [
        "udemy", "coursera", "byju", "byju's", "vedantu", "unacademy",
        "course", "education", "class", "tutor", "training", "exam", "books",
    ],
}



# ── Public API ───────────────────────────────────────────────────────────

async def categorize_transaction(
    merchant: str,
    raw_text: str,
) -> tuple[str, float]:
    """Return ``(category, confidence)`` for a single transaction.

    The merchant name and raw OCR text are concatenated and matched
    against keyword rules first.  If no rule fires, the LLM fallback
    is invoked.
    """
    # 1. Rule engine — synchronous, instant.
    rule_cat, rule_conf = _rule_match(merchant, raw_text)
    if rule_cat is not None:
        return rule_cat, rule_conf

    # 2. LLM fallback — async, may be slow or unavailable.
    return await _llm_classify(merchant, raw_text)


# ── Rule engine ──────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _compiled_rules() -> list[tuple[str, re.Pattern[str]]]:
    """Compile each category's keywords into one word-boundary regex.

    Plain substring matching produced false positives on short keywords —
    "eat" fired on "great"/"theatre", "mart" on "smart", "gas" on "gasket".
    Anchoring on word boundaries keeps multi-word keywords working while
    removing the accidental hits.
    """
    rules: list[tuple[str, re.Pattern[str]]] = []
    for category, keywords in CATEGORY_KEYWORDS.items():
        alternation = "|".join(
            re.escape(keyword) for keyword in sorted(keywords, key=len, reverse=True)
        )
        rules.append(
            (category, re.compile(rf"(?<!\w)(?:{alternation})(?!\w)", re.IGNORECASE))
        )
    return rules


def _rule_match(merchant: str, raw_text: str) -> tuple[str | None, float]:
    """Check keyword rules against concatenated merchant + OCR text.

    Returns ``(category, 0.85)`` on match or ``(None, 0.0)``.
    """
    corpus = f"{merchant} {raw_text}"

    for category, pattern in _compiled_rules():
        if pattern.search(corpus):
            return category, 0.85

    return None, 0.0


# ── LLM fallback ─────────────────────────────────────────────────────────

async def _llm_classify(merchant: str, raw_text: str) -> tuple[str, float]:
    """Classify via Groq API (or Anthropic fallback) with JSON-structured output."""
    prompt = (
        "You are a receipt categoriser. Classify the expense below.\n\n"
        f"Merchant: '{merchant}'\n"
        f"Raw Text: '{raw_text[:1200]}'\n\n"
        "Select exactly one category from: "
        "[Food, Groceries, Transport, Shopping, Rent, Bills, "
        "Healthcare, Entertainment, Education, Investments].\n\n"
        "Respond ONLY with valid JSON — no commentary:\n"
        '{"category": string, "confidence": float}'
    )
    system_prompt = "You are a precise receipt expense categorization assistant."

    reply_text, success = await call_llm(
        system_prompt=system_prompt,
        user_prompt=prompt,
        max_tokens=1024,
        is_json=True,
        timeout_secs=15,
    )

    if not success or not reply_text:
        return "Uncategorized", 0.0

    try:
        result: dict[str, Any] = json.loads(reply_text)
        category: str = str(result.get("category", "Uncategorized"))
        confidence: float = min(max(float(result.get("confidence", 0.5)), 0.0), 1.0)

        allowed = {
            "Food", "Groceries", "Transport", "Shopping", "Rent",
            "Bills", "Healthcare", "Entertainment", "Education", "Investments",
        }
        if category not in allowed:
            category = "Uncategorized"
            confidence = 0.0

        return category, confidence
    except Exception:  # noqa: BLE001
        return "Uncategorized", 0.0

