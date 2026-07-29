"""RAG knowledge retrieval — ChromaDB vector store for financial context.

Persists embeddings to ``./chroma_db/`` under the backend directory.
The default knowledge base is seeded with Indian-finance, value-investing,
and conscious-spending content the first time the collection is created.

NOTE: ChromaDB import is deferred (lazy) so the application can start
even when chromadb or its native dependencies are not installed.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────
_CHROMA_DIR = Path(__file__).resolve().parent.parent.parent / "chroma_db"
_COLLECTION_NAME = "finance_knowledge"

# Module-level state (lazily initialised).
_client: Any = None
_collection: Any = None
_chromadb_available: bool | None = None  # tri-state: None = unchecked


def _check_chromadb() -> bool:
    """Return True if chromadb can be imported and initialised, False otherwise."""
    global _chromadb_available
    if _chromadb_available is None:
        try:
            import numpy as np
            if not hasattr(np, "float_"):
                np.float_ = np.float64
            if not hasattr(np, "int_"):
                np.int_ = np.int64
            if not hasattr(np, "uint"):
                np.uint = np.uint64

            import chromadb  # noqa: F401
            _chromadb_available = True
        except Exception as exc:
            logger.warning(
                "chromadb is not available or failed to load: %s. "
                "RAG knowledge-base features will be disabled.",
                exc,
            )
            _chromadb_available = False
    return _chromadb_available


# ── Default knowledge seed ───────────────────────────────────────────────

_DEFAULT_KNOWLEDGE_CHUNKS: list[str] = [
    # --- Indian Tax & Investments ---
    "Section 80C of the Income Tax Act allows deductions up to ₹1.5 lakh per year for "
    "investments in ELSS mutual funds, PPF, EPF, NSC, tax-saving FDs, and life insurance premiums.",
    "ELSS (Equity Linked Savings Scheme) funds have the shortest lock-in period of 3 years "
    "among 80C instruments and offer potential for equity-linked returns with tax benefits.",
    "PPF (Public Provident Fund) currently offers ~7.1% interest rate compounded annually, "
    "with a 15-year maturity and partial withdrawal allowed from year 7.",
    "NPS (National Pension System) allows an additional tax deduction of up to ₹50,000 "
    "under Section 80CCD(1B), over and above the ₹1.5 lakh 80C limit.",
    "SIP (Systematic Investment Plan) lets you invest a fixed amount in mutual funds "
    "monthly, averaging out market volatility through rupee-cost averaging.",
    "Section 80D provides tax deductions of up to ₹25,000 for health insurance premiums "
    "paid for self and family, and up to ₹50,000 for senior citizen parents.",
    "A newly added Section 80CCC allows deduction for contributions to a pension fund. "
    "The total deduction under sections 80C, 80CCC, and 80CCD(1) combined is capped at ₹1.5 lakh.",

    # --- Budgeting & Personal Finance ---
    "The 50/30/20 budgeting rule divides after-tax income into: 50% for needs (rent, groceries, "
    "utilities), 30% for wants (dining, entertainment), and 20% for savings and investments.",
    "An emergency fund should cover 3 to 6 months of essential living expenses and be held "
    "in a liquid, easily accessible instrument like a savings account or liquid fund.",
    "A good credit score (750+) can significantly lower your loan interest rates. Pay credit "
    "card bills on time and keep utilisation below 30% of your limit.",
    "The debt-to-income ratio should ideally stay below 40%. Lenders use this ratio to assess "
    "your ability to manage monthly payments and repay debts.",

    # --- Value Investing (Warren Buffett) ---
    "An economic moat refers to a company's sustainable competitive advantage — brand power, "
    "cost advantage, network effects, or regulatory protection — that keeps competitors at bay.",
    "Compound interest is the eighth wonder of the world. Small, consistent investments "
    "grow exponentially over time. Starting early matters more than timing the market.",
    "Circle of competence: invest only in businesses you truly understand. The size of the "
    "circle doesn't matter as much as knowing its boundaries.",
    "Buy when others are greedy and be fearful when others are fearful. Market volatility "
    "creates opportunities for disciplined long-term investors.",
    "A margin of safety means buying a stock at a price significantly below your estimate of "
    "its intrinsic value, providing a buffer against errors or bad luck.",
    "Focus on the business's long-term fundamentals — earnings power, return on equity, and "
    "management quality — rather than short-term price movements.",

    # --- Conscious Spending (Ramit Sethi) ---
    "Conscious spending means cutting costs ruthlessly on things you don't care about so you "
    "can spend extravagantly on what you truly love. It's not about depriving yourself.",
    "Your 'Rich Life' is unique to you. Stop comparing your financial journey to others. "
    "Define what a rich life means and align your spending with that vision.",
    "Automate your finances: set up auto-transfers for savings and investments on payday, "
    "auto-pay for bills, and let the system run itself. Willpower is overrated.",
    "A 'money dial' is the one thing you're willing to spend disproportionately on because "
    "it brings you genuine joy. Find yours and crank it up without guilt.",
    "Earn more is often easier than cut more. Instead of obsessing over a ₹200 monthly "
    "subscription, invest energy in negotiating a raise or building a side income.",
]

# ── Module helpers ───────────────────────────────────────────────────────


def _get_client() -> Any:
    """Return the module-level ChromaDB persistent client (lazy init)."""
    global _client
    if _client is None:
        import chromadb
        _CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(_CHROMA_DIR))
        logger.info("ChromaDB client initialised at %s", _CHROMA_DIR)
    return _client


def _get_collection() -> Any:
    """Return the finance-knowledge collection (lazy init + auto-seed)."""
    global _collection
    if _collection is None:
        import chromadb
        from chromadb.errors import InvalidCollectionException

        client = _get_client()
        try:
            _collection = client.get_collection(_COLLECTION_NAME)
            _maybe_seed(_collection)
        except (InvalidCollectionException, ValueError):
            _collection = client.create_collection(
                _COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            _seed_collection(_collection)
    return _collection


def _maybe_seed(collection: Any) -> None:
    """Seed the collection if it's empty (count is 0)."""
    try:
        count = collection.count()
    except Exception:  # noqa: BLE001
        count = 0
    if count == 0:
        _seed_collection(collection)


def _seed_collection(collection: Any) -> None:
    """Populate the collection with default financial knowledge chunks."""
    ids = [f"seed_{i:04d}" for i in range(len(_DEFAULT_KNOWLEDGE_CHUNKS))]
    collection.add(documents=_DEFAULT_KNOWLEDGE_CHUNKS, ids=ids)
    logger.info("Seeded %d knowledge chunks into '%s'", len(ids), _COLLECTION_NAME)


# ── Public API ───────────────────────────────────────────────────────────


def index_document(text_chunks: list[str]) -> list[str]:
    """Embed and index *text_chunks* into the vector store.

    Parameters
    ----------
    text_chunks
        A list of plain-text strings to index.

    Returns
    -------
    list[str]
        The document IDs assigned to each chunk (same order as input).
    """
    if not text_chunks:
        return []

    if not _check_chromadb():
        logger.warning("index_document skipped — chromadb unavailable")
        return []

    collection = _get_collection()
    next_id = collection.count()  # naive offset — fine for moderate volumes
    ids = [f"doc_{next_id + i:06d}" for i, _ in enumerate(text_chunks)]
    collection.add(documents=text_chunks, ids=ids)
    logger.info("Indexed %d chunk(s) into '%s'", len(ids), _COLLECTION_NAME)
    return ids


def query_knowledge_base(query: str, top_k: int = 3) -> list[str]:
    """Retrieve the *top_k* most relevant document chunks for *query*.

    Returns an empty list if the store is empty or the query produces no
    meaningful matches (graceful degradation).
    """
    if not query or not query.strip():
        return []

    if not _check_chromadb():
        return []

    collection = _get_collection()

    try:
        results = collection.query(query_texts=[query], n_results=top_k)
    except Exception:  # noqa: BLE001
        logger.warning("ChromaDB query failed for: %.80s", query, exc_info=True)
        return []

    documents = results.get("documents")
    if not documents or not documents[0]:
        return []

    return documents[0]


def reset_collection() -> None:
    """Delete and re-create the collection (useful for testing)."""
    global _collection

    if not _check_chromadb():
        logger.warning("reset_collection skipped — chromadb unavailable")
        return

    import chromadb
    from chromadb.errors import InvalidCollectionException

    client = _get_client()
    try:
        client.delete_collection(_COLLECTION_NAME)
    except (InvalidCollectionException, ValueError):
        pass
    _collection = client.create_collection(
        _COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    _seed_collection(_collection)
    logger.info("Collection '%s' was reset and re-seeded", _COLLECTION_NAME)
